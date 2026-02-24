/**
 * Coefficient Loader - Version-Aware Schedule Access
 * 
 * Provides access to the fiscal-year schedule based on the ARD
 * (Assessment Reference Date - A2300) from the MDS file.
 * 
 * Coefficient multiplier data is NOT bundled in the frontend.
 * All calculation logic using those values lives on the C# backend.
 */

import scheduleData from '../data/schedule-only.json' with { type: "json" };

/**
 * Determine which Update ID to use based on an assessment date
 * @param {string} dateStr - Date string from A2300 field in format YYYYMMDD or YYYY-MM-DD
 * @returns {string} Update ID ('1', '2', '3', etc.)
 */
export function getUpdateIdForDate(dateStr) {
  if (!dateStr) {
    return scheduleData.schedule[scheduleData.schedule.length - 1].updateId;
  }
  
  let assessmentDate;
  if (dateStr.includes('-')) {
    assessmentDate = new Date(dateStr);
  } else if (dateStr.length === 8) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    assessmentDate = new Date(`${year}-${month}-${day}`);
  } else {
    return scheduleData.schedule[scheduleData.schedule.length - 1].updateId;
  }
  
  const assessmentDateOnly = new Date(Date.UTC(
    assessmentDate.getUTCFullYear(),
    assessmentDate.getUTCMonth(),
    assessmentDate.getUTCDate()
  ));
  
  for (const period of scheduleData.schedule) {
    const startDate = new Date(period.startDate);
    const startDateOnly = new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    ));
    
    const endDate = period.endDate ? new Date(period.endDate) : new Date('9999-12-31');
    const endDateOnly = new Date(Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate()
    ));
    
    if (assessmentDateOnly >= startDateOnly && assessmentDateOnly <= endDateOnly) {
      return period.updateId;
    }
  }
  
  return scheduleData.schedule[scheduleData.schedule.length - 1].updateId;
}

/**
 * Get schedule information for a specific date
 * @param {string} dateStr - ARD date
 * @returns {Object} Schedule entry
 */
export function getScheduleInfo(dateStr) {
  const updateId = getUpdateIdForDate(dateStr);
  return scheduleData.schedule.find(s => s.updateId === updateId);
}

/**
 * Get version information for a specific date (alias for getScheduleInfo)
 * @param {string} dateStr - ARD date
 * @returns {Object} Schedule entry with updateId, version info, etc.
 */
export function getVersionFromArdDate(dateStr) {
  return getScheduleInfo(dateStr);
}

/**
 * Get all available schedule entries
 * @returns {Array} Array of schedule entries
 */
export function getAllSchedules() {
  return scheduleData.schedule;
}

/**
 * Get metadata about the coefficient data
 * @returns {Object} Metadata
 */
export function getMetadata() {
  return scheduleData.metadata;
}
