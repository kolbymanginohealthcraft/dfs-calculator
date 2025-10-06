/**
 * Coefficient Loader - Version-Aware Data Access
 * 
 * This utility provides access to the correct version of coefficients
 * based on the ARD (Assessment Reference Date) from the MDS file.
 */

import allVersions from '../data/coefficients-all-versions.json';

/**
 * Determine which Update ID to use based on an assessment date
 * @param {string} dateStr - Date string in format YYYYMMDD or YYYY-MM-DD
 * @returns {string} Update ID ('1', '2', '3', etc.)
 */
export function getUpdateIdForDate(dateStr) {
  if (!dateStr) {
    console.warn('No date provided, using latest version');
    return allVersions.schedule[allVersions.schedule.length - 1].updateId;
  }
  
  // Parse date string (handle both YYYYMMDD and YYYY-MM-DD formats)
  let assessmentDate;
  if (dateStr.includes('-')) {
    assessmentDate = new Date(dateStr);
  } else if (dateStr.length === 8) {
    // YYYYMMDD format
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    assessmentDate = new Date(`${year}-${month}-${day}`);
  } else {
    console.warn('Invalid date format, using latest version');
    return allVersions.schedule[allVersions.schedule.length - 1].updateId;
  }
  
  // Find matching schedule entry
  for (const period of allVersions.schedule) {
    const startDate = new Date(period.startDate);
    const endDate = period.endDate ? new Date(period.endDate) : new Date('9999-12-31');
    
    if (assessmentDate >= startDate && assessmentDate <= endDate) {
      return period.updateId;
    }
  }
  
  // Default to latest if date is in the future or not found
  return allVersions.schedule[allVersions.schedule.length - 1].updateId;
}

/**
 * Get function multipliers for a specific date
 * @param {string} dateStr - ARD date
 * @returns {Object} Function multipliers object
 */
export function getFunctionMultipliers(dateStr) {
  const updateId = getUpdateIdForDate(dateStr);
  return allVersions.functionMultipliers[updateId];
}

/**
 * Get imputation multipliers for a specific date
 * @param {string} dateStr - ARD date
 * @returns {Object} Imputation multipliers object
 */
export function getImputationMultipliers(dateStr) {
  const updateId = getUpdateIdForDate(dateStr);
  return allVersions.imputationMultipliers[updateId];
}

/**
 * Get imputation multipliers for a specific GG item and date
 * @param {string} ggItemId - GG item ID (e.g., 'GG0130A1')
 * @param {string} dateStr - ARD date
 * @returns {Object} Imputation multipliers for that item
 */
export function getImputationMultipliersForItem(ggItemId, dateStr) {
  const updateId = getUpdateIdForDate(dateStr);
  const allImputation = allVersions.imputationMultipliers[updateId];
  return allImputation?.[ggItemId] || {};
}

/**
 * Get schedule information for a specific date
 * @param {string} dateStr - ARD date
 * @returns {Object} Schedule entry
 */
export function getScheduleInfo(dateStr) {
  const updateId = getUpdateIdForDate(dateStr);
  return allVersions.schedule.find(s => s.updateId === updateId);
}

/**
 * Get all available schedule entries
 * @returns {Array} Array of schedule entries
 */
export function getAllSchedules() {
  return allVersions.schedule;
}

/**
 * Get metadata about the coefficient data
 * @returns {Object} Metadata
 */
export function getMetadata() {
  return allVersions.metadata;
}

// Export the raw data for advanced use cases
export { allVersions };
