// Theme colors for DFS Calculator Web App

// Base colors used throughout the app
export const BASE_COLORS = {
  primary: '#0c436a',
  secondary: '#7fbc42',
  success: '#28a745',
  warning: '#fd7e14',
  danger: '#dc3545',
  light: '#f8f9fa',
  dark: '#333',
  gray: '#666',
  lightGray: '#e0e0e0',
  white: '#fff',
  black: '#000',
  transparent: 'transparent',
};

// Score type specific colors
export const SCORE_COLORS = {
  start: {
    primary: '#007cbb',    // Blue for start scores
    secondary: '#0056b3',  // Darker blue for hover/active states
    light: '#e6f3ff',      // Light blue background
    text: '#007cbb',       // Blue text
    border: '#007cbb',     // Blue borders
  },
  expected: {
    primary: '#dc3545',    // Red for expected scores
    secondary: '#c82333',  // Darker red for hover/active states
    light: '#f8d7da',      // Light red background
    text: '#dc3545',       // Red text
    border: '#dc3545',     // Red borders
  },
  end: {
    primary: '#7fbc42',    // Green for end scores
    secondary: '#6c9e3a',  // Darker green for hover/active states
    light: '#f0f8e6',      // Light green background
    text: '#7fbc42',       // Green text
    border: '#7fbc42',     // Green borders
  },
};

// Helper function to get colors for a specific score type
export const getScoreTypeColors = (scoreType) => {
  return SCORE_COLORS[scoreType] || SCORE_COLORS.start;
};

// Helper function to get color for a specific score type and element
export const getScoreTypeColor = (scoreType, element = 'primary') => {
  const colors = getScoreTypeColors(scoreType);
  return colors[element] || colors.primary;
};

// Legacy color mapping for backward compatibility
export const LEGACY_COLORS = {
  blue: SCORE_COLORS.start.primary,      // For backward compatibility
  red: SCORE_COLORS.expected.primary,    // For backward compatibility
  green: SCORE_COLORS.end.primary,       // For backward compatibility
};

// Export all colors for easy access
export const COLORS = {
  ...BASE_COLORS,
  ...LEGACY_COLORS,
  scoreTypes: SCORE_COLORS,
};
