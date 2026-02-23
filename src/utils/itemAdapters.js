// Adapter functions to bridge basic version itemDefs with advanced version GG_ITEMS
// This allows the basic version to use the unified GG_ITEMS structure while maintaining compatibility

import { GG_ITEMS, scoreMap, resolveScore } from './calculations';

// Mapping from basic version keys to GG_ITEMS IDs
export const BASIC_TO_GG_MAPPING = {
  // Self-care items
  eating: 'GG0130A',
  oralHygiene: 'GG0130B', 
  toiletingHygiene: 'GG0130C',
  showerBathe: 'GG0130E',
  upperBodyDressing: 'GG0130F',
  lowerBodyDressing: 'GG0130G',
  footwear: 'GG0130H',
  
  // Mobility items
  rollLeftRight: 'GG0170A',
  sitToLying: 'GG0170B',
  lyingToSitting: 'GG0170C',
  sitToStand: 'GG0170D',
  chairBedTransfer: 'GG0170E',
  toiletTransfer: 'GG0170F',
  carTransfer: 'GG0170G',
  walk10Feet: 'GG0170I',
  walk50Feet: 'GG0170J',
  walk150Feet: 'GG0170K',
  walkUneven: 'GG0170L',
  stepCurb: 'GG0170M',
  fourSteps: 'GG0170N',
  twelveSteps: 'GG0170O',
  pickingObject: 'GG0170P',
  carryingObject: 'GG0170P', // Note: carryingObject maps to same as pickingObject
  pushingWheelchairR: 'GG0170R',
};

// Reverse mapping from GG_ITEMS IDs to basic version keys
export const GG_TO_BASIC_MAPPING = Object.fromEntries(
  Object.entries(BASIC_TO_GG_MAPPING).map(([basic, gg]) => [gg, basic])
);

// Convert basic version scores object to GG_ITEMS format
export const convertBasicScoresToGG = (basicScores) => {
  const ggScores = {};
  
  // Convert self-care scores
  if (basicScores.selfCare) {
    Object.entries(basicScores.selfCare).forEach(([key, score]) => {
      const ggId = BASIC_TO_GG_MAPPING[key];
      if (ggId) {
        // Convert numeric score to GG format (01-06)
        const ggScore = score.toString().padStart(2, '0');
        ggScores[ggId] = ggScore;
      }
    });
  }
  
  // Convert mobility scores
  if (basicScores.mobility) {
    Object.entries(basicScores.mobility).forEach(([key, score]) => {
      // Skip the duplicate wheelchair R item - it's handled by the original
      if (key === 'pushingWheelchairR2') {
        return;
      }
      
      const ggId = BASIC_TO_GG_MAPPING[key];
      if (ggId) {
        // Convert numeric score to GG format (01-06)
        const ggScore = score.toString().padStart(2, '0');
        ggScores[ggId] = ggScore;
      }
    });
  }
  
  return ggScores;
};

// Convert GG_ITEMS format scores to basic version format
export const convertGGScoresToBasic = (ggScores) => {
  const basicScores = {
    selfCare: {},
    mobility: {}
  };
  
  Object.entries(ggScores).forEach(([ggId, ggScore]) => {
    const basicKey = GG_TO_BASIC_MAPPING[ggId];
    if (basicKey) {
      const numericScore = resolveScore(ggScore) || 1;
      
      // Determine domain based on GG_ITEMS
      const ggItem = GG_ITEMS.find(item => item.id === ggId);
      if (ggItem) {
        if (ggItem.domain === 'selfCare') {
          basicScores.selfCare[basicKey] = numericScore;
        } else if (ggItem.domain === 'mobility') {
          basicScores.mobility[basicKey] = numericScore;
        }
      }
    }
  });
  
  return basicScores;
};

// Get contributing GG_ITEMS based on mobility type (for basic version compatibility)
// This is used for CALCULATION - includes duplicates for wheelchair R
export const getContributingGGItems = (mobilityType) => {
  const contributingItems = new Set();
  
  // Self-care items (only contributing ones: A, B, C)
  const contributingSelfCareItems = [
    'GG0130A', // Eating
    'GG0130B', // Oral hygiene
    'GG0130C', // Toileting hygiene
  ];
  contributingSelfCareItems.forEach(id => contributingItems.add(id));
  
  // Mobility items based on type
  if (mobilityType === 'Walk') {
    // For walking, include items that are relevant for walking
    const walkItems = [
      'GG0170A', // Roll left and right
      'GG0170C', // Lying to sitting on bed side
      'GG0170D', // Sit to stand
      'GG0170E', // Chair/bed-to-chair transfer
      'GG0170F', // Toilet transfer
      'GG0170I', // Walk 10 feet
      'GG0170J', // Walk 50 feet with two turns
    ];
    walkItems.forEach(id => contributingItems.add(id));
  } else if (mobilityType === 'Wheel') {
    // For wheelchair, include items that are relevant for wheelchair
    const wheelItems = [
      'GG0170A', // Roll left and right
      'GG0170C', // Lying to sitting on bed side
      'GG0170D', // Sit to stand
      'GG0170E', // Chair/bed-to-chair transfer
      'GG0170F', // Toilet transfer
      'GG0170R', // Wheel 50 feet with two turns
    ];
    wheelItems.forEach(id => contributingItems.add(id));
    // For wheelchair, R item is counted twice in calculation
    contributingItems.add('GG0170R');
  }
  
  return contributingItems;
};

