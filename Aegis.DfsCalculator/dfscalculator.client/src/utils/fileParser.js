import mdsItemLookup from "../data/mds_item_lookup.json" with { type: "json" };
import { GG_ITEMS, extractPatientSummary } from "./calculations.js";
import { parseXml } from "./xmlParser.js";
import { getSectionName } from "./sectionNames.js";
import { batchImputeValues } from "./secureApiClient.js";

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 *
 * This function has been moved to api/utils/serverImputation.js to prevent reverse engineering.
 * All proprietary imputation logic is now server-only and protected.
 */
export const getCovariateValue = (covariateName, parsedValues, summary, icdList, startScores, ardDate, itemMultipliers = null) => {
  // This function has been removed from client bundle to protect proprietary IP
  throw new Error(
    'getCovariateValue() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
};

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 * 
 * This function contains proprietary imputation logic and has been moved
 * to api/utils/serverImputation.js to prevent reverse engineering.
 * 
 * Use the secure API client instead:
 * 
 * import { calculateImputedValue } from '../utils/secureApiClient';
 * const result = await calculateImputedValue({ ... });
 */
export const calculateImputedValue = (ggItemId, parsedValues, summary, icdList, startScores) => {
  // This function has been removed from client bundle to protect proprietary IP
  // All implementation is in api/utils/serverImputation.js
  throw new Error(
    'calculateImputedValue() is server-only. Use calculateImputedValue() from secureApiClient.js instead. ' +
    'This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
};

export async function handleFileUpload(
  file,
  setFileName,
  setParsedValues,
  setGroupedSections,
  setModeledValues,
  setStartScores,
  setImputedItems
) {
  setFileName(file.name);

  const text = await file.text();
  const parsed = parseXml(text);
  
  // HIPAA compliance: Clear the file text from memory immediately after parsing
  // Note: text is a const, so we can't reassign it, but it will be garbage collected
  
  setParsedValues(parsed);

  const grouped = {};
  Object.entries(parsed).forEach(([key, val]) => {
    const item = mdsItemLookup[key];
    if (!item) return;

    const sectLabel = item.itm_sect_label || "Other";
    const fullName = getSectionName(sectLabel);

    if (!grouped[sectLabel]) {
      grouped[sectLabel] = {
        label: sectLabel,
        fullName,
        items: [],
      };
    }

    grouped[sectLabel].items.push({
      id: key,
      label: item.itm_shrt_label,
      value: val,
    });
  });

  setGroupedSections(grouped);

  const initModeled = {};
  const initStart = {};
  const imputedItems = new Set();
  
  // First pass: set up initial values and collect data for imputation
  const tempStartScores = {};
  const targetGGItems = {}; // ALL GG items (needed for GG item-specific covariates)
  const itemsNeedingImputation = [];
  
  GG_ITEMS.forEach((item) => {
    const sourceId = item.id + "1";
    const rawVal = parsed[sourceId] || "01";
    tempStartScores[item.id] = rawVal;
    
    // Include ALL items in targetGGItems (server needs them for GG item-specific covariates)
    targetGGItems[sourceId] = rawVal;
    
    // Check if this item needs imputation
    const isValidValue = rawVal && ['01', '02', '03', '04', '05', '06'].includes(rawVal);
    if (!isValidValue) {
      itemsNeedingImputation.push(sourceId);
    }
  });
  
  // If we have items needing imputation, call the secure API
  let imputedValues = {};
  if (itemsNeedingImputation.length > 0) {
    try {
      const summary = extractPatientSummary(parsed, parsed["A2300"]);
      const icdList = Object.entries(parsed)
        .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
        .map(([_, value]) => value)
        .filter(Boolean);
      
      const result = await batchImputeValues({
        targetGGItems,
        parsedValues: parsed,
        summary,
        icdList,
        startScores: tempStartScores,
        ardDate: parsed["A2300"]
      });
      
      imputedValues = result.imputedValues || {};
    } catch (error) {
      console.error('Imputation failed during file upload:', error);
      // Fallback: use default value "01" for items that failed imputation
      itemsNeedingImputation.forEach(itemId => {
        imputedValues[itemId] = "01";
      });
    }
  }
  
  // Second pass: set both start and modeled scores
  GG_ITEMS.forEach((item) => {
    const sourceId = item.id + "1";
    const rawVal = parsed[sourceId];
    const isValidValue = rawVal && ['01', '02', '03', '04', '05', '06'].includes(rawVal);
    
    let finalValue;
    if (isValidValue) {
      // Use raw value if valid
      finalValue = rawVal;
    } else {
      // Use imputed value from API
      finalValue = imputedValues[sourceId] || "01"; // Fallback to "01" if imputation failed
      imputedItems.add(item.id); // Track that this item was imputed
    }
    
    // Set both start and modeled scores to the same value (start scores)
    initStart[item.id] = finalValue;
    initModeled[item.id] = finalValue;
  });

  setModeledValues(initModeled);
  setStartScores(initStart);
  setImputedItems(imputedItems);
}
