import { getFunctionCovariates } from './calculations.js';
import { getImputationMultipliers } from './coefficientLoader.js';
import { covariateMapping } from './covariateMapping.js';

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
                            // Not attempted: 1 if value is any ANA value (07, 08, 09, 10, 88), 0 otherwise
                            covariateValue = ['07', '08', '09', '10', '88'].includes(rawValue) ? 1 : 0;
                        } else if (covariateName.includes('Skipped')) {
                            // Skipped: 1 if value is ^ (skip pattern), 0 otherwise
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
 * Gets imputation thresholds for a specific GG item
 * @param {string} ggItemId - The GG item ID (e.g., 'GG0130A1')
 * @returns {Array} Array of threshold values for that item
 */
export function getImputationThresholds(ggItemId) {
    // These are the actual threshold values from the Excel file
    const thresholds = {
        'GG0130A1': [-0.1123, 0.6144, 1.3938, 2.5248, 4.3795],
        'GG0130B1': [1.4879, 2.5838, 3.8326, 5.0506, 6.7074],
        'GG0130C1': [2.8737, 4.5488, 6.3553, 8.1051, 8.6432],
        'GG0170A1': [2.3401, 4.2169, 6.2126, 7.9598, 8.2783],
        'GG0170C1': [4.2872, 7.2511, 10.435, 13.6939, 14.7376],
        'GG0170D1': [4.304, 6.7892, 10.0151, 13.5503, 14.3346],
        'GG0170E1': [5.3876, 7.8085, 11.2353, 15.3698, 16.4788],
        'GG0170F1': [5.0562, 7.3647, 10.3898, 13.8425, 14.7658],
        'GG0170I1': [3.9142, 4.6879, 6.7485, 10.1968, 10.6805],
        'GG0170J1': [6.1533, 6.6822, 8.6952, 12.692, 13.5531],
        'GG0170R1': [3.339, 4.3719, 5.4746, 6.8456, 7.4021]
    };
    
    return thresholds[ggItemId] || [-0.5, 0.5, 1.5, 2.5, 3.5];
}

/**
 * Converts an imputation score to a GG item value using item-specific thresholds
 * @param {number} score - The calculated imputation score
 * @param {string} ggItemId - The GG item ID
 * @returns {string} The GG item value as a string ('01' to '06')
 */
export function convertImputationScoreToGGValueWithThresholds(score, ggItemId) {
    const thresholds = getImputationThresholds(ggItemId);
    
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
                            // Not attempted: 1 if value is any ANA value (07, 08, 09, 10, 88), 0 otherwise
                            covariateValue = ['07', '08', '09', '10', '88'].includes(rawValue) ? 1 : 0;
                        } else if (covariateName.includes('Skipped')) {
                            // Skipped: 1 if value is ^ (skip pattern), 0 otherwise
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
            const imputedValue = convertImputationScoreToGGValueWithThresholds(imputationScore, ggItemId);
            imputedValues[ggItemId] = imputedValue;
        }
    });
    
    return imputedValues;
}