// Get contributing GG_ITEMS for DISPLAY only (no duplicates)
export const getContributingGGItemsForDisplay = (mobilityType) => {
  const contributingItems = new Set();
  
  // Self-care items (only contributing ones: A, B, C)
  const contributingSelfCareItems = [
    'GG0130A', // Eating
    'GG0130B', // Oral hygiene
    'GG0130C', // Toileting hygiene
  ];
  contributingSelfCareItems.forEach(id => contributingItems.add(id));
  
  // Mobility items based on type
  if (mobilityType === 'Walk') {
    // For walking, include items that are relevant for walking
    const walkItems = [
      'GG0170A', // Roll left and right
      'GG0170C', // Lying to sitting on bed side
      'GG0170D', // Sit to stand
      'GG0170E', // Chair/bed-to-chair transfer
      'GG0170F', // Toilet transfer
      'GG0170I', // Walk 10 feet
      'GG0170J', // Walk 50 feet with two turns
    ];
    walkItems.forEach(id => contributingItems.add(id));
  } else if (mobilityType === 'Wheel') {
    // For wheelchair, include items that are relevant for wheelchair
    const wheelItems = [
      'GG0170A', // Roll left and right
      'GG0170C', // Lying to sitting on bed side
      'GG0170D', // Sit to stand
      'GG0170E', // Chair/bed-to-chair transfer
      'GG0170F', // Toilet transfer
      'GG0170R', // Wheel 50 feet with two turns (only once for display)
    ];
    wheelItems.forEach(id => contributingItems.add(id));
  }
  
  return contributingItems;
};

// Convert basic version itemDefs structure to GG_ITEMS format for display
export const convertBasicItemsToGG = (basicItemDefs) => {
  const ggItems = [];
  
  // Convert self-care items
  basicItemDefs.selfCare.forEach(item => {
    const ggId = BASIC_TO_GG_MAPPING[item.key];
    if (ggId) {
      const ggItem = GG_ITEMS.find(gi => gi.id === ggId);
      if (ggItem) {
        ggItems.push({
          ...ggItem,
          contributing: item.contributing,
          basicKey: item.key
        });
      }
    }
  });
  
  // Convert mobility items
  basicItemDefs.mobility.forEach(item => {
    const ggId = BASIC_TO_GG_MAPPING[item.key];
    if (ggId) {
      const ggItem = GG_ITEMS.find(gi => gi.id === ggId);
      if (ggItem) {
        ggItems.push({
          ...ggItem,
          walk: item.walk,
          wheel: item.wheel,
          basicKey: item.key
        });
      }
    }
  });
  
  return ggItems;
};

// Helper function to get basic version contributing keys using GG_ITEMS logic
// This is used for CALCULATION - includes duplicates for wheelchair R
export const getBasicContributingKeys = (mobilityType) => {
  const contributingGGItems = getContributingGGItems(mobilityType); // Use calculation version (with duplicates)
  const contributingKeys = {
    selfCare: [],
    mobility: []
  };
  
  contributingGGItems.forEach(ggId => {
    const basicKey = GG_TO_BASIC_MAPPING[ggId];
    if (basicKey) {
      const ggItem = GG_ITEMS.find(item => item.id === ggId);
      if (ggItem) {
        if (ggItem.domain === 'selfCare') {
          contributingKeys.selfCare.push(basicKey);
        } else if (ggItem.domain === 'mobility') {
          contributingKeys.mobility.push(basicKey);
          
          // For wheelchair mode, if this is the R item, add it twice for calculation
          if (mobilityType === 'Wheel' && ggId === 'GG0170R') {
            contributingKeys.mobility.push('pushingWheelchairR2');
          }
        }
      }
    }
  });
  
  return contributingKeys;
};

// Get contributing items directly from GG_ITEMS for basic mode display
export const getBasicContributingItems = (mobilityType) => {
  const contributingGGItems = getContributingGGItemsForDisplay(mobilityType); // Use display version (no duplicates)
  const contributingItems = {
    selfCare: [],
    mobility: []
  };
  
  contributingGGItems.forEach(ggId => {
    const basicKey = GG_TO_BASIC_MAPPING[ggId];
    if (basicKey) {
      const ggItem = GG_ITEMS.find(item => item.id === ggId);
      if (ggItem) {
        // Create item with unified description and basic key
        const item = {
          key: basicKey,
          label: `${ggItem.id.slice(-1)}. ${ggItem.label}`, // Add letter prefix (A, B, C, etc.)
          domain: ggItem.domain,
          contributing: true
        };
        
        if (ggItem.domain === 'selfCare') {
          contributingItems.selfCare.push(item);
        } else if (ggItem.domain === 'mobility') {
          contributingItems.mobility.push(item);
        }
      }
    }
  });
  
  return contributingItems;
};
