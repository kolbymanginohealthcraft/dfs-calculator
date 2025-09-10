// Centralized item definitions for DFS Calculator
// This file contains all the item definitions used across different screens

export const itemDefs = {
  selfCare: [
    { key: 'eating', label: 'A. Eating', contributing: true },
    { key: 'oralHygiene', label: 'B. Oral Hygiene', contributing: true },
    { key: 'toiletingHygiene', label: 'C. Toileting Hygiene', contributing: true },
    { key: 'showerBathe', label: 'D. Shower/Bathe Self', contributing: false },
    { key: 'upperBodyDressing', label: 'E. Upper Body Dressing', contributing: false },
    { key: 'lowerBodyDressing', label: 'F. Lower Body Dressing', contributing: false },
    { key: 'footwear', label: 'G. Putting on/Taking off Footwear', contributing: false },
  ],
  mobility: [
    { key: 'rollLeftRight', label: 'A. Roll Left and Right', walk: true, wheel: true },
    { key: 'sitToLying', label: 'B. Sit to Lying', walk: false, wheel: false },
    { key: 'lyingToSitting', label: 'C. Lying to Sitting on Side of Bed', walk: true, wheel: true },
    { key: 'sitToStand', label: 'D. Sit to Stand', walk: true, wheel: true },
    { key: 'chairBedTransfer', label: 'E. Chair/Bed-to-Chair Transfer', walk: true, wheel: true },
    { key: 'toiletTransfer', label: 'F. Toilet Transfer', walk: true, wheel: true },
    { key: 'carTransfer', label: 'G. Car Transfer', walk: false, wheel: false },
    { key: 'walk10Feet', label: 'H. Walk 10 Feet', walk: false, wheel: false },
    { key: 'walk50Feet', label: 'I. Walk 50 Feet with Two Turns', walk: true, wheel: false },
    { key: 'walk150Feet', label: 'J. Walk 150 Feet', walk: true, wheel: false },
    { key: 'walkUneven', label: 'K. Walking 10 Feet on Uneven Surfaces', walk: false, wheel: false },
    { key: 'stepCurb', label: 'L. 1 Step (Curb)', walk: false, wheel: false },
    { key: 'fourSteps', label: 'M. 4 Steps', walk: false, wheel: false },
    { key: 'twelveSteps', label: 'N. 12 Steps', walk: false, wheel: false },
    { key: 'pickingObject', label: 'O. Picking up Object', walk: false, wheel: false },
    { key: 'carryingObject', label: 'P. Carrying Object', walk: false, wheel: false },
    { key: 'pushingWheelchairR', label: 'R. Wheel 50 Feet with Two Turns', walk: false, wheel: true },
  ],
};

// Score constants
export const SCORE_CONSTANTS = {
  DEFAULT_SCORE: 1,
  MIN_SCORE: 1,
  MAX_SCORE: 6,
};

// Get all keys for both categories
export const getAllKeys = () => ({
  selfCare: itemDefs.selfCare.map(i => i.key),
  mobility: itemDefs.mobility.map(i => i.key),
});

// Get contributing items based on mobility type
export const getMobilityContributing = (mobilityType) => {
  const items = itemDefs.mobility.filter(item => (mobilityType === 'Walk' ? item.walk : item.wheel));
  // For wheelchair, item R is counted twice
  if (mobilityType === 'Wheel') {
    const rItem = items.find(item => item.key === 'pushingWheelchairR');
    if (rItem) {
      items.push({ ...rItem, key: 'pushingWheelchairR2' }); // Duplicate for second count
    }
  }
  return items;
};

// Get contributing self-care items
export const getSelfCareContributing = () =>
  itemDefs.selfCare.filter(item => item.contributing);

// Get contributing keys for both categories
export const getContributingKeys = (mobilityType) => {
  const selfCareKeys = getSelfCareContributing().map(i => i.key);
  const mobilityItems = getMobilityContributing(mobilityType);
  const mobilityKeys = mobilityItems.map(i => i.key);
  
  return {
    selfCare: selfCareKeys,
    mobility: mobilityKeys
  };
};

// Initialize default scores
export const getInitialScores = () => {
  const allKeys = getAllKeys();
  return {
    selfCare: Object.fromEntries(allKeys.selfCare.map(k => [k, SCORE_CONSTANTS.DEFAULT_SCORE])),
    mobility: Object.fromEntries(allKeys.mobility.map(k => [k, SCORE_CONSTANTS.DEFAULT_SCORE])),
  };
};
