/**
 * Server-Only Imputation Functions
 * 
 * ⚠️ PROPRIETARY IP - NEVER BUNDLE INTO CLIENT CODE ⚠️
 * 
 * This module contains the complete implementation of proprietary imputation
 * algorithms. These functions are ONLY available server-side and will NEVER
 * be included in the client bundle.
 * 
 * All proprietary imputation logic has been copied here from:
 * - src/utils/imputationCalculations.js
 * - src/utils/fileParser.js (getCovariateValue, calculateImputedValue, getGGItemSpecificCovariate)
 * to ensure it cannot be reverse-engineered from client-side code.
 */

import { getFunctionCovariates, determineMobilityType } from './serverCalculations.js';
import { getImputationMultipliers, getImputationMultipliersForItem } from './serverCoefficientLoader.js';
import { covariateMapping } from '../../src/utils/covariateMapping.js';

/**
 * Standard normal cumulative distribution function Φ(x).
 * Uses the Abramowitz & Stegun rational approximation (max error ~1.5e-7).
 */
function normalCDF(x) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Converts an imputation score (z) and thresholds (alphas) into a continuous
 * imputed value using the CMS statistical imputation methodology.
 *
 * Per CMS Table 8-8:
 *   Pr(z ≤ α₁)         = Φ(α₁ − z)
 *   Pr(αₖ < z ≤ αₖ₊₁)  = Φ(αₖ₊₁ − z) − Φ(αₖ − z)
 *   Pr(z > α₅)          = 1 − Φ(α₅ − z)
 *
 *   Imputed value = 1·P₁ + 2·P₂ + 3·P₃ + 4·P₄ + 5·P₅ + 6·P₆
 */
function computeImputedValueFromScore(z, thresholds) {
  const probs = [];
  probs[0] = normalCDF(thresholds[0] - z);
  for (let i = 1; i < thresholds.length; i++) {
    probs[i] = normalCDF(thresholds[i] - z) - normalCDF(thresholds[i - 1] - z);
  }
  probs[thresholds.length] = 1 - normalCDF(thresholds[thresholds.length - 1] - z);

  let imputedValue = 0;
  for (let i = 0; i <= thresholds.length; i++) {
    imputedValue += (i + 1) * probs[i];
  }

  return imputedValue;
}

const SKIP_CASCADE_ANA = ['07', '09', '10', '88'];
const ITEMS_WITH_SKIPPED_COVARIATE = new Set([
  'GG0170J1', 'GG0170K1', 'GG0170L1', 'GG0170N1', 'GG0170O1', 'GG0170R1', 'GG0170S1'
]);

/**
 * Applies MDS skip cascade rules to determine the effective value of a GG item.
 * Hard override: if the gate item is ANA, downstream items are forced to '^' (skipped).
 *
 * Walking:  I1 ANA → J1, K1, L1 become '^'
 * Steps:    M1 ANA → N1, O1 become '^'
 *           N1 ANA → O1 becomes '^'
 */
function getEffectiveGGValue(ggItemId, parsedValues) {
  if (['GG0170J1', 'GG0170K1', 'GG0170L1'].includes(ggItemId)) {
    if (SKIP_CASCADE_ANA.includes(parsedValues['GG0170I1'])) return '^';
  }

  if (['GG0170N1', 'GG0170O1'].includes(ggItemId)) {
    if (SKIP_CASCADE_ANA.includes(parsedValues['GG0170M1'])) return '^';
  }

  if (ggItemId === 'GG0170O1') {
    if (SKIP_CASCADE_ANA.includes(parsedValues['GG0170N1'])) return '^';
  }

  return parsedValues[ggItemId];
}

/**
 * Helper function to calculate GG item-specific covariates
 */
