// All calculations now handled server-side
// coefficientLoader is server-only - import directly (this file is server-only via server.js)
import { getImputationMultipliers } from './server/coefficientLoader.js';
import { covariateMapping } from './covariateMapping.js';

/**
 * Determines if a GG item covariate should be excluded from imputation
 * Based on CMS guidance:
 * - Don't use an item in its own imputation
 * - If Uses Wheelchair = 1, don't use Walk items (I, J, K, L)
 * - If Uses Wheelchair = 0, don't use Wheelchair items (R, S)
 * 
 * @param {string} covariateName - The covariate name
 * @param {string} itemBeingImputed - The GG item ID being imputed (e.g., 'GG0170J1')
 * @param {boolean} usesWheelchair - Whether the patient uses a wheelchair
 * @returns {boolean} True if the covariate should be excluded
 */
export function shouldExcludeGGItemCovariate(covariateName, itemBeingImputed, usesWheelchair) {
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
 * Imputes missing or invalid GG items using the imputation methodology
 * @param {Object} parsedValues - The parsed MDS values
 * @param {Object} summary - Patient summary data
 * @param {Array} icdList - List of ICD codes
 * @param {Object} startScores - Start scores for admission function calculation
 * @param {Object} targetGGItems - Object with GG item IDs as keys and their current values
 * @returns {Object} Object with imputed values for missing/invalid GG items
 */
export function imputeMissingGGItems(parsedValues, summary, icdList, startScores, targetGGItems) {
    // Get ARD date and correct version of multipliers
    const ardDate = parsedValues['A2300'];
    const imputationMultipliers = getImputationMultipliers(ardDate);
    
    // Get the standard covariates (same as used for expected score calculation)
    const { covariates } = getFunctionCovariates(parsedValues, summary, icdList, startScores, ardDate);
    
    // Determine if patient uses wheelchair (Uses Wheelchair covariate = 1 or 0)
    const usesWheelchair = covariates["Uses Wheelchair"] === 1;
    
    const imputedValues = {};
    
    // Process each GG item that has imputation data
    Object.keys(imputationMultipliers).forEach(ggItemId => {
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
                        const rawValue = targetGGItems[itemId];
                        
                        if (covariateName.includes('Valid Score')) {
                            // Valid score: return the actual score value (1-6) if valid
                            if (rawValue && ['01', '02', '03', '04', '05', '06'].includes(rawValue)) {
                                covariateValue = parseInt(rawValue, 10);
                            }
                        } else if (covariateName.includes('Not Attempted')) {
                            // Not attempted: 1 if value is any ANA value (07, 08, 09, 10, 88)
                            // For items WITHOUT a separate "Skipped" covariate, ^ is also treated as Not Attempted
                            const hasSkippedCovariate = Object.keys(itemMultipliers).some(key => 
                                key.includes(itemId) && key.includes('Skipped')
                            );
                            
                            if (hasSkippedCovariate) {
                                // If item has a Skipped covariate, only count ANA values as Not Attempted
                                covariateValue = ['07', '08', '09', '10', '88'].includes(rawValue) ? 1 : 0;
                            } else {
                                // If no Skipped covariate, treat ^ as Not Attempted too
                                covariateValue = ['07', '08', '09', '10', '88', '^'].includes(rawValue) ? 1 : 0;
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
            
            // Convert imputation score to GG item value (1-6)
            // This uses the threshold values from the Excel file
            const imputedValue = convertImputationScoreToGGValue(imputationScore);
            imputedValues[ggItemId] = imputedValue;
        }
    });
    
    return imputedValues;
}

/**
 * Converts an imputation score to a GG item value (1-6) using threshold values
 * @param {number} score - The calculated imputation score
 * @returns {string} The GG item value as a string ('01' to '06')
 */
function convertImputationScoreToGGValue(score) {
    // These are the threshold values from the Excel file for each GG item
    // For now, we'll use a general approach. In practice, you might want to
    // use item-specific thresholds
    
    // General thresholds (you may want to make these item-specific)
    const thresholds = [
        -Infinity,  // Below this = 1
        0.5,        // 1-2 threshold
        1.5,        // 2-3 threshold  
        2.5,        // 3-4 threshold
        3.5,        // 4-5 threshold
        4.5         // 5-6 threshold
    ];
    
    let ggValue = 1;
    for (let i = 0; i < thresholds.length; i++) {
        if (score >= thresholds[i]) {
            ggValue = i + 1;
        } else {
            break;
        }
    }
    
    // Convert to string format with leading zero
    return ggValue.toString().padStart(2, '0');
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

/**
 * Converts an imputation score to a GG item value using item-specific thresholds
 * @param {number} score - The calculated imputation score
 * @param {string} ggItemId - The GG item ID
 * @param {string} ardDate - The ARD date to determine which Update ID to use
 * @returns {string} The GG item value as a string ('01' to '06')
 */
export function convertImputationScoreToGGValueWithThresholds(score, ggItemId, ardDate = null) {
    const thresholds = getImputationThresholds(ggItemId, ardDate);
    
    // Determine which category the score falls into
    if (score < thresholds[0]) return '01'; // 1
    if (score < thresholds[1]) return '02'; // 2
    if (score < thresholds[2]) return '03'; // 3
    if (score < thresholds[3]) return '04'; // 4
    if (score < thresholds[4]) return '05'; // 5
    return '06'; // 6
}

/**
 * Enhanced imputation function that uses item-specific thresholds
 * @param {Object} parsedValues - The parsed MDS values
 * @param {Object} summary - Patient summary data
 * @param {Array} icdList - List of ICD codes
 * @param {Object} startScores - Start scores for admission function calculation
 * @param {Object} targetGGItems - Object with GG item IDs as keys and their current values
 * @returns {Object} Object with imputed values for missing/invalid GG items
 */
export function imputeMissingGGItemsWithThresholds(parsedValues, summary, icdList, startScores, targetGGItems) {
    // Get ARD date and correct version of multipliers
    const ardDate = parsedValues['A2300'];
    const imputationMultipliers = getImputationMultipliers(ardDate);
    
    // Get the standard covariates (same as used for expected score calculation)
    const { covariates } = getFunctionCovariates(parsedValues, summary, icdList, startScores, ardDate);
    
    // Determine if patient uses wheelchair (Uses Wheelchair covariate = 1 or 0)
    const usesWheelchair = covariates["Uses Wheelchair"] === 1;
    
    const imputedValues = {};
    
    // Process each GG item that has imputation data
    Object.keys(imputationMultipliers).forEach(ggItemId => {
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
                        const rawValue = targetGGItems[itemId];
                        
                        if (covariateName.includes('Valid Score')) {
                            // Valid score: return the actual score value (1-6) if valid
                            if (rawValue && ['01', '02', '03', '04', '05', '06'].includes(rawValue)) {
                                covariateValue = parseInt(rawValue, 10);
                            }
                        } else if (covariateName.includes('Not Attempted')) {
                            // Not attempted: 1 if value is any ANA value (07, 08, 09, 10, 88)
                            // For items WITHOUT a separate "Skipped" covariate, ^ is also treated as Not Attempted
                            const hasSkippedCovariate = Object.keys(itemMultipliers).some(key => 
                                key.includes(itemId) && key.includes('Skipped')
                            );
                            
                            if (hasSkippedCovariate) {
                                // If item has a Skipped covariate, only count ANA values as Not Attempted
                                covariateValue = ['07', '08', '09', '10', '88'].includes(rawValue) ? 1 : 0;
                            } else {
                                // If no Skipped covariate, treat ^ as Not Attempted too
                                covariateValue = ['07', '08', '09', '10', '88', '^'].includes(rawValue) ? 1 : 0;
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
            
            // Convert imputation score to GG item value using item-specific thresholds
            const imputedValue = convertImputationScoreToGGValueWithThresholds(imputationScore, ggItemId, ardDate);
            imputedValues[ggItemId] = imputedValue;
        }
    });
    
    return imputedValues;
}
