// Centralized item definitions for DFS Calculator
// This file now uses the unified GG_ITEMS structure from the advanced version
// while maintaining backward compatibility with the basic version

// All calculations now handled server-side
import { convertBasicItemsToGG, getBasicContributingKeys } from './itemAdapters.js';

// Note: itemDefs has been removed - basic mode now uses unified GG_ITEMS descriptions
// via getBasicContributingItems() function in itemAdapters.js

// Score constants
export const SCORE_CONSTANTS = {
  DEFAULT_SCORE: 1,
  MIN_SCORE: 1,
  MAX_SCORE: 6,
};

// Note: getAllKeys has been removed - use getBasicContributingKeys() from itemAdapters.js

// Note: getMobilityContributing and getSelfCareContributing have been removed
// Basic mode now uses getBasicContributingItems() from itemAdapters.js

// Get contributing keys for both categories
// Now uses the unified GG_ITEMS logic for consistency
export const getContributingKeys = (mobilityType) => {
  return getBasicContributingKeys(mobilityType);
};

// Initialize default scores - only for contributing items
export const getInitialScores = (mobilityType = 'Walk') => {
  const contributingKeys = getContributingKeys(mobilityType);
  return {
    selfCare: Object.fromEntries(contributingKeys.selfCare.map(k => [k, SCORE_CONSTANTS.DEFAULT_SCORE])),
    mobility: Object.fromEntries(contributingKeys.mobility.map(k => [k, SCORE_CONSTANTS.DEFAULT_SCORE])),
  };
};
