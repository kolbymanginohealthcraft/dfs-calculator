// Score helper utilities for DFS Calculator

/**
 * Update a specific score in the scores object
 * @param {Object} scores - Current scores object
 * @param {string} category - 'selfCare' or 'mobility'
 * @param {string} key - Item key
 * @param {number} value - New score value
 * @returns {Object} - Updated scores object
 */
export const updateScore = (scores, category, key, value) => {
  return {
    ...scores,
    [category]: {
      ...scores[category],
      [key]: value
    }
  };
};

/**
 * Adjust a score by a delta value
 * @param {Object} scores - Current scores object
 * @param {string} key - Item key
 * @param {number} delta - Amount to adjust by
 * @param {Object} startScores - Start scores object for validation (optional)
 * @returns {Object} - Updated scores object
 */
import { clampScore } from './scoreCalculations';

export const adjustScore = (scores, key, delta, startScores = null) => {
  const category = getCategoryForKey(key);
  
  if (!category) return scores;
  
  const currentScore = scores[category][key] || 1;
  let newScore = clampScore(currentScore + delta);
  
  // If startScores are provided, ensure end score doesn't go below start score
  if (startScores && startScores[category] && startScores[category][key] !== undefined) {
    const startScore = startScores[category][key];
    newScore = Math.max(newScore, startScore);
  }
  
  return updateScore(scores, category, key, newScore);
};

/**
 * Get the category for a given key
 * @param {string} key - Item key
 * @returns {string|null} - Category name or null if not found
 */
import { GG_TO_BASIC_MAPPING } from './itemAdapters';
import { GG_ITEMS } from './calculations';

export const getCategoryForKey = (key) => {
  // Handle the duplicate wheelchair R item
  if (key === 'pushingWheelchairR2') {
    return 'mobility';
  }
  
  // Find the GG item for this basic key
  const ggId = Object.keys(GG_TO_BASIC_MAPPING).find(gg => GG_TO_BASIC_MAPPING[gg] === key);
  if (ggId) {
    const ggItem = GG_ITEMS.find(item => item.id === ggId);
    return ggItem ? ggItem.domain : null;
  }
  
  return null;
};

/**
 * Check if a score is at minimum value
 * @param {Object} scores - Scores object
 * @param {string} key - Item key
 * @returns {boolean} - True if score is at minimum
 */
import { SCORE_CONSTANTS } from './itemDefinitions';

export const isScoreAtMin = (scores, key) => {
  const category = getCategoryForKey(key);
  
  if (!category) return false;
  
  const score = scores[category][key];
  return score <= SCORE_CONSTANTS.MIN_SCORE;
};

/**
 * Check if a score is at maximum value
 * @param {Object} scores - Scores object
 * @param {string} key - Item key
 * @returns {boolean} - True if score is at maximum
 */
export const isScoreAtMax = (scores, key) => {
  const category = getCategoryForKey(key);
  
  if (!category) return false;
  
  const score = scores[category][key];
  return score >= SCORE_CONSTANTS.MAX_SCORE;
};

/**
 * Get the current score value for a key
 * @param {Object} scores - Scores object
 * @param {string} key - Item key
 * @returns {number} - Current score value
 */
export const getScoreValue = (scores, key) => {
  const category = getCategoryForKey(key);
  
  if (!category) return 1;
  
  return scores[category][key] || 1;
};

/**
 * Reset all scores to default values
 * @param {Object} scores - Current scores object
 * @returns {Object} - Reset scores object
 */
import { getInitialScores } from './itemDefinitions';

export const resetScoresToDefault = (scores, mobilityType = 'Walk') => {
  return getInitialScores(mobilityType);
};

/**
 * Create a deep copy of scores object
 * @param {Object} scores - Scores object to copy
 * @returns {Object} - Copied scores object
 */
export const copyScores = (scores) => {
  return {
    selfCare: { ...scores.selfCare },
    mobility: { ...scores.mobility }
  };
};

/**
 * Merge start and end scores
 * @param {Object} startScores - Start scores object
 * @param {Object} endScores - End scores object
 * @returns {Object} - Merged scores object
 */
export const mergeScores = (startScores, endScores) => {
  return {
    start: copyScores(startScores),
    end: copyScores(endScores)
  };
};

/**
 * Get all score keys from both categories
 * @param {Object} scores - Scores object
 * @returns {Array} - Array of all score keys
 */
export const getAllScoreKeys = (scores) => {
  const selfCareKeys = Object.keys(scores.selfCare || {});
  const mobilityKeys = Object.keys(scores.mobility || {});
  return [...selfCareKeys, ...mobilityKeys];
};

/**
 * Count the number of scores in the object
 * @param {Object} scores - Scores object
 * @returns {number} - Total number of scores
 */
export const countScores = (scores) => {
  const selfCareCount = Object.keys(scores.selfCare || {}).length;
  const mobilityCount = Object.keys(scores.mobility || {}).length;
  return selfCareCount + mobilityCount;
};

