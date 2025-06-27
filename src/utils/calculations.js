import icdToHcc from "./icdToHcc";
import { functionMultipliers } from "./functionMultipliers";

export const scoreMap = {
  "01": 1,
  "02": 2,
  "03": 3,
  "04": 4,
  "05": 5,
  "06": 6,
  "07": 1,
  "08": 1,
  10: 1,
  88: 1,
  "^": 1,
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

// Map age to covariate
function getAgeCovariate(age) {
  if (age == null) return null;
  if (age <= 54) return "≤54 Years";
  if (age <= 64) return "55-64 Years";
  if (age <= 74) return "65-74 Years";
  if (age <= 84) return "75-84 Years";
  if (age <= 90) return "85-90 Years";
  return ">90 Years";
}

// Safely square a number
const squared = (n) => (typeof n === "number" ? n * n : 0);

// Map ICD codes to HCCs
export function getHccCount(parsedValues) {
  const icdFields = [
    "I0020B",
    "I8000A",
    "I8000B",
    "I8000C",
    "I8000D",
    "I8000E",
    "I8000F",
    "I8000G",
    "I8000H",
    "I8000I",
    "I8000J",
  ];

  const icdCodes = icdFields
    .map((field) => parsedValues[field])
    .filter(Boolean)
    .map((code) => code.replace(/\^|\./g, "").toUpperCase());

  const uniqueHccs = new Set(
    icdCodes.map((code) => icdToHcc[code]).filter((hcc) => hcc !== undefined)
  );

  return uniqueHccs.size;
}

// Main function
export function getFunctionCovariates(
  parsedValues,
  summary,
  icdList,
  startScores
) {
  const covariates = {};

  // 1. Intercept and Entry terms
  covariates["Model Intercept"] = 1;
  // covariates["Entry"] = 1;

  // 2. Admission Function score + squared
  const startScore = calculateFunctionScore(startScores);

  covariates["Admission Function - Continuous Form"] = startScore;
  covariates["Admission Function - Squared Form"] = squared(startScore);

  // 3. Age group logic
  const age =
    summary?.age ??
    calculateAgeAtAdmission(parsedValues["A0900"], parsedValues["A1900"]);
  const ageCov = getAgeCovariate(age);
  if (ageCov) covariates[ageCov] = 1;

  // 4. Prior Surgery
  if (parsedValues["J2000"] === "1") {
    covariates["Prior Surgery"] = 1;
  }

  // 5. Bowel Incontinence
  const bowelMap = {
    1: "Occasionally",
    2: "Frequently",
    3: "Always",
    9: "Not Rated",
  };
  const bowel = bowelMap[parsedValues["H0400"]];
  if (bowel === "Always") {
    covariates["Bowel Continence: Always Incontinent - Admission"] = 1;
  } else if (["Occasionally", "Frequently"].includes(bowel)) {
    covariates[
      "Bowel Continence: Occasionally Incontinent, Frequently Incontinent - Admission"
    ] = 1;
  }

  // 6. Urinary Incontinence
  const urineMap = {
    1: "Occasionally",
    2: "Frequently",
    3: "Always",
    9: "Not Rated",
  };
  const urine = urineMap[parsedValues["H0300"]];
  if (urine === "Not Rated") {
    covariates[
      "Urinary Continence: Not Rated (Indwelling Urinary Catheter) - Admission"
    ] = 1;
  } else if (["Occasionally", "Frequently", "Always"].includes(urine)) {
    covariates[
      "Urinary Continence: Occasionally Incontinent, Frequently Incontinent, or Always Incontinent - Admission"
    ] = 1;
  }

  // 7. BMI (from inches + pounds)
  const height = parseFloat(parsedValues["K0200A"]);
  const weight = parseFloat(parsedValues["K0200B"]);
  const bmi =
    height && weight
      ? Math.round(((weight * 703) / (height * height)) * 10) / 10
      : null;
  if (bmi > 50) covariates["High BMI"] = 1;
  if (bmi >= 12 && bmi <= 19) covariates["Low BMI"] = 1;

  // 8. Cognitive Function BIMS
  const bims = parsedValues["C0500"];
  const c0900 = ["C0900A", "C0900B", "C0900C", "C0900D"].map(
    (k) => parsedValues[k]
  );
  const c0900z = parsedValues["C0900Z"];
  const bimsScore = (() => {
    const all1s = c0900.filter((v) => v === "1").length >= 2;
    if (["8", "9", "10", "11", "12"].includes(bims) || all1s)
      return "Moderately Impaired";
    if (
      ["01", "02", "03", "04", "05", "06", "07"].includes(bims) ||
      c0900z === "1" ||
      c0900.filter((v) => v === "1").length === 1
    )
      return "Severely Impaired";
    return "Not Impaired";
  })();
  if (bimsScore === "Moderately Impaired") {
    covariates[
      "Cognitive Function, BIMS Score: Moderately Impaired - Admission"
    ] = 1;
  } else if (bimsScore === "Severely Impaired") {
    covariates[
      "Cognitive Function, BIMS Score: Severely Impaired - Admission"
    ] = 1;
  }

  // 9. Communication Impairment
  const b0700 = parsedValues["B0700"];
  const b0800 = parsedValues["B0800"];
  if (["2", "3"].includes(b0700) || ["2", "3"].includes(b0800)) {
    covariates["Communication Impairment: Moderate to Severe - Admission"] = 1;
  } else if (
    (b0700 === "1" && b0800 === "1") ||
    (b0700 === "1" && b0800 === "0") ||
    (b0700 === "0" && b0800 === "1")
  ) {
    covariates["Communication Impairment: Mild - Admission"] = 1;
  }

  // 10. No PT or OT on Admission
  const ptSum = ["O0400B1", "O0400B2", "O0400B3"]
    .map((k) => parseInt(parsedValues[k] ?? "0"))
    .reduce((a, b) => a + b, 0);
  const otSum = ["O0400C1", "O0400C2", "O0400C3"]
    .map((k) => parseInt(parsedValues[k] ?? "0"))
    .reduce((a, b) => a + b, 0);
  if (ptSum === 0 && otSum === 0) {
    covariates["No Physical or Occupational Therapy - Admission"] = 1;
  }

  // 11. Medical Condition Category
  const conditionCode = parsedValues["I0020"];
  const conditionLabel = conditionMap[conditionCode];
  if (conditionLabel) {
    const key = `Primary Medical Condition Category: ${conditionLabel}`;
    covariates[key] = 1;

    const interactionKey = `Interaction of Admission Function Score and ${key}`;
    covariates[interactionKey] = startScore;
  }

  // 12. Prior Functioning: Self-Care
  const pfSelfCare = parsedValues["GG0100A"];
  if (pfSelfCare === "1") {
    covariates["Prior Functioning, Self-Care: Dependent"] = 1;
  } else if (pfSelfCare === "2") {
    covariates["Prior Functioning, Self-Care: Some Help"] = 1;
  }

  // 13. Prior Functioning: Indoor Mobility
  const pfMobility = parsedValues["GG0100B"];
  if (pfMobility === "1") {
    covariates[
      "Prior Functioning, Indoor Mobility (Ambulation): Dependent"
    ] = 1;
    // covariates[
    //   "Prior Functioning, Indoor Mobility (Ambulation): Dependent, Some Help"
    // ] = 1;
  } else if (pfMobility === "2") {
    covariates[
      "Prior Functioning, Indoor Mobility (Ambulation): Some Help"
    ] = 1;
    // covariates[
    //   "Prior Functioning, Indoor Mobility (Ambulation): Dependent, Some Help"
    // ] = 1;
  }

  // 14. Prior Functioning: Stairs
  const pfStairs = parsedValues["GG0100C"];
  if (pfStairs === "1") {
    covariates["Prior Functioning, Stairs: Dependent"] = 1;
  } else if (pfStairs === "2") {
    covariates["Prior Functioning, Stairs: Some Help"] = 1;
  }

  // 15. Prior Functioning: Functional Cognition
  const pfCog = parsedValues["GG0100D"];
  if (pfCog === "1") {
    covariates["Prior Functioning, Functional Cognition: Dependent"] = 1;
  }

  // 16. Prior Mobility Device Use
  if (
    ["1"].includes(parsedValues["GG0110A"]) ||
    ["1"].includes(parsedValues["GG0110B"])
  ) {
    covariates[
      "Prior Mobility Device Use: Manual Wheelchair and/or Motorized Wheelchair and/or Scooter"
    ] = 1;
  }
  if (parsedValues["GG0110C"] === "1") {
    covariates["Prior Mobility Device Use: Mechanical Lift"] = 1;
  }
  if (parsedValues["GG0110D"] === "1") {
    covariates["Prior Mobility Device Use: Walker"] = 1;
  }
  if (parsedValues["GG0110E"] === "1") {
    covariates["Prior Mobility Device Use: Orthotics/Prosthetics"] = 1;
  }

  // 17. Stage 2 Pressure Ulcer on Admission
  if (parseInt(parsedValues["M0300B1"] ?? "0") >= 1) {
    covariates["Stage 2 Pressure Ulcer - Admission"] = 1;
  }

  // 18. Stage 3, 4 or Unstageable Pressure Ulcer on Admission
  const ulcerFields = ["M0300C1", "M0300D1", "M0300E1", "M0300F1", "M0300G1"];
  const hasSevereUlcer = ulcerFields.some(
    (k) => parseInt(parsedValues[k] ?? "0") >= 1
  );
  if (hasSevereUlcer) {
    covariates[
      "Stage 3, 4 or Unstageable Pressure Ulcer/Injury - Admission"
    ] = 1;
  }

  // 19. History of Falls - Admission
  if (
    parsedValues["J1700A"] === "1" ||
    parsedValues["J1700B"] === "1" ||
    parsedValues["J1700C"] === "1"
  ) {
    covariates["History of Falls - Admission"] = 1;
  }

  // 20. Nutritional Approaches: Mechanically Altered Diet
  if (parsedValues["K0520C3"] === "1") {
    covariates[
      "Nutritional Approaches: Mechanically Altered Diet - Admission"
    ] = 1;
  }

  // 21. TPN, IV Feeding, or Tube Feeding
  if (parsedValues["K0520A3"] === "1" || parsedValues["K0520B3"] === "1") {
    covariates[
      "Total Parenteral/IV Feeding or Tube Feeding: While a Resident - Admission"
    ] = 1;
  }

  // Helper functions for querying comorbidities
  const normalizedICDs = Array.from(
    new Set(
      (icdList || [])
        .map((code) => code?.toUpperCase()?.replace(/[^A-Z0-9]/g, ""))
        .filter(Boolean)
    )
  );

  const hccSet = new Set(
    normalizedICDs.map((code) => icdToHcc[code]).filter(Boolean)
  );

  // 24. Amputations (new combined)
  if (
    parsedValues["GG0120D"] === "1" ||
    parseInt(parsedValues["O0500I"] ?? "0", 10) >= 1 ||
    hccSet.has(173) ||
    hccSet.has(189)
  ) {
    covariates[
      "Amputations: Traumatic Amputations and Complications (HCC173), Amputation Status, Lower Limb/Amputation Complications (HCC189), Amputation Status, Lower Limb/ Amputation Complications (HCC189)"
    ] = 1;
  }

  // 25. Aspiration/Bacterial Pneumonia (HCC114, HCC115) or I2000=1 and I0020 ≠ "12"
  if (parsedValues["I0020"] !== "12") {
    if (hccSet.has(114) || hccSet.has(115) || parsedValues["I2000"] === "1") {
      covariates[
        "Aspiration, Bacterial, and Other Pneumonias (HCC114/HCC115)"
      ] = 1;
    }
  }

  // 26. CKD (HCC137-139) or I1500=1
  if (
    parsedValues["I1500"] === "1" ||
    hccSet.has(137) ||
    hccSet.has(138) ||
    hccSet.has(139)
  ) {
    covariates["Chronic Kidney Disease - Stages 1-4, Unspecified: Chronic Kidney Disease, Severe (Stage 4) (HCC137), Chronic Kidney Disease, Moderate (Stage 3) (HCC138), Chronic Kidney Disease, Mild or Unspecified (Stages 1-2 or Unspecified) (HCC139)"] = 1;
  }

  // 27. Cancer - Colorectal/Bladder/Other (HCC11)
  if (hccSet.has(11)) {
    covariates["Colorectal, Bladder, and Other Cancers (HCC11)"] = 1;
  }

  // 28. Hemiplegia/Hemiparesis (HCC103) or I4900=1
  if (parsedValues["I4900"] === "1" || hccSet.has(103)) {
    covariates["Hemiplegia/Hemiparesis (HCC103)"] = 1;
  }

  // 29. Intestinal Obstruction (HCC33)
  if (hccSet.has(33)) {
    covariates["Intestinal Obstruction/Perforation (HCC33)"] = 1;
  }

  // 30. Lymphoma and Other Cancers (HCC10)
  if (hccSet.has(10)) {
    covariates["Lymphoma and Other Cancers (HCC10)"] = 1;
  }

  // 31. Major Head Injury (HCC167), I0020 ≠ "01"
  if (hccSet.has(167) && parsedValues["I0020"] !== "03") {
    covariates["Major Head Injury (HCC167)"] = 1;
  }

  // 32. Mental Health (HCC57-60 or I6000/I5800/I5900/I5950)
  if (
    ["I6000", "I5800", "I5900", "I5950"].some((k) => parsedValues[k] === "1") ||
    [57, 58, 59, 60].some((hcc) => hccSet.has(hcc))
  ) {
    covariates["Mental Health Disorders: Schizophrenia (HCC57), Major Depressive, Bipolar, and Paranoid Disorders (HCC59), Reactive and Unspecified Psychosis (HCC58), Personality Disorders (HCC60)"] = 1;
  }

  // 33. Metastatic Cancer/Acute Leukemia (HCC8) or I0100=1
  if (parsedValues["I0100"] === "1" || hccSet.has(8)) {
    covariates["Metastatic Cancer and Acute Leukemia (HCC8)"] = 1;
  }

  // 34. Multiple Sclerosis (HCC77) and I0020 ≠ "06"
  if (
    parsedValues["I0020"] !== "06" &&
    (parsedValues["I5200"] === "1" || hccSet.has(77))
  ) {
    covariates["Multiple Sclerosis (HCC77)"] = 1;
  }

  // 35. Other Significant Endocrine Disorders (HCC23)
  if (hccSet.has(23)) {
    covariates[
      "Other Significant Endocrine and Metabolic Disorders (HCC23)"
    ] = 1;
  }

  // 36. Parkinson's/Huntington's (HCC78) and I0020 ≠ "06"
  if (
    parsedValues["I0020"] !== "06" &&
    (parsedValues["I5250"] === "1" ||
      parsedValues["I5300"] === "1" ||
      hccSet.has(78))
  ) {
    covariates["Parkinson's and Huntington's Diseases (HCC78)"] = 1;
  }

  // 37. Tetraplegia/Paraplegia (HCC70, HCC71), I0020 ≠ "04" or "05"
  if (
    !["04", "05"].includes(parsedValues["I0020"]) &&
    (parsedValues["I5000"] === "1" ||
      parsedValues["I5100"] === "1" ||
      hccSet.has(70) ||
      hccSet.has(71))
  ) {
    covariates[
      "Tetraplegia (Excluding Complete) and Paraplegia (HCC70/71)"
    ] = 1;
  }

  // 38. Infectious disease: Septicemia, Sepsis, SIRS/Shock
  if (parsedValues["I2100"] === "1" || hccSet.has(2)) {
    covariates[
      "Septicemia, Sepsis, Systemic Inflammatory Response Syndrome/Shock (HCC2)"
    ] = 1;
  }

  // 39. Diabetes (with or without complications)
  if (parsedValues["I2900"] === "1" || hccSet.has(18) || hccSet.has(19)) {
    covariates["Diabetes: Diabetes With Chronic Complications (HCC18) or Diabetes Without Complications (HCC19)"] = 1;
  }

  // 40. Dementia (with or without complications)
  if (parsedValues["I4800"] === "1" || hccSet.has(51) || hccSet.has(52)) {
    covariates[
      "Dementia: Dementia With Complications (HCC51), Dementia Without Complications (HCC52)"
    ] = 1;
  }

  // 41. Renal: Dialysis Status or Chronic Kidney Disease Stage 5
  if (parsedValues["O0110J1A"] === "1" || parsedValues["O0110J1B"] === "1" || hccSet.has(134) || hccSet.has(136)) {
    covariates["Dialysis Status (HCC134), Chronic Kidney Disease, Stage 5 (HCC136)"] = 1;
  }

  // 42. Cardiac: Angina Pectoris
  if (parsedValues["I0020"] !== "12" && hccSet.has(88)) {
    covariates["Angina Pectoris (HCC88)"] = 1;
  }

  // Total weighted score based on covariates
  let weightedScore = 0;
  for (const [key, value] of Object.entries(covariates)) {
    const multiplier = functionMultipliers[key] ?? 0;
    weightedScore += value * multiplier;
  }

  return { covariates, weightedScore };
}
