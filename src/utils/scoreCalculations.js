// Score calculation utilities for DFS Calculator
// Now uses the unified GG_ITEMS structure for consistency

import { convertBasicScoresToGG, getContributingGGItems } from './itemAdapters';
import { calculateFunctionScore } from './calculations';

/**
 * Calculate the total score for a category
 * @param {Object} scores - Object with category scores
 * @param {Array} contributingKeys - Array of contributing item keys
 * @returns {number} - Total score
 */
export const calculateCategoryTotal = (scores, contributingKeys) => {
  return contributingKeys.reduce((total, key) => {
    // Handle the duplicate R item for wheelchair
    if (key === 'pushingWheelchairR2') {
      return total + (scores['pushingWheelchairR'] || 0);
    }
    return total + (scores[key] || 0);
  }, 0);
};

/**
 * Calculate the total DFS score
 * @param {Object} scores - Object with selfCare and mobility scores
 * @param {string} mobilityType - 'Walk' or 'Wheel'
 * @returns {number} - Total DFS score
 */
import { getContributingKeys } from './itemDefinitions';

export const calculateTotalScore = (scores, mobilityType) => {
  // Convert basic scores to GG format and use advanced calculation
  const ggScores = convertBasicScoresToGG(scores);
  return calculateFunctionScore(ggScores, mobilityType);
};

/**
 * Calculate the end total score
 * @param {Object} endScores - End scores object
 * @param {string} mobilityType - 'Walk' or 'Wheel'
 * @returns {number} - End total score
 */
export const calculateEndTotal = (endScores, mobilityType) => {
  return calculateTotalScore(endScores, mobilityType);
};

/**
 * Check if scores have been changed from default
 * @param {Object} scores - Scores object
 * @returns {boolean} - True if scores have been changed
 */
import { SCORE_CONSTANTS } from './itemDefinitions';

export const hasChangedScores = (scores) => {
  const checkCategory = (categoryScores) => {
    return Object.values(categoryScores).some(score => score !== SCORE_CONSTANTS.DEFAULT_SCORE);
  };
  
  return checkCategory(scores.selfCare) || checkCategory(scores.mobility);
};

/**
 * Check if there's any meaningful data that would be lost when going home
 * @param {Object} startScores - Start scores object
 * @param {number} startTotal - Start total score
 * @param {number} expectedScore - Expected score
 * @param {Object} endScores - End scores object (optional)
 * @param {number} endTotal - End total score (optional)
 * @returns {boolean} - True if there's meaningful data to preserve
 */
export const hasMeaningfulData = (startScores, startTotal, expectedScore, endScores = null, endTotal = null) => {
  // Check if start scores are more than default (indicating user has set meaningful start scores)
  const hasCustomStartScores = startScores && hasChangedScores(startScores);
  
  // Check if start total is more than 10 (indicating meaningful start data)
  const hasMeaningfulStartTotal = startTotal && startTotal > 10;
  
  // Check if there's a required gain (expected score > start total)
  const hasRequiredGain = expectedScore && startTotal && (expectedScore - startTotal) > 0;
  
  // Check if there are end scores that differ from start scores
  const hasEndScores = endScores && endTotal;
  const hasEndScoreChanges = hasEndScores && endTotal > startTotal;
  
  return hasCustomStartScores || hasMeaningfulStartTotal || hasRequiredGain || hasEndScoreChanges;
};

/**
 * Calculate the difference between start and end scores
 * @param {number} startTotal - Start total score
 * @param {number} endTotal - End total score
 * @returns {number} - Score difference
 */
export const calculateScoreDifference = (startTotal, endTotal) => {
  return endTotal - startTotal;
};

/**
 * Calculate the percentage change between start and end scores
 * @param {number} startTotal - Start total score
 * @param {number} endTotal - End total score
 * @returns {number} - Percentage change
 */
export const calculatePercentageChange = (startTotal, endTotal) => {
  if (startTotal === 0) return 0;
  return Math.round(((endTotal - startTotal) / startTotal) * 100);
};

/**
 * Calculate expected score based on start total and mobility type
 * @param {number} startTotal - Start total score
 * @param {string} mobilityType - 'Walk' or 'Wheel'
 * @returns {number} - Expected score
 */
export const calculateExpectedScore = (startTotal, mobilityType) => {
  // Start at exactly the start total
  return startTotal;
};

/**
 * Validate if a score is within valid range
 * @param {number} score - Score to validate
 * @returns {boolean} - True if score is valid
 */
export const isValidScore = (score) => {
  return score >= SCORE_CONSTANTS.MIN_SCORE && score <= SCORE_CONSTANTS.MAX_SCORE;
};

/**
 * Clamp a score to valid range
 * @param {number} score - Score to clamp
 * @returns {number} - Clamped score
 */
export const clampScore = (score) => {
  return Math.max(SCORE_CONSTANTS.MIN_SCORE, Math.min(SCORE_CONSTANTS.MAX_SCORE, score));
};