function getGGItemSpecificCovariate(covariateName, parsedValues, itemMultipliers = null) {
  if (covariateName.includes(" - Valid Score") || 
      covariateName.includes(" - Not Attempted") || 
      covariateName.includes(" - Skipped")) {
    
    const match = covariateName.match(/\(GG[0-9]+[A-Z][0-9]\)/);
    if (match) {
      const ggItemId = match[0].slice(1, -1);
      const rawValue = getEffectiveGGValue(ggItemId, parsedValues);
      
      if (covariateName.includes(" - Valid Score")) {
        if (rawValue && ['01', '02', '03', '04', '05', '06'].includes(rawValue)) {
          return parseInt(rawValue, 10);
        }
        return 0;
      } else if (covariateName.includes(" - Not Attempted")) {
        if (ITEMS_WITH_SKIPPED_COVARIATE.has(ggItemId)) {
          return ['07', '09', '10', '88'].includes(rawValue) ? 1 : 0;
        } else {
          return ['07', '09', '10', '88', '^'].includes(rawValue) ? 1 : 0;
        }
      } else if (covariateName.includes(" - Skipped")) {
        // Skipped: return 1 if value is ^ (skip pattern), else 0
        // Note: This covariate only exists for certain items (J1, K1, L1, N1, O1, R1, S1)
        return rawValue === '^' ? 1 : 0;
      }
    }
  }
  return null;
}

/**
 * Gets the value for a covariate (either GG item-specific or standard)
 */
function getCovariateValue(covariateName, parsedValues, summary, icdList, startScores, ardDate, itemMultipliers = null) {
  const ggItemSpecificValue = getGGItemSpecificCovariate(covariateName, parsedValues, itemMultipliers);
  if (ggItemSpecificValue !== null) {
    return ggItemSpecificValue;
  }
  
  const result = getFunctionCovariates(parsedValues, summary, icdList, startScores, ardDate);
  return result?.covariates?.[covariateName] || 0;
}

/**
 * Determines if a GG item covariate should be excluded from imputation
 * Based on CMS guidance:
 * - Don't use an item in its own imputation
 * - If Uses Wheelchair = 1, don't use Walk items (I, J, K, L)
 * - If Uses Wheelchair = 0, don't use Wheelchair items (R, S)
 */
function shouldExcludeGGItemCovariate(covariateName, itemBeingImputed, usesWheelchair) {
    // Extract GG item ID from covariate name (e.g., "Walk 10 Feet (GG0170I1) - Valid Score" -> "GG0170I1")
    const match = covariateName.match(/\(GG[0-9]+[A-Z][0-9]\)/);
    if (!match) return false;
    
    const covariateItemId = match[0].slice(1, -1); // Remove parentheses
    
    // Rule 1: Don't use an item in its own imputation
    if (covariateItemId === itemBeingImputed) {
        return true;
    }
    
    // Extract the letter from the GG item (e.g., "GG0170I1" -> "I")
    const covariateItemLetter = covariateItemId.match(/GG[0-9]+([A-Z])[0-9]/)?.[1];
    
    if (!covariateItemLetter) return false;
    
    // Rule 2: If Uses Wheelchair = 1, exclude Walk items (I, J, K, L)
    if (usesWheelchair && ['I', 'J', 'K', 'L'].includes(covariateItemLetter)) {
        return true;
    }
    
    // Rule 3: If Uses Wheelchair = 0, exclude Wheelchair items (R, S)
    if (!usesWheelchair && ['R', 'S'].includes(covariateItemLetter)) {
        return true;
    }
    
    return false;
}

/**
 * PROPRIETARY FUNCTION: calculateImputedValue
 * 
 * Calculates a single imputed value for a GG item using the proprietary algorithm.
 */
export function calculateImputedValue(ggItemId, parsedValues, summary, icdList, startScores) {
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

  // CMS statistical imputation: convert z-score to continuous expected value
  // using standard normal CDF probabilities across threshold partitions
  return computeImputedValueFromScore(imputationScore, thresholds);
}

/**
 * PROPRIETARY FUNCTION: imputeMissingGGItems
 * 
 * Imputes missing or invalid GG items using the proprietary imputation methodology.
 * This is the core batch imputation algorithm.
 */
