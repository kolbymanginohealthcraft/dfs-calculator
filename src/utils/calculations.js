export const scoreMap = {
  "01": 1, "02": 2, "03": 3, "04": 4, "05": 5, "06": 6,
  "07": 1, "08": 1, "10": 1, "88": 1, "^": 1,
};

export const GG_ITEMS = [
  { id: "GG0130A", label: "Eating", domain: "selfCare" },
  { id: "GG0130B", label: "Oral hygiene", domain: "selfCare" },
  { id: "GG0130C", label: "Toileting hygiene", domain: "selfCare" },
  { id: "GG0130E", label: "Shower/bathe self", domain: "selfCare" },
  { id: "GG0130F", label: "Upper body dressing", domain: "selfCare" },
  { id: "GG0130G", label: "Lower body dressing", domain: "selfCare" },
  { id: "GG0130H", label: "Put on/take off footwear", domain: "selfCare" },
  { id: "GG0170A", label: "Roll left and right", domain: "mobility" },
  { id: "GG0170B", label: "Sit to lying", domain: "mobility" },
  { id: "GG0170C", label: "Lying to sitting on bed side", domain: "mobility" },
  { id: "GG0170D", label: "Sit to stand", domain: "mobility" },
  { id: "GG0170E", label: "Chair/bed-to-chair transfer", domain: "mobility" },
  { id: "GG0170F", label: "Toilet transfer", domain: "mobility" },
  { id: "GG0170G", label: "Car transfer", domain: "mobility" },
  { id: "GG0170I", label: "Walk 10 feet", domain: "mobility" },
  { id: "GG0170J", label: "Walk 50 feet with two turns", domain: "mobility" },
  { id: "GG0170K", label: "Walk 150 feet", domain: "mobility" },
  { id: "GG0170L", label: "Walking 10 feet uneven surface", domain: "mobility" },
  { id: "GG0170M", label: "1 step (curb)", domain: "mobility" },
  { id: "GG0170N", label: "4 steps", domain: "mobility" },
  { id: "GG0170O", label: "12 steps", domain: "mobility" },
  { id: "GG0170P", label: "Picking up object", domain: "mobility" },
  { id: "GG0170R", label: "Wheel 50 feet with two turns", domain: "mobility" },
  { id: "GG0170S", label: "Wheel 150 feet", domain: "mobility" },
];

export const conditionMap = {
  "01": "Stroke",
  "02": "Non-Traumatic Brain Dysfunction and Traumatic Brain Dysfunction",
  "03": "Non-Traumatic Brain Dysfunction and Traumatic Brain Dysfunction",
  "04": "Non-Traumatic Spinal Cord Dysfunction",
  "05": "Traumatic Spinal Cord Dysfunction",
  "06": "Progressive Neurological Conditions",
  "07": "Other Neurological Conditions",
  "08": "Amputation",
  "09": "Hip and Knee Replacements",
  "10": "Fractures and Other Multiple Trauma",
  "11": "Other Orthopedic Conditions",
  "12": "Debility, Cardiorespiratory Conditions",
  "13": "Medically Complex Conditions",
};


export function formatDOB(dobStr) {
  if (!dobStr || dobStr.length !== 8) return "Unknown";
  const year = dobStr.substring(0, 4);
  const month = dobStr.substring(4, 6);
  const day = dobStr.substring(6, 8);
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
  const admitDate = parsedValues["A1900"];
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
  if (!parsedValues["GG0170I1"]) return "Unknown";

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

export function calculateFunctionScore(values) {
  const safe = (key) => {
    const v = values[key];
    return valid.has(v) ? parseInt(v, 10) : 1;
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

  const mobilityType = determineMobilityType(values);

  if (mobilityType === "Wheel") {
    return sa + sb + sc + ma + mc + md + me + mf + mr + mr;
  } else {
    return sa + sb + sc + ma + mc + md + me + mf + mi + mj;
  }
}

export function getContributingItemIds(values) {
  const mobilityType = determineMobilityType(values);

  const base = ["GG0130A", "GG0130B", "GG0130C", "GG0170A", "GG0170C", "GG0170D", "GG0170E", "GG0170F"];

  if (mobilityType === "Wheel") {
    return new Set([...base, "GG0170R"]);
  } else {
    return new Set([...base, "GG0170I", "GG0170J"]);
  }
}
