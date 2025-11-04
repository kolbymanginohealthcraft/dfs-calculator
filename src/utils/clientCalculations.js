/**
 * Client-side calculation utilities
 * 
 * These are simple arithmetic functions that don't require server-side data
 * and can be safely used in the browser for basic score calculations.
 */

// Sets used for determining mobility type
export const ANA = new Set(["07", "09", "10", "88"]);
export const valid = new Set(["01", "02", "03", "04", "05", "06"]);

/**
 * Determine mobility type from parsed values
 * @param {Object} parsedValues - Parsed MDS values
 * @returns {string} "Wheel", "Walk", or "Unknown"
 */
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

/**
 * Calculate function score from GG item values
 * This is a simple arithmetic function that sums the relevant GG items
 * @param {Object} values - Object containing GG item values (e.g., GG0130A, GG0170A, etc.)
 * @param {string|null} mobilityType - Optional mobility type ("Wheel" or "Walk"). If not provided, will be determined from values.
 * @returns {number} The calculated function score
 */
export function calculateFunctionScore(values, mobilityType = null) {
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

  // Use provided mobility type or determine from values
  const actualMobilityType = mobilityType || determineMobilityType(values);

  if (actualMobilityType === "Wheel") {
    return sa + sb + sc + ma + mc + md + me + mf + mr + mr;
  } else {
    return sa + sb + sc + ma + mc + md + me + mf + mi + mj;
  }
}