export function imputeMissingGGItems(parsedValues, summary, icdList, startScores, targetGGItems) {
    // Get ARD date and correct version of multipliers
    const ardDate = parsedValues['A2300'];
    const imputationMultipliers = getImputationMultipliers(ardDate);
    
    // Get the standard covariates (same as used for expected score calculation)
    const { covariates } = getFunctionCovariates(parsedValues, summary, icdList, startScores, ardDate);
    
    // Determine if patient uses wheelchair (Uses Wheelchair covariate = 1 or 0)
    const usesWheelchair = covariates["Uses Wheelchair"] === 1;
    
    // Determine mobility type (same logic as ImputationTab)
    const mobilityType = determineMobilityType(parsedValues);
    
    // Define which items are walker-specific vs wheelchair-specific (same as ImputationTab)
    const walkerItems = new Set(['GG0170I1', 'GG0170J1', 'GG0170K1', 'GG0170L1', 'GG0170M1', 'GG0170N1', 'GG0170O1']);
    const wheelchairItems = new Set(['GG0170R1', 'GG0170S1']);
    
    const imputedValues = {};
    
    // Process each GG item that has imputation data
    Object.keys(imputationMultipliers).forEach(ggItemId => {
        // Filter items based on mobility type (same as ImputationTab)
        if (walkerItems.has(ggItemId) && mobilityType !== 'Walk') {
            return; // Skip walker items if not a walker
        }
        if (wheelchairItems.has(ggItemId) && mobilityType !== 'Wheel') {
            return; // Skip wheelchair items if not a wheelchair user
        }
        
        const currentValue = targetGGItems[ggItemId];
        
        // Check if the item needs imputation (missing, invalid, or not 1-6)
        const needsImputation = !currentValue || 
                               !['01', '02', '03', '04', '05', '06'].includes(currentValue);
        
        if (needsImputation) {
            const itemMultipliers = imputationMultipliers[ggItemId];
            let imputationScore = 0;
            
            // Calculate imputation score using all covariates
            Object.entries(itemMultipliers).forEach(([covariateName, multiplier]) => {
                let covariateValue = 0;
                
                // Handle GG item-specific covariates
                if (covariateName.includes('(GG') && 
                    (covariateName.includes('Valid Score') || 
                     covariateName.includes('Not Attempted') || 
                     covariateName.includes('Skipped'))) {
                    
                    // Check if this GG item covariate should be excluded
                    if (shouldExcludeGGItemCovariate(covariateName, ggItemId, usesWheelchair)) {
                        // Skip this covariate - don't add it to the imputation score
                        return;
                    }
                    
                    // Extract GG item ID from covariate name
                    const match = covariateName.match(/\(GG[0-9]+[A-Z][0-9]\)/);
                    if (match) {
                        const itemId = match[0].slice(1, -1);
                        const rawValue = getEffectiveGGValue(itemId, parsedValues);
                        
                        if (covariateName.includes('Valid Score')) {
                            // Valid score: return the actual score value (1-6) if valid
                            if (rawValue && ['01', '02', '03', '04', '05', '06'].includes(rawValue)) {
                                covariateValue = parseInt(rawValue, 10);
                            }
                        } else if (covariateName.includes('Not Attempted')) {
                            if (ITEMS_WITH_SKIPPED_COVARIATE.has(itemId)) {
                                covariateValue = ['07', '09', '10', '88'].includes(rawValue) ? 1 : 0;
                            } else {
                                covariateValue = ['07', '09', '10', '88', '^'].includes(rawValue) ? 1 : 0;
                            }
                        } else if (covariateName.includes('Skipped')) {
                            // Skipped: 1 if value is ^ (skip pattern), 0 otherwise
                            // Note: This covariate only exists for certain items (J1, K1, L1, N1, O1, R1, S1)
                            covariateValue = rawValue === '^' ? 1 : 0;
                        }
                    }
                } else {
                    // Handle standard covariates
                    const mappedCovariateName = covariateMapping[covariateName] || covariateName;
                    covariateValue = covariates[mappedCovariateName] || 0;
                }
                
                imputationScore += covariateValue * multiplier;
            });
            
            // CMS statistical imputation: convert z-score to continuous expected value
            const thresholds = getImputationThresholds(ggItemId, ardDate);
            imputedValues[ggItemId] = computeImputedValueFromScore(imputationScore, thresholds);
        }
    });
    
    return imputedValues;
}

/**
 * Gets imputation thresholds for a specific GG item based on ARD date
 * @param {string} ggItemId - The GG item ID (e.g., 'GG0130A1')
 * @param {string} ardDate - The ARD date to determine which Update ID to use
 * @returns {Array} Array of threshold values for that item
 */
