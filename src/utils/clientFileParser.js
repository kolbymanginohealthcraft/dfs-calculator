/**
 * Client-side file parser - minimal parsing without server-side dependencies
 * Only parses XML and extracts basic GG item values
 */

import { parseXml } from './xmlParser';
import { GG_ITEMS } from './clientConstants';

// Lazy-load MDS lookup data (code-split for performance)
// These are public files, safe to bundle - using dynamic import for code splitting
// Vite will bundle them as separate chunks that load on-demand
let mdsItemLookupData = null;
let sectionNamesData = null;
let loadingPromise = null;

async function loadMdsLookupData() {
  // Return cached data if already loaded
  if (mdsItemLookupData && sectionNamesData) {
    return { mdsItemLookup: mdsItemLookupData, sectionNames: sectionNamesData };
  }
  
  // If already loading, wait for that promise
  if (loadingPromise) {
    return loadingPromise;
  }
  
  // Start loading - try API endpoint first (works when Express server is running)
  // Then fall back to dynamic import (works in production builds)
  loadingPromise = (async () => {
    // Try fetch first (works when Express server is running via Vite proxy)
    try {
      const [lookupRes, sectionRes] = await Promise.all([
        fetch('/api/data/mds_item_lookup.json').catch(() => ({ ok: false })),
        fetch('/api/data/mds_section_names.json').catch(() => ({ ok: false }))
      ]);
      
      if (lookupRes.ok && sectionRes.ok) {
        mdsItemLookupData = await lookupRes.json();
        sectionNamesData = await sectionRes.json();
        return { 
          mdsItemLookup: mdsItemLookupData, 
          sectionNames: sectionNamesData 
        };
      }
    } catch (fetchError) {
      // Fetch failed, continue to try import
    }
    
    // Fallback: try dynamic import (works in production builds)
    try {
      const [lookupModule, sectionModule] = await Promise.all([
        import('../../api/data/mds_item_lookup.json').catch(() => ({ default: {} })),
        import('../../api/data/mds_section_names.json').catch(() => ({ default: {} }))
      ]);
      
      mdsItemLookupData = lookupModule.default || lookupModule;
      sectionNamesData = sectionModule.default || sectionModule;
      
      // Only use if we got actual data
      if (Object.keys(mdsItemLookupData).length > 0 || Object.keys(sectionNamesData).length > 0) {
        return { 
          mdsItemLookup: mdsItemLookupData || {}, 
          sectionNames: sectionNamesData || {} 
        };
      }
    } catch (importError) {
      // Import also failed - silently continue
    }
    
    // Both methods failed - return empty objects (app works fine without MDS data tab)
    // This is intentional: the MDS data tab is a nice-to-have, not critical for core functionality
    return { mdsItemLookup: {}, sectionNames: {} };
  })();
  
  return loadingPromise;
}

/**
 * Parse file and extract basic data for client-side use
 * @param {File|string} file - File object or XML text
 * @returns {Promise<Object>} Object with parsedValues, startScores, modeledValues, and groupedSections
 */
export async function parseFileForClient(file, buildGroupedSections = false) {
  // Get XML text
  const xmlText = typeof file === 'string' ? file : await file.text();
  
  // Parse XML
  const parsedValues = parseXml(xmlText);
  
  // Build grouped sections for MDS data tab (only if requested - lazy loading)
  // This avoids blocking file parsing/score calculation for faster UI
  let groupedSections = {};
  if (buildGroupedSections) {
    const { mdsItemLookup, sectionNames } = await loadMdsLookupData();
    
    Object.entries(parsedValues).forEach(([key, val]) => {
      const item = mdsItemLookup[key];
      if (!item) return;

      const sectLabel = item.itm_sect_label || "Other";
      const fullName = sectionNames[sectLabel] || sectLabel;

      if (!groupedSections[sectLabel]) {
        groupedSections[sectLabel] = {
          label: sectLabel,
          fullName,
          items: [],
        };
      }

      groupedSections[sectLabel].items.push({
        id: key,
        label: item.itm_shrt_label,
        value: val,
      });
    });
  }
  
  // Extract start scores (GG items with "1" suffix)
  const startScores = {};
  const modeledValues = {};
  const imputedItems = new Set();
  
  GG_ITEMS.forEach((item) => {
    const sourceId = item.id + "1";
    const rawVal = parsedValues[sourceId] || "01";
    // Simple validation - if not a valid score, use default
    const validScores = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '88', '^'];
    const finalValue = validScores.includes(rawVal) ? rawVal : "01";
    
    startScores[item.id] = finalValue;
    // Initialize modeledValues to match startScores (end scores default to start scores)
    modeledValues[item.id] = finalValue;
    
    // If value was invalid/missing, mark as imputed (though actual imputation is server-side)
    if (!validScores.includes(rawVal)) {
      imputedItems.add(item.id);
    }
  });
  
  return {
    parsedValues,
    groupedSections,
    modeledValues,
    startScores,
    imputedItems
  };
}

/**
 * Build grouped sections from parsed values (lazy loading)
 * Call this when MDS data tab is opened to avoid blocking file parsing
 * @param {Object} parsedValues - Parsed MDS values
 * @returns {Promise<Object>} Grouped sections object
 */
export async function buildGroupedSections(parsedValues) {
  const { mdsItemLookup, sectionNames } = await loadMdsLookupData();
  
  const groupedSections = {};
  Object.entries(parsedValues).forEach(([key, val]) => {
    const item = mdsItemLookup[key];
    if (!item) return;

    const sectLabel = item.itm_sect_label || "Other";
    const fullName = sectionNames[sectLabel] || sectLabel;

    if (!groupedSections[sectLabel]) {
      groupedSections[sectLabel] = {
        label: sectLabel,
        fullName,
        items: [],
      };
    }

    groupedSections[sectLabel].items.push({
      id: key,
      label: item.itm_shrt_label,
      value: val,
    });
  });
  
  return groupedSections;
}

