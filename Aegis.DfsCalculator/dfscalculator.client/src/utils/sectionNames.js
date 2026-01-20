/**
 * MDS Section Name Lookup Utility
 * 
 * Maps section codes to their full descriptive names
 */

import sectionNamesData from '../data/mds_section_names.json' with { type: "json" };

/**
 * Get full section name from section code
 * @param {string} sectionCode - Section code (e.g., 'A', 'GG', 'Control')
 * @returns {string} Full section name or the code itself if not found
 */
export function getSectionName(sectionCode) {
  return sectionNamesData[sectionCode] || sectionCode;
}

/**
 * Get all section names
 * @returns {Object} All section code to name mappings
 */
export function getAllSectionNames() {
  return sectionNamesData;
}

export default sectionNamesData;