export function getImputationThresholds(ggItemId, ardDate = null) {
    // Get the correct imputation multipliers based on ARD date
    const itemMultipliers = ardDate 
        ? getImputationMultipliers(ardDate)[ggItemId]
        : null;
    
    // Extract Model Threshold 1-5 from the multipliers
    if (itemMultipliers) {
        const thresholds = [
            itemMultipliers["Model Threshold 1"],
            itemMultipliers["Model Threshold 2"],
            itemMultipliers["Model Threshold 3"],
            itemMultipliers["Model Threshold 4"],
            itemMultipliers["Model Threshold 5"]
        ];
        
        // Only return if we have all 5 thresholds
        if (thresholds.every(t => typeof t === 'number')) {
            return thresholds;
        }
    }
    
    // Fallback to default thresholds if not found
    return [-0.5, 0.5, 1.5, 2.5, 3.5];
}

// Re-export shouldExcludeGGItemCovariate for convenience
export { shouldExcludeGGItemCovariate };

/**
 * PROPRIETARY FUNCTION: getImputationAnalysisData
 * 
 * Calculates imputation analysis data for all GG items for display purposes.
 * This reuses existing functions to avoid code duplication and ensures
 * the proprietary algorithm remains server-only.
 * 
 * @param {Object} parsedValues - Parsed MDS data
 * @param {Object} summary - Patient summary data
 * @param {Array} icdList - List of ICD codes
 * @param {Object} startScores - Start scores for GG items
 * @returns {Object} Analysis data for all GG items with covariates, multipliers, scores, thresholds, and imputed values
 */
export function getImputationAnalysisData(parsedValues, summary, icdList, startScores) {
  const ardDate = parsedValues['A2300'];
  const imputationMultipliers = getImputationMultipliers(ardDate);

  // Get the standard covariates (reused from existing calculation)
  const { covariates } = getFunctionCovariates(parsedValues, summary, icdList, startScores, ardDate);
  const usesWheelchair = covariates["Uses Wheelchair"] === 1;

  // Determine mobility type (reused from existing function)
  const mobilityType = determineMobilityType(parsedValues);

  // Define which items are walker-specific vs wheelchair-specific
  const walkerItems = new Set(['GG0170I1', 'GG0170J1', 'GG0170K1', 'GG0170L1', 'GG0170M1', 'GG0170N1', 'GG0170O1']);
  const wheelchairItems = new Set(['GG0170R1', 'GG0170S1']);

  const data = {};
  const ggItems = Object.keys(imputationMultipliers);

  for (const ggItemId of ggItems) {
    // Filter items based on mobility type (same logic as imputeMissingGGItems)
    if (walkerItems.has(ggItemId) && mobilityType !== 'Walk') {
      continue; // Skip walker items if not a walker
    }
    if (wheelchairItems.has(ggItemId) && mobilityType !== 'Wheel') {
      continue; // Skip wheelchair items if not a wheelchair user
    }

    const multipliers = imputationMultipliers[ggItemId];
    const thresholds = getImputationThresholds(ggItemId, ardDate);

    // Get covariates for this specific GG item (reused logic)
    const itemCovariates = {};
    let imputationScore = 0;

    // Calculate imputation score using covariate * multiplier (reused logic)
    for (const [covariateName, multiplier] of Object.entries(multipliers)) {
      // Check if this is a GG item-specific covariate that should be excluded
      if (covariateName.includes('(GG') &&
          (covariateName.includes('Valid Score') ||
           covariateName.includes('Not Attempted') ||
           covariateName.includes('Skipped'))) {

        if (shouldExcludeGGItemCovariate(covariateName, ggItemId, usesWheelchair)) {
          // Skip this covariate - don't display it or add it to the imputation score
          continue;
        }
      }

      // Get covariate value (reused function)
      const covariateValue = getCovariateValue(covariateName, parsedValues, summary, icdList, startScores, ardDate, multipliers);

      if (covariateValue !== 0) {
        itemCovariates[covariateName] = covariateValue;
        imputationScore += covariateValue * multiplier;
      }
    }

    // CMS statistical imputation: convert z-score to continuous expected value
    const imputedValue = computeImputedValueFromScore(imputationScore, thresholds);

    // Check raw MDS value to determine if imputation is needed
    const rawValue = parsedValues[ggItemId];
    const isValidValue = rawValue && ['01', '02', '03', '04', '05', '06'].includes(rawValue);
    const needsImputation = !rawValue || !isValidValue;

    data[ggItemId] = {
      covariates: itemCovariates,
      multipliers: multipliers,
      imputationScore: imputationScore,
      thresholds: thresholds,
      imputedValue: needsImputation ? imputedValue : null,
      originalValue: rawValue || null,
      needsImputation: needsImputation
    };
  }

  return data;
}
