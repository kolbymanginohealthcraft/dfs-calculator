/**
 * Server-Only Coefficient Loader
 * 
 * This module provides access to coefficient loading functions
 * for server-side use.
 */

// Import coefficient loader functions from source
import {
  getFunctionMultipliers as getFunctionMultipliersSource,
  getImputationMultipliers as getImputationMultipliersSource,
  getImputationMultipliersForItem as getImputationMultipliersForItemSource
} from '../../src/utils/coefficientLoader.js';

// Re-export for server-side use
export { getFunctionMultipliersSource as getFunctionMultipliers };
export { getImputationMultipliersSource as getImputationMultipliers };
export { getImputationMultipliersForItemSource as getImputationMultipliersForItem };

// Note: getImputationThresholds is NOT re-exported here to avoid circular dependency
// It's defined in serverImputation.js and should be imported directly from there when needed
// serverImputation.js imports from this file, so we can't re-export from it

