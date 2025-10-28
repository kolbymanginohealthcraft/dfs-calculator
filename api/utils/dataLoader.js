/**
 * Server-Side Data Loader
 * 
 * Provides server-side access to JSON data files for API endpoints
 */

// Server-side data imports
import coefficientsAllVersions from '../data/coefficients-all-versions.json' with { type: 'json' };
import endScoreCoefficients from '../data/end-score-coefficients.json' with { type: 'json' };
import icdToHcc from '../data/icdToHcc.json' with { type: 'json' };
import mdsItemLookup from '../data/mds_item_lookup.json' with { type: 'json' };
import mdsSectionNames from '../data/mds_section_names.json' with { type: 'json' };

/**
 * Get function multipliers for a specific date (server-side)
 * @param {string} dateStr - ARD date
 * @returns {Object} Function multipliers object
 */
export function getFunctionMultipliers(dateStr) {
  if (!dateStr) {
    return coefficientsAllVersions.functionMultipliers[coefficientsAllVersions.schedule[coefficientsAllVersions.schedule.length - 1].updateId];
  }
  
  // Find the appropriate update ID based on ARD date
  const updateId = getUpdateIdForDate(dateStr);
  return coefficientsAllVersions.functionMultipliers[updateId];
}

/**
 * Get imputation multipliers for a specific date (server-side)
 * @param {string} dateStr - ARD date
 * @returns {Object} Imputation multipliers object
 */
export function getImputationMultipliers(dateStr) {
  if (!dateStr) {
    return coefficientsAllVersions.imputationMultipliers[coefficientsAllVersions.schedule[coefficientsAllVersions.schedule.length - 1].updateId];
  }
  
  const updateId = getUpdateIdForDate(dateStr);
  return coefficientsAllVersions.imputationMultipliers[updateId];
}

/**
 * Get end score imputation multipliers for a specific GG item and ARD date (server-side)
 * @param {string} ggItemId - The GG item ID (e.g., 'GG0130A3')
 * @param {string} ardDate - The assessment reference date
 * @returns {Object|null} Object containing multipliers or null if not found
 */
export function getEndScoreImputationMultipliers(ggItemId, ardDate) {
  if (!ardDate) return null;
  
  const updateId = findUpdateIdForDate(ardDate);
  if (!updateId) return null;
  
  const multipliers = endScoreCoefficients.endScoreImputationMultipliers[updateId];
  if (!multipliers) return null;
  
  return multipliers[ggItemId] || null;
}

/**
 * Get end score imputation thresholds for a specific GG item and ARD date (server-side)
 * @param {string} ggItemId - The GG item ID (e.g., 'GG0130A3')
 * @param {string} ardDate - The assessment reference date
 * @returns {Array|null} Array of thresholds or null if not found
 */
export function getEndScoreImputationThresholds(ggItemId, ardDate) {
  if (!ardDate) return null;
  
  const updateId = findUpdateIdForDate(ardDate);
  if (!updateId) return null;
  
  const thresholds = endScoreCoefficients.endScoreThresholds[updateId];
  if (!thresholds) return null;
  
  return thresholds[ggItemId] || null;
}

/**
 * Get ICD to HCC mapping (server-side)
 * @returns {Object} ICD to HCC mapping object
 */
export function getIcdToHcc() {
  return icdToHcc;
}

/**
 * Get MDS item lookup (server-side)
 * @returns {Object} MDS item lookup object
 */
export function getMdsItemLookup() {
  return mdsItemLookup;
}

/**
 * Get MDS section names (server-side)
 * @returns {Object} MDS section names object
 */
export function getMdsSectionNames() {
  return mdsSectionNames;
}

/**
 * Get version information for a specific date (server-side)
 * @param {string} dateStr - ARD date
 * @returns {Object} Schedule entry with updateId, version info, etc.
 */
export function getVersionFromArdDate(dateStr) {
  const updateId = getUpdateIdForDate(dateStr);
  return coefficientsAllVersions.schedule.find(s => s.updateId === updateId);
}

/**
 * Find the appropriate update ID for a given ARD date (server-side)
 * @param {string} ardDate - The assessment reference date (YYYY-MM-DD or YYYYMMDD format)
 * @returns {string|null} The update ID or null if not found
 */
function getUpdateIdForDate(ardDate) {
  if (!ardDate) return null;
  
  // Normalize date format
  let normalizedDate;
  if (ardDate.includes('-')) {
    normalizedDate = ardDate;
  } else if (ardDate.length === 8) {
    // Convert YYYYMMDD to YYYY-MM-DD
    normalizedDate = `${ardDate.slice(0, 4)}-${ardDate.slice(4, 6)}-${ardDate.slice(6, 8)}`;
  } else {
    return null;
  }
  
  // Find the schedule entry that covers this date
  for (const entry of coefficientsAllVersions.schedule) {
    const startDate = entry.startDate;
    const endDate = entry.endDate;
    
    if (normalizedDate >= startDate && (!endDate || normalizedDate <= endDate)) {
      return entry.updateId;
    }
  }
  
  return null;
}

/**
 * Find the appropriate update ID for end score coefficients (server-side)
 * @param {string} ardDate - The assessment reference date (YYYY-MM-DD or YYYYMMDD format)
 * @returns {string|null} The update ID or null if not found
 */
function findUpdateIdForDate(ardDate) {
  if (!ardDate) return null;
  
  // Normalize date format
  let normalizedDate;
  if (ardDate.includes('-')) {
    normalizedDate = ardDate;
  } else if (ardDate.length === 8) {
    // Convert YYYYMMDD to YYYY-MM-DD
    normalizedDate = `${ardDate.slice(0, 4)}-${ardDate.slice(4, 6)}-${ardDate.slice(6, 8)}`;
  } else {
    return null;
  }
  
  // Find the schedule entry that covers this date
  for (const entry of endScoreCoefficients.schedule) {
    const startDate = entry.startDate;
    const endDate = entry.endDate;
    
    if (normalizedDate >= startDate && (!endDate || normalizedDate <= endDate)) {
      return entry.updateId;
    }
  }
  
  return null;
}
