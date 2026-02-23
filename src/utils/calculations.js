import icdToHcc from "../data/icdToHcc.json" with { type: "json" };
import { getFunctionMultipliers } from "./coefficientLoader.js";

// Configuration flag for I0020 dependency methodology
// Set to true to use original CMS logic with I0020 dependencies
// Set to false to use modified logic without I0020 dependencies
const USE_I0020_DEPENDENCIES = true;

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
  {
    id: "GG0170L",
    label: "Walking 10 feet uneven surface",
    domain: "mobility",
  },
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
  10: "Fractures and Other Multiple Trauma",
  11: "Other Orthopedic Conditions",
  12: "Debility, Cardiorespiratory Conditions",
  13: "Medically Complex Conditions",
};

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

// ============================================================================
// CORE DATA PROCESSING FUNCTIONS
// ============================================================================

// ============================================================================
// PROPRIETARY COVARIATE PROCESSING FUNCTIONS - STUBBED (SERVER-ONLY)
// ============================================================================
// All proprietary covariate processing logic has been moved to 
// api/utils/serverCalculations.js to protect intellectual property.
// These functions are stubbed here to prevent client-side usage.

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 */
export function getAgeCovariate(age) {
  throw new Error(
    'getAgeCovariate() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 */
export function processAgeCovariate(parsedValues, summary) {
  throw new Error(
    'processAgeCovariate() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 */
export function processMobilityType(parsedValues) {
  throw new Error(
    'processMobilityType() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 */
export function processUsesWheelchair(parsedValues) {
  throw new Error(
    'processUsesWheelchair() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 */
export function processBMICovariates(parsedValues) {
  throw new Error(
    'processBMICovariates() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 */
export function processCognitiveFunction(parsedValues) {
  throw new Error(
    'processCognitiveFunction() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 */
export function processCommunicationImpairment(parsedValues) {
  throw new Error(
    'processCommunicationImpairment() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 */
export function processContinenceCovariates(parsedValues) {
  throw new Error(
    'processContinenceCovariates() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 */
export function processPriorFunctioning(parsedValues) {
  throw new Error(
    'processPriorFunctioning() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 */
export function processPriorMobilityDevices(parsedValues) {
  throw new Error(
    'processPriorMobilityDevices() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 */
export function processMedicalConditionCategory(parsedValues, startScore) {
  throw new Error(
    'processMedicalConditionCategory() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 * Contains proprietary HCC mapping and condition processing logic.
 */
export function processHccConditions(parsedValues, icdList) {
  throw new Error(
    'processHccConditions() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 */
export function processAdditionalClinicalConditions(parsedValues) {
  throw new Error(
    'processAdditionalClinicalConditions() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 * Uses proprietary HCC mapping logic.
 */
export function getHccCount(parsedValues) {
  throw new Error(
    'getHccCount() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

// Main function - PROPRIETARY ALGORITHM REMOVED
/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 * 
 * This function contains proprietary calculation logic and has been moved
 * to api/utils/serverCalculations.js to prevent reverse engineering.
 * 
 * Use the secure API client instead:
 * 
 * import { calculateFunctionScore } from '../utils/secureApiClient';
 * const result = await calculateFunctionScore({ ... });
 * 
 * This function is ONLY available server-side and will NEVER be bundled into client code.
 */
export function getFunctionCovariates(
  parsedValues,
  summary,
  icdList,
  startScores,
  ardDate = null,
  manualOverrides = {}
) {
  // This function has been removed from client bundle to protect proprietary IP
  // All implementation is in api/utils/serverCalculations.js
  throw new Error(
    'getFunctionCovariates() is server-only. Use calculateFunctionScore() from secureApiClient.js instead. ' +
    'This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}
