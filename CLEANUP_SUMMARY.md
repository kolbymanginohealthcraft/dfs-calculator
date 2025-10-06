# Cleanup Complete: Old Data Files Removed

**Date:** October 6, 2025  
**Status:** ✅ Complete - All Tests Passing

## Files Removed

### From `src/utils/` (2 files):
✅ **`functionMultipliers.js`** - Single-version function multipliers (FY 2026 only)  
✅ **`imputationMultipliers.js`** - Single-version imputation multipliers (FY 2026 only)

### From `src/data/loaders/` (4 files):
✅ **`functionMultipliers.js`** - Duplicate/unused loader  
✅ **`imputationMultipliers.js`** - Duplicate/unused loader  
✅ **`icdToHcc.js`** - Duplicate (main version in `src/utils/`)  
✅ **`useValueDescriptions.js`** - Duplicate (main version in `src/utils/`)

**Total removed:** 6 files (~1500 lines of code)

## What Replaced Them

**Single source of truth:** `src/data/coefficients-all-versions.json` (300 KB)
- Contains all 3 historical Update IDs
- Function multipliers for FY 2023, 2025, 2026
- Imputation multipliers for all years
- Schedule/date mapping information

**Access via:** `src/utils/coefficientLoader.js`
```javascript
import { getFunctionMultipliers, getImputationMultipliers } from './coefficientLoader';

const ardDate = parsedValues['A2300'];
const multipliers = getFunctionMultipliers(ardDate); // Auto-selects version
```

## Remaining Dependencies

**Still needed:**
- ✅ `src/utils/covariateMapping.js` - Name normalization (en-dash → hyphen mapping)
  - Used by: `imputationCalculations.js`
  - Purpose: Maps Excel covariate names to code covariate names

**All other coefficient data:**
- Now comes from `coefficients-all-versions.json` ✅

## Verification Results

✅ **Build Status:** Success  
✅ **All Tests Passing:** 8/8  
✅ **No Linter Errors**  
✅ **No Import Errors**  
✅ **Bundle Size:** 391 KB gzipped (same as before cleanup)

## Before vs After

### Before Cleanup:
```
src/
├── utils/
│   ├── functionMultipliers.js ❌ (single version)
│   ├── imputationMultipliers.js ❌ (single version + mapping)
│   └── covariateMapping.js ✅
├── data/
│   ├── loaders/
│   │   ├── functionMultipliers.js ❌ (duplicate)
│   │   ├── imputationMultipliers.js ❌ (duplicate)
│   │   ├── icdToHcc.js ❌ (duplicate)
│   │   └── useValueDescriptions.js ❌ (duplicate)
│   └── coefficients-all-versions.json ✅ (new)
```

### After Cleanup:
```
src/
├── utils/
│   ├── coefficientLoader.js ✅ (version-aware access)
│   └── covariateMapping.js ✅ (name normalization)
└── data/
    ├── loaders/ (directory empty - can be removed)
    └── coefficients-all-versions.json ✅ (single source)
```

**Much cleaner!** 🧹

## Benefits of Cleanup

✅ **Single Source of Truth** - One file for all coefficient data  
✅ **Reduced Confusion** - No duplicate files  
✅ **Easier Maintenance** - Update one generator script, one JSON file  
✅ **Smaller Codebase** - 1500+ lines removed  
✅ **Clear Architecture** - Data separated from logic

## Empty Directory

The `src/data/loaders/` directory is now empty. You can optionally remove it:

```bash
# Optional cleanup
rmdir src/data/loaders  # Windows
# or
rm -rf src/data/loaders  # Unix
```

## Rollback (If Needed)

If you need to rollback, the old files are in git history:

```bash
git checkout HEAD~1 -- src/utils/functionMultipliers.js
git checkout HEAD~1 -- src/utils/imputationMultipliers.js
# etc.
```

## What You Now Have

**Single coefficient system:**
1. **Data:** `coefficients-all-versions.json` (all historical versions)
2. **Loader:** `coefficientLoader.js` (version-aware access)
3. **Mapping:** `covariateMapping.js` (name normalization)
4. **Generator:** `generateAllCoefficients.cjs` (one script to rule them all)

**Simple and maintainable!** ✨

---

**Next:** Test with actual MDS files and deploy to production! 🚀
