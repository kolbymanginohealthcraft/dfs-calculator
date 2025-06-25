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
