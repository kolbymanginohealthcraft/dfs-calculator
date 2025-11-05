/**
 * End Score Imputation Utilities
 * 
 * Provides functions for imputing missing end scores using
 * end score-specific multipliers and thresholds.
 * 
 * ⚠️ NOTE: This file uses secure API calls for proprietary logic.
 */

import endScoreCoefficients from '../data/end-score-coefficients.json' with { type: 'json' };
import { calculateFunctionScore } from './secureApiClient.js';

/**
 * Get end score imputation multipliers for a specific GG item and ARD date
 * @param {string} ggItemId - The GG item ID (e.g., 'GG0130A3')
 * @param {string} ardDate - The assessment reference date
 * @returns {Object|null} Object containing multipliers or null if not found
 */
export function getEndScoreImputationMultipliers(ggItemId, ardDate) {
  if (!ardDate) return null;
  
  // Find the appropriate update ID based on ARD date
  const updateId = findUpdateIdForDate(ardDate);
  if (!updateId) return null;
  
  const multipliers = endScoreCoefficients.endScoreImputationMultipliers[updateId];
  if (!multipliers) return null;
  
  return multipliers[ggItemId] || null;
}

/**
 * Get end score imputation thresholds for a specific GG item and ARD date
 * @param {string} ggItemId - The GG item ID (e.g., 'GG0130A3')
 * @param {string} ardDate - The assessment reference date
 * @returns {Array|null} Array of thresholds or null if not found
 */
export function getEndScoreImputationThresholds(ggItemId, ardDate) {
  if (!ardDate) return null;
  
  // Find the appropriate update ID based on ARD date
  const updateId = findUpdateIdForDate(ardDate);
  if (!updateId) return null;
  
  const thresholds = endScoreCoefficients.endScoreThresholds[updateId];
  if (!thresholds) return null;
  
  return thresholds[ggItemId] || null;
}

/**
 * Find the appropriate update ID for a given ARD date
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

/**
 * Calculate imputed end score value for a specific GG item
 * @param {string} ggItemId - The GG item ID (e.g., 'GG0130A3')
 * @param {Object} parsedValues - The parsed MDS values
 * @param {Object} summary - Patient summary data
 * @param {Array} icdList - List of ICD codes
 * @param {Object} startScores - Start scores for admission function calculation
 * @returns {Promise<string>} The imputed value in GG item format (01-06)
 */
