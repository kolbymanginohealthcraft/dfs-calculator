// Note: getFunctionCovariates is now server-only (removed from client bundle)
// All proprietary functions in this file have been moved to server-side

// Server-only function - will throw if called client-side
// Implementation is in api/utils/serverCalculations.js
function getFunctionCovariates() {
  throw new Error(
    'getFunctionCovariates() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 * 
 * This function contains proprietary imputation logic and has been moved
 * to api/utils/serverImputation.js to prevent reverse engineering.
 * 
 * Use the secure API client instead:
 * 
 * import { batchImputeValues } from '../utils/secureApiClient';
 * const result = await batchImputeValues({ ... });
 * 
 * This function is ONLY available server-side and will NEVER be bundled into client code.
 */
export function imputeMissingGGItems(parsedValues, summary, icdList, startScores, targetGGItems) {
  // This function has been removed from client bundle to protect proprietary IP
  // All implementation is in api/utils/serverImputation.js
  throw new Error(
    'imputeMissingGGItems() is server-only. Use batchImputeValues() from secureApiClient.js instead. ' +
    'This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 * 
 * This function has been moved to api/utils/serverImputation.js to prevent reverse engineering.
 */
export function getImputationThresholds(ggItemId, ardDate = null) {
  // This function has been removed from client bundle to protect proprietary IP
  // Implementation is in api/utils/serverImputation.js
  throw new Error(
    'getImputationThresholds() is server-only. This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 * 
 * This function has been moved to api/utils/serverImputation.js to prevent reverse engineering.
 * 
 * Use the secure API client instead:
 * 
 * import { batchImputeValues } from '../utils/secureApiClient';
 * const result = await batchImputeValues({ ... });
 */
export function convertImputationScoreToGGValueWithThresholds(score, ggItemId, ardDate = null) {
  // This function has been removed from client bundle to protect proprietary IP
  // All implementation is in api/utils/serverImputation.js
  throw new Error(
    'convertImputationScoreToGGValueWithThresholds() is server-only. Use batchImputeValues() from secureApiClient.js instead. ' +
    'This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}

/**
 * ⚠️ PROPRIETARY FUNCTION - REMOVED FROM CLIENT BUNDLE ⚠️
 * 
 * This function contains proprietary imputation logic and has been moved
 * to api/utils/serverImputation.js to prevent reverse engineering.
 * 
 * Use the secure API client instead:
 * 
 * import { batchImputeValues } from '../utils/secureApiClient';
 * const result = await batchImputeValues({ ... });
 * 
 * This function is ONLY available server-side and will NEVER be bundled into client code.
 */
export function imputeMissingGGItemsWithThresholds(parsedValues, summary, icdList, startScores, targetGGItems) {
  // This function has been removed from client bundle to protect proprietary IP
  // All implementation is in api/utils/serverImputation.js
  throw new Error(
    'imputeMissingGGItemsWithThresholds() is server-only. Use batchImputeValues() from secureApiClient.js instead. ' +
    'This function has been removed from the client bundle to protect proprietary intellectual property.'
  );
}
