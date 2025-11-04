import mdsItemLookup from "../../api/data/mds_item_lookup.json" with { type: "json" };
// All calculations now handled server-side
import { parseXml } from "./xmlParser.js";
// coefficientLoader is server-only - import directly (fileParser is server-only via server.js)
import { getImputationMultipliersForItem } from './server/coefficientLoader.js';
import { getImputationThresholds, shouldExcludeGGItemCovariate } from "./imputationCalculations.js";
import { getSectionName } from "./sectionNames.js";

// Helper function to calculate GG item-specific covariates
export const getGGItemSpecificCovariate = (covariateName, parsedValues, itemMultipliers = null) => {
  if (covariateName.includes(" - Valid Score") || 
      covariateName.includes(" - Not Attempted") || 
      covariateName.includes(" - Skipped")) {
    
    const match = covariateName.match(/\(GG[0-9]+[A-Z][0-9]\)/);
    if (match) {
      const ggItemId = match[0].slice(1, -1);
      const rawValue = parsedValues[ggItemId];
      
      if (covariateName.includes(" - Valid Score")) {
        if (rawValue && ['01', '02', '03', '04', '05', '06'].includes(rawValue)) {
          return parseInt(rawValue, 10);
        }
        return 0;
      } else if (covariateName.includes(" - Not Attempted")) {
        // Not Attempted: return 1 if value is any ANA value (07, 08, 09, 10, 88)
        // For items WITHOUT a separate "Skipped" covariate, ^ is also treated as Not Attempted
        
        // Check if this item has a Skipped covariate (only J1, K1, L1, N1, O1, R1, S1)
        const hasSkippedCovariate = itemMultipliers && Object.keys(itemMultipliers).some(key => 
          key.includes(ggItemId) && key.includes('Skipped')
        );
        
        if (hasSkippedCovariate) {
          // If item has a Skipped covariate, only count ANA values as Not Attempted
          return ['07', '08', '09', '10', '88'].includes(rawValue) ? 1 : 0;
        } else {
          // If no Skipped covariate, treat ^ as Not Attempted too
          return ['07', '08', '09', '10', '88', '^'].includes(rawValue) ? 1 : 0;
        }
      } else if (covariateName.includes(" - Skipped")) {
        // Skipped: return 1 if value is ^ (skip pattern), else 0
        // Note: This covariate only exists for certain items (J1, K1, L1, N1, O1, R1, S1)
        return rawValue === '^' ? 1 : 0;
      }
    }
  }
  return null;
};

// Helper function to get covariate value
export const getCovariateValue = (covariateName, parsedValues, summary, icdList, startScores, ardDate, itemMultipliers = null) => {
  const ggItemSpecificValue = getGGItemSpecificCovariate(covariateName, parsedValues, itemMultipliers);
  if (ggItemSpecificValue !== null) {
    return ggItemSpecificValue;
  }
  
  const result = getFunctionCovariates(parsedValues, summary, icdList, startScores, ardDate);
  return result?.covariates?.[covariateName] || 0;
};

// Function to calculate imputed value for a specific GG item
export const calculateImputedValue = (ggItemId, parsedValues, summary, icdList, startScores) => {
  const ardDate = parsedValues['A2300'];
  const multipliers = getImputationMultipliersForItem(ggItemId, ardDate);
  if (!multipliers || Object.keys(multipliers).length === 0) return "01"; // Default fallback
  
  // Get covariates to determine Uses Wheelchair value
  const { covariates } = getFunctionCovariates(parsedValues, summary, icdList, startScores, ardDate);
  const usesWheelchair = covariates["Uses Wheelchair"] === 1;
  
  const thresholds = getImputationThresholds(ggItemId, ardDate);
  let imputationScore = 0;

  // Calculate imputation score using covariate * multiplier
  for (const [covariateName, multiplier] of Object.entries(multipliers)) {
    // Check if this is a GG item-specific covariate that should be excluded
    if (covariateName.includes('(GG') && 
        (covariateName.includes('Valid Score') || 
         covariateName.includes('Not Attempted') || 
         covariateName.includes('Skipped'))) {
      
      if (shouldExcludeGGItemCovariate(covariateName, ggItemId, usesWheelchair)) {
        // Skip this covariate
        continue;
      }
    }
    
    const covariateValue = getCovariateValue(covariateName, parsedValues, summary, icdList, startScores, ardDate, multipliers);
    imputationScore += covariateValue * multiplier;
  }

  // Determine which threshold range the score falls into
  let imputedValue = 1; // Default to 1
  for (let i = 0; i < thresholds.length; i++) {
    if (imputationScore > thresholds[i]) {
      imputedValue = i + 2; // 2, 3, 4, 5, 6
    }
  }

  // Convert imputed value back to GG item format (01-06)
  return imputedValue.toString().padStart(2, '0');
};

export function handleFileUpload(
  file,
  setFileName,
  setParsedValues,
  setGroupedSections,
  setModeledValues,
  setStartScores,
  setImputedItems
) {
  setFileName(file.name);

  file.text().then((text) => {
    const parsed = parseXml(text);
    
    // HIPAA compliance: Clear the file text from memory immediately after parsing
    text = null;
    
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
    GG_ITEMS.forEach((item) => {
      const sourceId = item.id + "1";
      const rawVal = parsed[sourceId] || "01";
      tempStartScores[item.id] = rawVal;
    });
    
    // Second pass: apply imputation where needed and set both start and modeled scores
    const summary = extractPatientSummary(parsed, parsed["A2300"]);
    const icdList = Object.entries(parsed)
      .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
      .map(([_, value]) => value)
      .filter(Boolean);
    
    GG_ITEMS.forEach((item) => {
      const sourceId = item.id + "1";
      const rawVal = parsed[sourceId];
      const isValidValue = rawVal && ['01', '02', '03', '04', '05', '06'].includes(rawVal);
      
      let finalValue;
      if (isValidValue) {
        // Use raw value if valid
        finalValue = rawVal;
      } else {
        // Apply imputation if invalid/missing
        finalValue = calculateImputedValue(sourceId, parsed, summary, icdList, tempStartScores);
        imputedItems.add(item.id); // Track that this item was imputed
      }
      
      // Set both start and modeled scores to the same value (start scores)
      initStart[item.id] = finalValue;
      initModeled[item.id] = finalValue;
    });

    setModeledValues(initModeled);
    setStartScores(initStart);
    setImputedItems(imputedItems);
  });
}