export async function calculateEndScoreImputedValue(ggItemId, parsedValues, summary, icdList, startScores) {
  const ardDate = parsedValues['A2300'];
  const multipliers = getEndScoreImputationMultipliers(ggItemId, ardDate);
  const thresholds = getEndScoreImputationThresholds(ggItemId, ardDate);
  
  if (!multipliers || !thresholds) {
    return "01"; // Default fallback
  }
  
  // Get covariates using secure API to determine Uses Wheelchair value
  const result = await calculateFunctionScore({
    parsedValues,
    summary,
    icdList,
    startScores,
    ardDate
  });
  const covariates = result.covariates || {};
  const usesWheelchair = covariates["Uses Wheelchair"] === 1;
  
  let imputationScore = 0;

  // Calculate imputation score using covariate * multiplier
  for (const [covariateName, multiplier] of Object.entries(multipliers)) {
    // Check if this is a GG item-specific covariate that should be excluded
    if (covariateName.includes('(GG') && 
        (covariateName.includes('Valid Score') || 
         covariateName.includes('Not Attempted') || 
         covariateName.includes('Skipped'))) {
      
      const { shouldExcludeGGItemCovariate } = await import('./imputationCalculations.js');
      if (shouldExcludeGGItemCovariate(covariateName, ggItemId, usesWheelchair)) {
        // Skip this covariate
        continue;
      }
    }
    
    // Get covariate value from the covariates object returned by secure API
    // For GG item-specific covariates, we need to calculate them separately
    // For now, use the covariate value from the API result, or calculate GG-specific ones locally
    let covariateValue = 0;
    
    // Try to get from API result first
    if (covariates[covariateName] !== undefined) {
      covariateValue = covariates[covariateName];
    } else {
      // For GG item-specific covariates, calculate them (this is non-proprietary logic)
      const { getGGItemSpecificCovariate } = await import('./fileParser.js');
      if (getGGItemSpecificCovariate) {
        const ggSpecificValue = getGGItemSpecificCovariate(covariateName, parsedValues, multipliers);
        covariateValue = ggSpecificValue !== null ? ggSpecificValue : 0;
      }
    }
    
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
}

/**
 * Impute missing end score GG items using end score-specific methodology
 * @param {Object} parsedValues - The parsed MDS values
 * @param {Object} summary - Patient summary data
 * @param {Array} icdList - List of ICD codes
 * @param {Object} startScores - Start scores for admission function calculation
 * @param {Object} targetEndScoreItems - Object with GG item IDs as keys and their current values
 * @returns {Object} Object with imputed values for missing/invalid end score GG items
 */
export async function imputeMissingEndScoreGGItems(parsedValues, summary, icdList, startScores, targetEndScoreItems) {
  const ardDate = parsedValues['A2300'];
  const endScoreMultipliers = getEndScoreImputationMultipliers('GG0130A3', ardDate); // Check if we have end score data
  
  if (!endScoreMultipliers) {
    // Fall back to start score imputation if no end score multipliers available
    // Use secure API for batch imputation
    const { batchImputeValues } = await import('./secureApiClient.js');
    const result = await batchImputeValues({
      targetGGItems: targetEndScoreItems,
      parsedValues,
      summary,
      icdList,
      startScores,
      ardDate
    });
    return result.imputedValues || {};
  }
  
  // Get the standard covariates using secure API (same as used for expected score calculation)
  const result = await calculateFunctionScore({
    parsedValues,
    summary,
    icdList,
    startScores,
    ardDate
  });
  const covariates = result.covariates || {};

  // Determine if patient uses wheelchair (Uses Wheelchair covariate = 1 or 0)
  const usesWheelchair = covariates["Uses Wheelchair"] === 1;
  
  const imputedValues = {};
  
  // Process each end score GG item that has imputation data
  const { GG_ITEMS } = await import('./calculations.js');
  for (const item of GG_ITEMS) {
    const endScoreItemId = item.id + '3'; // End score items have digit 3
    const currentValue = targetEndScoreItems[endScoreItemId];
    
    // Check if the item needs imputation (missing, invalid, or not 1-6)
    const needsImputation = !currentValue || 
                           !['01', '02', '03', '04', '05', '06'].includes(currentValue);
    
    if (needsImputation) {
      const itemMultipliers = getEndScoreImputationMultipliers(endScoreItemId, ardDate);
      if (itemMultipliers) {
        let imputationScore = 0;
        
        // Calculate imputation score using all covariates
        for (const [covariateName, multiplier] of Object.entries(itemMultipliers)) {
          let covariateValue = 0;
          
          // Handle GG item-specific covariates
          if (covariateName.includes('(GG') && 
              (covariateName.includes('Valid Score') || 
               covariateName.includes('Not Attempted') || 
               covariateName.includes('Skipped'))) {
            
            const { shouldExcludeGGItemCovariate } = await import('./imputationCalculations.js');
            if (shouldExcludeGGItemCovariate(covariateName, endScoreItemId, usesWheelchair)) {
              continue; // Skip this covariate
            }
          }
          
          // Get covariate value from API result or calculate GG-specific ones
          let covariateValue = 0;
          
          // Try to get from API result first
          if (covariates[covariateName] !== undefined) {
            covariateValue = covariates[covariateName];
          } else {
            // For GG item-specific covariates, calculate them (this is non-proprietary logic)
            const { getGGItemSpecificCovariate } = await import('./fileParser.js');
            if (getGGItemSpecificCovariate) {
              const ggSpecificValue = getGGItemSpecificCovariate(covariateName, parsedValues, itemMultipliers);
              covariateValue = ggSpecificValue !== null ? ggSpecificValue : 0;
            }
          }
          
          imputationScore += covariateValue * multiplier;
        }
        
        // Apply thresholds to determine final imputed value
        const thresholds = getEndScoreImputationThresholds(endScoreItemId, ardDate);
        if (thresholds) {
          let imputedValue = 1; // Default to 1
          for (let i = 0; i < thresholds.length; i++) {
            if (imputationScore > thresholds[i]) {
              imputedValue = i + 2; // 2, 3, 4, 5, 6
            }
          }
          
          // Convert to GG item format (01-06)
          imputedValues[endScoreItemId] = imputedValue.toString().padStart(2, '0');
        }
      }
    }
  }
  
  return imputedValues;
}
