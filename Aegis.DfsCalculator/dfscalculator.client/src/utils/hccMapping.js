import icdToHcc from "../data/icdToHcc.json";

/**
 * Get HCC values for a given ICD code
 * @param {string} icdCode - The ICD code to look up
 * @returns {number[]} Array of HCC values for the ICD code
 */
export function getHccValuesForIcd(icdCode) {
  if (!icdCode) return [];
  
  // Clean the ICD code (remove dots, dashes, spaces, convert to uppercase)
  const cleanedCode = icdCode.replace(/[^A-Z0-9]/g, "").toUpperCase();
  
  // Look up the HCC value(s) for this ICD code
  const hccValue = icdToHcc[cleanedCode];
  
  if (hccValue) {
    // Return as array in case there are multiple HCC values
    return Array.isArray(hccValue) ? hccValue : [hccValue];
  }
  
  return [];
}

/**
 * Format HCC values for display
 * @param {number[]} hccValues - Array of HCC values
 * @returns {string} Formatted HCC display string
 */
export function formatHccDisplay(hccValues) {
  if (!hccValues || hccValues.length === 0) return "";
  
  // Sort HCC values for consistent display
  const sortedValues = [...hccValues].sort((a, b) => a - b);
  
  if (sortedValues.length === 1) {
    return `HCC${sortedValues[0]}`;
  } else {
    return `HCC${sortedValues.join(", HCC")}`;
  }
}

/**
 * Get formatted HCC display for an ICD code
 * @param {string} icdCode - The ICD code to look up
 * @returns {string} Formatted HCC display string, or empty string if no HCC found
 */
export function getHccDisplayForIcd(icdCode) {
  const hccValues = getHccValuesForIcd(icdCode);
  return formatHccDisplay(hccValues);
}
