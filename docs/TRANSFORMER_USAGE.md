# Data Transformer Scripts - Usage Guide

## Overview

The transformer scripts convert CMS regulatory files into app-ready formats. They are located in `scripts/transformers/` and read from `scripts/data-sources/`.

## Available Transformers

### 1. Generate All Coefficients
**File:** `generateAllCoefficients.cjs`

**Purpose:** Extracts multi-version coefficients from CMS Excel files

**Usage:**
```bash
node scripts/transformers/generateAllCoefficients.cjs
```

**Input:** 
- `risk_adjustment_appendix_file_snf_effective_*.xlsx`
- `imputation_appendix_file_for_snf_effective_*.xlsx`

**Output:**
- `src/data/coefficients-all-versions.json`

**What it does:**
- Extracts function multipliers for all Update IDs (FY 2023, 2025, 2026)
- Extracts imputation multipliers for all Update IDs
- Creates schedule/date mappings
- Normalizes covariate names (en-dash → hyphen)

---

### 2. Generate ICD-10 Lookup
**File:** `generateIcd10Lookup.cjs`

**Purpose:** Converts ICD-10-CM code TXT files to JSON

**Usage:**
```bash
# Use latest year available
node scripts/transformers/generateIcd10Lookup.cjs

# Specific year
node scripts/transformers/generateIcd10Lookup.cjs 2026

# Compare mode (generates separate file for testing)
node scripts/transformers/generateIcd10Lookup.cjs 2026 --compare
```

**Input:**
- `icd10cm_codes_YYYY.txt` (e.g., `icd10cm_codes_2026.txt`)

**Output:**
- `public/icd10_lookup_YYYY.json`
- OR `icd10_lookup_YYYY_generated.json` (compare mode)

**What it does:**
- Parses ICD-10-CM code list
- Creates code → description lookup
- Sorts alphabetically for consistency
- ~74,000 codes processed

**After running:** Update `src/utils/useICD10Lookup.js` to use the new year.

---

### 3. Generate ICD to HCC Mapping
**File:** `generateIcdToHcc.cjs`

**Purpose:** Creates ICD-10 to HCC crosswalk

**Usage:**
```bash
node scripts/transformers/generateIcdToHcc.cjs
```

**Input:**
- `snf-discharge-function-model-icd10-hcc-crosswalk-effective-*.xlsx`

**Output:**
- `src/utils/icdToHcc.js` (JavaScript module)

**What it does:**
- Extracts ICD-10 to HCC mappings
- Generates ES6 module with lookup object
- Used for diagnosis-based risk adjustment

---

### 4. Generate MDS Item Lookup
**File:** `generateMdsLookup.cjs`

**Purpose:** Transforms MDS item master CSV to JSON

**Usage:**
```bash
node scripts/transformers/generateMdsLookup.cjs
```

**Input:**
- `itm_mstr.csv`

**Output:**
- `src/data/mds_item_lookup_generated.json` (test file)

**What it does:**
- Parses MDS item definitions
- Creates item ID → metadata lookup
- Includes section info, labels

**Note:** Generates to `_generated.json` for testing. Verify before replacing `mds_item_lookup.json`.

---

### 5. Generate Value Descriptions
**File:** `generateValueDescriptions.cjs`

**Purpose:** Converts MDS value descriptions CSV to JSON

**Usage:**
```bash
node scripts/transformers/generateValueDescriptions.cjs
```

**Input:**
- `itm_val.csv`

**Output:**
- `public/itm_val.json`

**What it does:**
- Parses MDS item value descriptions
- Creates "itemId|valueId" → description lookup
- 15.9% smaller than CSV
- Faster parsing (no runtime CSV parsing)

---

## Running All Transformers

Use the master build script:

```bash
node scripts/build-all.cjs
```

This runs all transformers in order:
1. MDS Item Lookup
2. MDS Value Descriptions
3. ICD-to-HCC Mapping
4. ICD-10 Lookup
5. All Coefficients

**Options:**
```bash
# Dry run (show what would be built)
node scripts/build-all.cjs --dry-run

# Specific year for ICD codes
node scripts/build-all.cjs --year 2026
```

## Annual Update Workflow

When CMS releases new fiscal year data (typically October):

### Step 1: Download New Files
Download to `scripts/data-sources/`:
- New risk adjustment Excel file
- New imputation Excel file
- New ICD-10 crosswalk Excel file
- New ICD-10 codes TXT file

### Step 2: Run Transformers
```bash
# Generate all data files
node scripts/build-all.cjs --year 2026
```

### Step 3: Update Code References
If ICD-10 year changed:
```javascript
// src/utils/useICD10Lookup.js
const url = "/icd10_lookup_2026.json"; // Update year
```

### Step 4: Test
```bash
# Run tests
node tests/version-selection.test.cjs
node tests/transformations.test.cjs

# Build
npm run build

# Test with sample MDS files
npm run dev
```

### Step 5: Deploy
```bash
npm run build
# Deploy dist/ to production
```

## Troubleshooting

### "File not found" errors
- Check file is in `scripts/data-sources/`
- Check filename matches expected pattern
- Check paths in transformer script

### "Invalid data" errors
- Verify Excel file structure hasn't changed
- Check sheet names match expected
- Check column headers match expected

### Generated file looks wrong
- Use `--compare` mode to generate separate file first
- Compare with previous year's file
- Check for CMS format changes

## File Size Reference

| File | Size | Location |
|------|------|----------|
| coefficients-all-versions.json | ~300 KB | src/data/ |
| icd10_lookup_2026.json | ~2 MB | public/ |
| mds_item_lookup.json | ~100 KB | src/data/ |
| itm_val.json | ~207 KB | public/ |
| icdToHcc.js | ~50 KB | src/utils/ |

## Best Practices

1. **Always test transformers** before using generated files in production
2. **Use compare mode** for ICD-10 lookup to verify output first
3. **Keep old files** until new version is verified
4. **Run all transformers** together using `build-all.cjs`
5. **Document any CMS format changes** that require script updates

## See Also

- `scripts/data-sources/README.md` - Source file documentation
- `scripts/transformers/README.md` - Technical transformer details
- `docs/ARCHITECTURE.md` - Overall system architecture
