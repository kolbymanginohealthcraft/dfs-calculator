import mdsItemLookup from "../data/mds_item_lookup.json";
import { GG_ITEMS, getFunctionCovariates, extractPatientSummary } from "./calculations";
import { parseXml } from "./xmlParser"; // already used in your code
import { imputationMultipliers } from "./imputationMultipliers";
import { getImputationThresholds } from "./imputationCalculations";

// Helper function to calculate GG item-specific covariates
const getGGItemSpecificCovariate = (covariateName, parsedValues) => {
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
        return rawValue === '07' ? 1 : 0;
      } else if (covariateName.includes(" - Skipped")) {
        return rawValue === '09' ? 1 : 0;
      }
    }
  }
  return null;
};

// Helper function to get covariate value
const getCovariateValue = (covariateName, parsedValues, summary, icdList, startScores) => {
  const ggItemSpecificValue = getGGItemSpecificCovariate(covariateName, parsedValues);
  if (ggItemSpecificValue !== null) {
    return ggItemSpecificValue;
  }
  
  const result = getFunctionCovariates(parsedValues, summary, icdList, startScores);
  return result?.covariates?.[covariateName] || 0;
};

// Function to calculate imputed value for a specific GG item
const calculateImputedValue = (ggItemId, parsedValues, summary, icdList, startScores) => {
  const multipliers = imputationMultipliers[ggItemId];
  if (!multipliers) return "01"; // Default fallback
  
  const thresholds = getImputationThresholds(ggItemId);
  let imputationScore = 0;

  // Calculate imputation score using covariate * multiplier
  for (const [covariateName, multiplier] of Object.entries(multipliers)) {
    const covariateValue = getCovariateValue(covariateName, parsedValues, summary, icdList, startScores);
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
      const fullName = item.sect_name || sectLabel;

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
