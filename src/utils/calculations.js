import conditionMap from "../../Aegis.DfsCalculator/DFSCalculator.Server/Data/conditionMap.json";
import GG_ITEMS from "../../Aegis.DfsCalculator/DFSCalculator.Server/Data/ggItems.json";

export const scoreMap = {
  "01": 1,
  "02": 2,
  "03": 3,
  "04": 4,
  "05": 5,
  "06": 6,
  "07": 1,
  "08": 1,
  "09": 1,
  10: 1,
  "10": 1,
  88: 1,
  "88": 1,
  "^": 1,
};

/**
 * Resolves a raw stored value to its numeric score. Handles both traditional
 * MDS code strings ("01"-"06") via scoreMap AND continuous imputed values
 * (e.g. 1.7903 stored as a number or string).
 */
export function resolveScore(rawValue) {
  if (rawValue == null) return 0;
  if (rawValue in scoreMap) return scoreMap[rawValue];
  const parsed = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue);
  if (!isNaN(parsed) && parsed >= 1 && parsed <= 6) return parsed;
  return 0;
}

/**
 * Converts a numeric score back to its stored format (always a string).
 * Integers become zero-padded codes ("01"-"06"); continuous values become
 * their string representation (e.g. "1.7903").
 */
export function scoreToStoredValue(score) {
  if (Number.isInteger(score) && score >= 1 && score <= 6) {
    return score.toString().padStart(2, '0');
  }
  return String(score);
}

export { GG_ITEMS };

export { conditionMap };

export function formatDOB(dobStr) {
  if (!dobStr || dobStr.length !== 8) return "Unknown";
  const year = dobStr.substring(0, 4);
  const month = dobStr.substring(4, 6);
  const day = dobStr.substring(6, 8);
  return `${month}/${day}/${year}`;
}

export function formatDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${month}/${day}/${year}`;
}

export function calculateAgeAtAdmission(dobStr, admitStr) {
  if (!dobStr || dobStr.length !== 8 || !admitStr || admitStr.length !== 8)
    return null;
  const dob = new Date(
    `${dobStr.substring(0, 4)}-${dobStr.substring(4, 6)}-${dobStr.substring(
      6,
      8
    )}`
  );
  const admitDate = new Date(
    `${admitStr.substring(0, 4)}-${admitStr.substring(
      4,
      6
    )}-${admitStr.substring(6, 8)}`
  );

  let age = admitDate.getFullYear() - dob.getFullYear();
  const hasBirthdayPassed =
    admitDate.getMonth() > dob.getMonth() ||
    (admitDate.getMonth() === dob.getMonth() &&
      admitDate.getDate() >= dob.getDate());

  if (!hasBirthdayPassed) age--;

  return age;
}

export function calculateDateGap(startStr, endStr) {
  if (!startStr || !endStr || startStr.length !== 8 || endStr.length !== 8)
    return null;

  const start = new Date(
    `${startStr.substring(0, 4)}-${startStr.substring(
      4,
      6
    )}-${startStr.substring(6, 8)}`
  );
  const end = new Date(
    `${endStr.substring(0, 4)}-${endStr.substring(4, 6)}-${endStr.substring(
      6,
      8
    )}`
  );

  const diffMs = end - start;
  return Math.round(diffMs / (1000 * 60 * 60 * 24)); // days
}

export function extractPatientSummary(parsedValues, ardDate) {
  const firstName = parsedValues["A0500A"];
  const lastName = parsedValues["A0500C"];
  const dob = parsedValues["A0900"];
  const facility = parsedValues["A0100B"];
  
  // Use fallback chain: A2400B (Medicare start) → A1600 (Entry date) → A1900 (Admission date)
  // Skip values that are blank, undefined, or "^" (skip pattern)
  const isValidDate = (val) => val && val !== "^";
  const admitDate = isValidDate(parsedValues["A2400B"]) ? parsedValues["A2400B"] :
                    isValidDate(parsedValues["A1600"]) ? parsedValues["A1600"] :
                    parsedValues["A1900"];
  
  const dischargeDate = parsedValues["A2000"];
  const age = calculateAgeAtAdmission(dob, admitDate);
  const ardGapDays = calculateDateGap(admitDate, ardDate);

  return {
    firstName,
    lastName,
    dob,
    facility,
    admitDate,
    dischargeDate,
    age,
    ardGapDays,
  };
}

// Sets used for determining mobility type
export const ANA = new Set(["07", "09", "10", "88"]);
export const valid = new Set(["01", "02", "03", "04", "05", "06"]);

export function determineMobilityType(parsedValues) {
  // Wheelchair: I1 and I3 both ANA, and valid R or S. Remaining patients = Walk (including when I1/I3 missing).
  const i1 = parsedValues["GG0170I1"];
  const i3 = parsedValues["GG0170I3"];
  const r1 = parsedValues["GG0170R1"];
  const r3 = parsedValues["GG0170R3"];
  const s1 = parsedValues["GG0170S1"];
  const s3 = parsedValues["GG0170S3"];

  return ANA.has(i1) &&
    ANA.has(i3) &&
    (valid.has(r1) || valid.has(r3) || valid.has(s1) || valid.has(s3))
    ? "Wheel"
    : "Walk";
}

export function calculateFunctionScore(values, mobilityType = null) {
  const safe = (key) => {
    const v = values[key];
    if (valid.has(v)) return parseInt(v, 10);
    const score = resolveScore(v);
    return score > 0 ? score : 1;
  };

  const sa = safe("GG0130A");
  const sb = safe("GG0130B");
  const sc = safe("GG0130C");

  const ma = safe("GG0170A");
  const mc = safe("GG0170C");
  const md = safe("GG0170D");
  const me = safe("GG0170E");
  const mf = safe("GG0170F");
  const mi = safe("GG0170I");
  const mj = safe("GG0170J");
  const mr = safe("GG0170R");

  // Use provided mobility type or determine from values
  const actualMobilityType = mobilityType || determineMobilityType(values);

  if (actualMobilityType === "Wheel") {
    return sa + sb + sc + ma + mc + md + me + mf + mr + mr;
  } else {
    return sa + sb + sc + ma + mc + md + me + mf + mi + mj;
  }
}

export function getContributingItemIds(values) {
  const mobilityType = determineMobilityType(values);

  const base = [
    "GG0130A",
    "GG0130B",
    "GG0130C",
    "GG0170A",
    "GG0170C",
    "GG0170D",
    "GG0170E",
    "GG0170F",
  ];

  if (mobilityType === "Wheel") {
    return new Set([...base, "GG0170R"]);
  } else {
    return new Set([...base, "GG0170I", "GG0170J"]);
  }
}

