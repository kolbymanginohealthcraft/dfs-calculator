# Migration Guide: Multi-Version Coefficients

This guide shows how to update your calculations to use version-aware coefficients based on the ARD date.

## Summary

**Before:** Hardcoded single version of coefficients  
**After:** Automatic version selection based on assessment date

## Step 1: Generate All Coefficients

```bash
node scripts/transformers/generateAllCoefficients.cjs
```

This creates `Aegis.DfsCalculator/DFSCalculator.Server/Data/coefficients-all-versions.json` with all historical versions.

## Step 2: Update calculations.js

### Old Approach (Single Version):

```javascript
// OLD - Single version only
import { functionMultipliers } from './functionMultipliers';
import { imputationMultipliers } from './imputationMultipliers';

export function calculateScore(parsedValues) {
  // Always uses the same version
  const modelIntercept = functionMultipliers['Model Intercept'];
  // ...
}
```

### New Approach (Version-Aware):

```javascript
// NEW - Version-aware
import { getFunctionMultipliers, getImputationMultipliers, getScheduleInfo } from './coefficientLoader';

export function calculateScore(parsedValues) {
  // Extract ARD date from the MDS file
  const ardDate = parsedValues['A0310F']; // e.g., '20251006'
  
  // Get the correct version for this date
  const functionMults = getFunctionMultipliers(ardDate);
  const imputationMults = getImputationMultipliers(ardDate);
  
  // Use them exactly as before
  const modelIntercept = functionMults['Model Intercept'];
  
  // Optional: Log which version is being used
  const scheduleInfo = getScheduleInfo(ardDate);
  console.log(`Using coefficients: Update ID ${scheduleInfo.updateId} (${scheduleInfo.fiscalYear})`);
  
  // Rest of calculation unchanged...
}
```

## Step 3: Update Imputation Calculations

### Old Approach:

```javascript
// OLD
import { imputationMultipliers } from './imputationMultipliers';

function calculateImputedValue(ggItemId, parsedValues) {
  const multipliers = imputationMultipliers[ggItemId];
  // ...
}
```

### New Approach:

```javascript
// NEW
import { getImputationMultipliersForItem } from './coefficientLoader';

function calculateImputedValue(ggItemId, parsedValues, ardDate) {
  const multipliers = getImputationMultipliersForItem(ggItemId, ardDate);
  // ...
}
```

## Step 4: Update File Parser (if needed)

Make sure ARD date is passed through your calculation pipeline:

```javascript
// fileParser.js
export function parseAndCalculate(xmlContent) {
  const parsed = parseXml(xmlContent);
  const ardDate = parsed['A0310F']; // Extract once
  
  // Pass ardDate to all calculations
  const score = calculateScore(parsed, ardDate);
  const imputed = calculateImputations(parsed, ardDate);
  
  return { score, imputed, ardDate };
}
```

## Step 5: Add Version Display (Optional)

Show users which coefficient version is being used:

```javascript
// In your component
import { getScheduleInfo } from '../utils/coefficientLoader';

function ScoreDisplay({ parsedData }) {
  const ardDate = parsedData['A0310F'];
  const version = getScheduleInfo(ardDate);
  
  return (
    <div>
      <p>Assessment Date: {formatDate(ardDate)}</p>
      <p>Using Coefficients: {version.fiscalYear} (Update ID {version.updateId})</p>
      <p>Manual Version: {version.manualVersion}</p>
    </div>
  );
}
```

## Date Format Handling

The coefficient loader supports multiple date formats:

```javascript
// All of these work:
getFunctionMultipliers('20251006');      // MDS format: YYYYMMDD
getFunctionMultipliers('2025-10-06');    // ISO format
getFunctionMultipliers('2025-10-06T12:00:00.000Z'); // Full ISO
```

## Testing Different Versions

```javascript
// Test with historical date (FY 2023)
const fy2023Multipliers = getFunctionMultipliers('20230515');

// Test with FY 2025 date
const fy2025Multipliers = getFunctionMultipliers('20250315');

// Test with current date (FY 2026)
const currentMultipliers = getFunctionMultipliers('20251006');

// Compare model intercepts across versions
console.log('FY 2023:', fy2023Multipliers['Model Intercept']);
console.log('FY 2025:', fy2025Multipliers['Model Intercept']);
console.log('FY 2026:', currentMultipliers['Model Intercept']);
```

## Backwards Compatibility

To maintain backwards compatibility temporarily:

```javascript
// Create legacy exports from latest version
import { allVersions } from './coefficientLoader';

const latestUpdateId = allVersions.schedule[allVersions.schedule.length - 1].updateId;

// Export as if they were the old single-version files
export const functionMultipliers = allVersions.functionMultipliers[latestUpdateId];
export const imputationMultipliers = allVersions.imputationMultipliers[latestUpdateId];
```

## Verification

After migration, verify calculations:

```javascript
// Test file with known ARD date and expected score
const testXml = `...`; // MDS XML from 2023
const result = calculateScore(parseXml(testXml));

// Should use FY 2023 coefficients (Update ID 1)
console.assert(result.versionUsed === '1', 'Should use Update ID 1');
console.assert(Math.abs(result.score - expectedScore) < 0.01, 'Score matches');
```

## Rollout Strategy

### Phase 1: Non-Breaking Addition
1. Generate `coefficients-all-versions.json`
2. Add `coefficientLoader.js`
3. Keep existing imports working (backward compatibility)
4. Test in development

### Phase 2: Gradual Migration
1. Update one calculation function at a time
2. Add version display to UI
3. Test with files from different years
4. Validate against known scores

### Phase 3: Cleanup (Optional)
1. Remove old single-version files
2. Remove backward compatibility shims
3. Update documentation

## Future Updates

When CMS releases new coefficient files (e.g., FY 2027):

1. **Download files** to `scripts/data-sources/`
2. **Run generator:** `node scripts/transformers/generateAllCoefficients.cjs`
3. **Verify** new Update ID 4 appears in output
4. **Deploy** - No code changes needed!

The app will automatically:
- Use Update ID 4 for assessments dated 10/01/2026 or later
- Continue using older versions for historical assessments
- Maintain accuracy across all fiscal years

## Benefits Summary

✅ **Automatic version selection** - No manual date checking  
✅ **Historical accuracy** - Correct coefficients for any assessment date  
✅ **Future-proof** - Easy to add new versions  
✅ **No backend needed** - All data in static JSON  
✅ **Fast performance** - No API calls, instant access  
✅ **Audit trail** - Every calculation uses documented version  

## Questions?

- Check `scripts/transformers/README.md` for data source details
- See `src/utils/coefficientLoader.js` for API documentation
- Review `Aegis.DfsCalculator/DFSCalculator.Server/Data/coefficients-all-versions.json` for data structure
