# Client-Side Exposure Analysis

## What a Competitor Could Access (If They're Determined)

### ⚠️ **CRITICAL EXPOSURE: Full Algorithm Source Code**

**Location**: The proprietary calculation functions are still in `src/utils/` and WILL be bundled into client JavaScript.

**What They Can See**:

1. **Complete `getFunctionCovariates()` Algorithm** (lines 741-809 in `calculations.js`)
   - ✅ **PROTECTED**: Runtime check throws error if called
   - ❌ **EXPOSED**: Full source code is visible in bundle
   - They can see:
     - How you combine all covariates
     - The order of operations
     - All the helper functions (processAgeCovariate, processBMICovariates, etc.)
     - How Admission Function score is calculated and squared
     - How HCC conditions are processed
     - The final weighted score calculation: `weightedScore += value * multiplier`

2. **Complete Imputation Algorithm** (in `fileParser.js` and `imputationCalculations.js`)
   - ✅ **PROTECTED**: Runtime check throws error if called
   - ❌ **EXPOSED**: Full source code is visible in bundle
   - They can see:
     - How imputation scores are calculated
     - The threshold logic
     - How GG item-specific covariates are handled
     - The exclusion rules (shouldExcludeGGItemCovariate)

3. **All Helper Functions** (in `calculations.js`)
   - `processAgeCovariate()` - Age group logic
   - `processBMICovariates()` - BMI calculation and thresholds
   - `processCognitiveFunction()` - BIMS score processing
   - `processCommunicationImpairment()` - Communication logic
   - `processContinenceCovariates()` - Continence logic
   - `processUsesWheelchair()` - Wheelchair determination
   - `processAdditionalClinicalConditions()` - Clinical condition logic
   - `processMedicalConditionCategory()` - Medical category logic
   - `processPriorFunctioning()` - Prior functioning logic
   - `processPriorMobilityDevices()` - Mobility device logic
   - `processHccConditions()` - HCC processing logic

4. **All Multipliers/Coefficients** (in `src/data/coefficients-all-versions.json`)
   - ✅ **PUBLIC DATA**: CMS releases these anyway
   - All function multipliers for all versions
   - All imputation multipliers for all versions
   - All threshold values

5. **ImputationTab Calculation Logic** (in `ImputationTab.jsx`)
   - The full imputation calculation is done client-side for display
   - Shows exactly how imputation works
   - Shows the multipliers being used
   - Shows the threshold logic

### What They CANNOT Easily Do

1. **Execute the Protected Functions Client-Side**
   - Runtime checks will throw errors
   - They'd need to modify the code to bypass checks

2. **Access Server-Side API Without Token**
   - Endpoints require authentication
   - But currently accepts ANY token (placeholder)

3. **See Server-Side Code**
   - Files in `api/` directory are server-only
   - Not bundled into client

## Current Protection Level

### Architecture: ✅ GOOD
- Server-side execution enforced
- API endpoints protected
- Runtime checks prevent accidental use

### Code Exposure: ❌ **HIGH RISK**
- **The entire algorithm source code is in the client bundle**
- A competitor could:
  1. Download your JavaScript bundle
  2. Read the source code (even if minified, can be deobfuscated)
  3. See exactly how `getFunctionCovariates()` works
  4. See exactly how imputation works
  5. Recreate your algorithm

### The Problem

Even though the functions throw errors if called, **the source code itself is still visible**. A determined competitor could:

1. Read the code in the bundle
2. Copy the algorithm logic
3. Remove the runtime checks
4. Recreate your proprietary calculation

## What's Actually Protected vs Exposed

### ✅ Protected (Server-Side Only)
- **Nothing** - The code is still in the client bundle!

### ❌ Exposed (Client-Side)
- **getFunctionCovariates()** - Full algorithm source code
- **calculateImputedValue()** - Full imputation algorithm
- **imputeMissingGGItems()** - Full batch imputation algorithm
- **All helper functions** - All processing logic
- **Multipliers** - But these are public CMS data anyway
- **ImputationTab logic** - Shows exactly how imputation works

## The Reality

**Your proprietary IP is currently exposed in the client bundle.**

The runtime checks prevent **accidental** use, but they don't prevent someone from **reading** the code and copying it.

## What You Need to Do

### Option 1: Move Code to Server-Only (Recommended)
Move the proprietary functions entirely out of `src/utils/` and into `api/utils/` so they're never bundled:

1. Copy `getFunctionCovariates()` to `api/utils/serverCalculations.js`
2. Copy imputation functions to `api/utils/serverImputation.js`
3. Remove or delete these functions from `src/utils/`
4. Update server-only modules to not import from `src/`

### Option 2: Obfuscate/Minify (Partial Protection)
- Use aggressive code minification/obfuscation
- Makes it harder but not impossible to read
- Still exposes the algorithm

### Option 3: Split into Microservices (Best Protection)
- Move calculation logic to a separate backend service
- Client never receives the code
- Only receives results

## Recommendation

**Move the proprietary calculation code completely out of `src/utils/`** and into `api/utils/` so it's never bundled into the client. This is the only way to truly protect it.

