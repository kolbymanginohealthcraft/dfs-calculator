# Default Value Architecture for GG Items

## Current Problem

The current system uses hardcoded default values (typically `1`) when GG items don't have valid scores (1-6). However, CMS uses a more sophisticated covariate-based methodology to determine default values based on other MDS data points.

## Current Architecture Issues

1. **Hardcoded defaults** in multiple places:
   - `safe()` function in `src/utils/calculations.js` (line 178)
   - `scoreMap` in `src/utils/calculations.js` (lines 4-19)
   - UI components in `src/components/FunctionItemsList.jsx` (lines 63, 75)

2. **No separation of concerns** - default logic mixed with calculation logic

3. **No configuration system** for different default strategies

4. **Tight coupling** between UI and business logic

## Recommended Solution: Strategy Pattern Architecture

### 1. Default Value Strategy Interface

Create `src/utils/defaultValueStrategies.js`:

```javascript
export class DefaultValueStrategy {
  calculateDefaultValue(itemId, parsedValues, covariates) {
    throw new Error('Must implement calculateDefaultValue');
  }
  
  getRequiredCovariates() {
    return [];
  }
  
  canCalculate(parsedValues, covariates) {
    return true;
  }
}

export class SimpleDefaultStrategy extends DefaultValueStrategy {
  calculateDefaultValue(itemId, parsedValues, covariates) {
    return 1; // Current simple default
  }
}

export class CovariateBasedStrategy extends DefaultValueStrategy {
  constructor(config) {
    super();
    this.config = config; // Will contain covariate rules and weights
  }
  
  calculateDefaultValue(itemId, parsedValues, covariates) {
    // This is where the CMS methodology will go
    // For now, placeholder that returns 1
    return 1;
  }
  
  getRequiredCovariates() {
    return this.config.requiredCovariates || [];
  }
  
  canCalculate(parsedValues, covariates) {
    const required = this.getRequiredCovariates();
    return required.every(cov => covariates[cov] !== undefined);
  }
}
```

### 2. Default Value Manager

Create `src/utils/defaultValueManager.js`:

```javascript
import { DefaultValueStrategy, SimpleDefaultStrategy, CovariateBasedStrategy } from './defaultValueStrategies';

export class DefaultValueManager {
  constructor() {
    this.strategies = new Map();
    this.fallbackStrategy = new SimpleDefaultStrategy();
  }
  
  registerStrategy(name, strategy) {
    this.strategies.set(name, strategy);
  }
  
  getDefaultValue(itemId, parsedValues, covariates, strategyName = 'covariate') {
    const strategy = this.strategies.get(strategyName) || this.fallbackStrategy;
    
    if (!strategy.canCalculate(parsedValues, covariates)) {
      return this.fallbackStrategy.calculateDefaultValue(itemId, parsedValues, covariates);
    }
    
    return strategy.calculateDefaultValue(itemId, parsedValues, covariates);
  }
}
```

### 3. Configuration System

Create `src/config/defaultValueConfig.js`:

```javascript
export const DEFAULT_VALUE_CONFIG = {
  strategies: {
    covariate: {
      requiredCovariates: [
        'Admission Function - Continuous Form',
        'Age Group',
        'Prior Surgery',
        // ... other required covariates
      ],
      rules: {
        // This will contain the actual CMS methodology
        // when you get the details
        'GG0130A': {
          // Rules for Eating item
        },
        'GG0170I': {
          // Rules for Walk 10 feet item
        }
      }
    }
  }
};
```

### 4. Refactor Current Code

Update the `safe` function in `src/utils/calculations.js`:

```javascript
// Instead of:
const safe = (key) => {
  const v = values[key];
  return valid.has(v) ? parseInt(v, 10) : 1;
};

// Use:
const safe = (key, defaultValueManager, parsedValues, covariates) => {
  const v = values[key];
  if (valid.has(v)) {
    return parseInt(v, 10);
  }
  
  // Use the new default value system
  return defaultValueManager.getDefaultValue(key, parsedValues, covariates);
};
```

### 5. Testing Framework

Create `src/utils/__tests__/defaultValueManager.test.js`:

```javascript
describe('DefaultValueManager', () => {
  it('should use covariate strategy when data is available', () => {
    // Test covariate-based calculation
  });
  
  it('should fallback to simple strategy when covariate data is insufficient', () => {
    // Test fallback behavior
  });
  
  it('should handle missing items gracefully', () => {
    // Test error handling
  });
});
```

## Migration Strategy

1. **Phase 1**: Implement the abstraction layer alongside existing code
2. **Phase 2**: Gradually migrate components to use the new system
3. **Phase 3**: Add the actual CMS covariate methodology when available
4. **Phase 4**: Remove old hardcoded defaults

## Benefits

- **Flexibility**: Easy to switch between different default strategies
- **Testability**: Each strategy can be tested independently
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add new strategies or modify existing ones
- **Backward Compatibility**: Can maintain current behavior as fallback

## Key Files to Modify

1. `src/utils/calculations.js` - Update `safe()` function and `calculateFunctionScore()`
2. `src/components/FunctionItemsList.jsx` - Update `getScore()` and `getStartScore()` functions
3. `src/utils/fileParser.js` - Update GG item initialization logic
4. `src/components/AdvancedAppNew.jsx` - Update score adjustment logic

## Current Touchpoints

- **Line 178 in calculations.js**: `return valid.has(v) ? parseInt(v, 10) : 1;`
- **Line 63 in FunctionItemsList.jsx**: `return scores[item.id] in scoreMap ? scoreMap[scores[item.id]] : 0;`
- **Line 75 in FunctionItemsList.jsx**: `return rawStart in scoreMap ? scoreMap[rawStart] : 0;`
- **Line 48 in fileParser.js**: `const rawVal = parsed[sourceId] || "01";`

## Next Steps

1. Create the abstraction layer files
2. Add configuration system for future CMS rules
3. Create comprehensive tests for the new system
4. Document the new architecture for the team
5. Plan the migration timeline based on when CMS methodology is received

This approach will make the transition much smoother when the actual CMS covariate methodology is received, as there will be a flexible framework ready to plug in the new logic.
