/**
 * End Score Imputation - CLIENT STUB
 * 
 * This file is a stub for client-side compatibility.
 * The actual implementation is in src/utils/server/endScoreImputation.js (server-only)
 * 
 * DO NOT import end-score-coefficients here - it will be bundled into the client!
 */

// Stub functions (should never be called client-side)
export function getEndScoreImputationMultipliers(ggItemId, ardDate) {
  console.warn('getEndScoreImputationMultipliers called client-side - this should not happen');
  return null;
}

export function getEndScoreImputationThresholds(ggItemId, ardDate) {
  console.warn('getEndScoreImputationThresholds called client-side - this should not happen');
  return null;
}

export async function calculateEndScoreImputedValue(ggItemId, parsedValues, summary, icdList, startScores) {
  console.warn('calculateEndScoreImputedValue called client-side - this should not happen');
  return "01";
}

export async function imputeMissingEndScoreGGItems(parsedValues, summary, icdList, startScores, targetEndScoreItems) {
  console.warn('imputeMissingEndScoreGGItems called client-side - this should not happen');
  return {};
}
