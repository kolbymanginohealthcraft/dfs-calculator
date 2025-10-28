/**
 * Optimistic Calculation Utilities
 * 
 * Provides fast client-side calculations that closely match
 * server-side logic for immediate UI feedback
 */

/**
 * Calculate optimistic total score for immediate UI feedback
 * This uses a simplified version of the server-side calculation
 * to provide instant visual feedback while the real calculation happens in background
 */
export function calculateOptimisticTotal(scores, mobilityType = 'Walk') {
  if (!scores || !scores.selfCare || !scores.mobility) {
    return 0;
  }

  // Basic score calculation - sum of all contributing items
  const selfCareTotal = Object.values(scores.selfCare).reduce((sum, score) => sum + (score || 0), 0);
  const mobilityTotal = Object.values(scores.mobility).reduce((sum, score) => sum + (score || 0), 0);
  
  // Apply basic mobility type adjustment
  let total = selfCareTotal + mobilityTotal;
  
  // Simple mobility type adjustments (simplified from server logic)
  if (mobilityType === 'Wheel') {
    // Wheelchair users typically have slightly different scoring
    // This is a simplified approximation
    total = Math.round(total * 0.95);
  }
  
  // Cap at 60 (maximum possible score)
  return Math.min(Math.max(total, 0), 60);
}

/**
 * Calculate optimistic expected score
 * This is typically the same as start score for basic mode
 */
export function calculateOptimisticExpected(startTotal, mobilityType = 'Walk') {
  return startTotal;
}

/**
 * Calculate optimistic end score
 * This is typically the same as the current end scores total
 */
export function calculateOptimisticEnd(endScores, mobilityType = 'Walk') {
  return calculateOptimisticTotal(endScores, mobilityType);
}

/**
 * Check if optimistic calculation is close enough to server result
 * Used to determine if we need to update the UI with server results
 */
export function isOptimisticCloseEnough(optimistic, server, tolerance = 1) {
  return Math.abs(optimistic - server) <= tolerance;
}

/**
 * Get optimistic score difference for comparison displays
 */
export function calculateOptimisticDifference(startTotal, endTotal) {
  return endTotal - startTotal;
}

/**
 * Get optimistic percentage change
 */
export function calculateOptimisticPercentageChange(startTotal, endTotal) {
  if (startTotal === 0) return 0;
  return Math.round(((endTotal - startTotal) / startTotal) * 100);
}
