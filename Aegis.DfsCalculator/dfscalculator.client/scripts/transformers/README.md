# Data Transformers

This directory contains scripts that transform CMS regulatory data files into app-friendly formats.

## Quick Start

```bash
# Generate ALL historical coefficient versions (recommended)
node scripts/transformers/generateAllCoefficients.cjs

# Or generate individual files (legacy approach)
node scripts/test-transformations.cjs
```

## Main Script: generateAllCoefficients.cjs

**Purpose:** Extracts ALL historical versions of coefficients from CMS Excel files into a single unified JSON file.

**Input Files:**
- `scripts/data-sources/risk_adjustment_appendix_file_snf_effective_10_01_2025.xlsx`
- `scripts/data-sources/imputation_appendix_file_for_snf_effective_10_01_2025.xlsx`

**Output:**
- `src/data/coefficients-all-versions.json` (~300 KB)

**What it extracts:**

### 1. Schedule Information
Maps Update IDs to effective date ranges and fiscal years:

```json
{
  "schedule": [
    {
      "updateId": "1",
      "startDate": "01/01/2023",
      "endDate": "09/30/2024",
      "fiscalYear": "FY 2023",
      "manualVersion": "5.0"
    },
    {
      "updateId": "2",
      "startDate": "10/01/2024",
      "endDate": "09/30/2025",
      "fiscalYear": "FY 2025"
    },
    {
      "updateId": "3",
      "startDate": "10/01/2025",
      "endDate": null,
      "fiscalYear": "FY 2026"
    }
  ]
}
```

### 2. Function Multipliers (Risk Adjustment)
From "Discharge Function - Coeff" sheet, all Update ID columns:

```json
{
  "functionMultipliers": {
    "1": {
      "Model Intercept": 26.6465,
      "≤54 Years": -0.02,
      "55–64 Years": 0.054,
      ...
    },
    "2": { ... },
    "3": { ... }
  }
}
```

### 3. Imputation Multipliers
From "Coefficients - Admission - ID X" sheets (transposed data):

```json
{
  "imputationMultipliers": {
    "1": {
      "GG0130A1": {
        "≤54 Years": -0.1153,
        "55–64 Years": -0.0489,
        ...
      },
      "GG0130B1": { ... },
      ...
    },
    "2": { ... },
    "3": { ... }
  }
}
```

## Fiscal Year Logic

**CMS Fiscal Year starts October 1st:**
- FY 2026 = October 1, 2025 - September 30, 2026
- FY 2025 = October 1, 2024 - September 30, 2025
- FY 2023 = October 1, 2022 - September 30, 2023

**Update ID effective dates:**
| Update ID | Effective Dates | Fiscal Year | Data Source |
|-----------|----------------|-------------|-------------|
| 1 | 01/01/2023 - 09/30/2024 | FY 2023-2024 | FY 2022 data |
| 2 | 10/01/2024 - 09/30/2025 | FY 2025 | FY 2023 data |
| 3 | 10/01/2025 - Present | FY 2026+ | FY 2024 data |

## Annual Update Process

When CMS releases new appendix files:

1. **Download new files** to `scripts/data-sources/`
   - Files are auto-detected by pattern matching
   - No need to rename or delete old files

2. **Run generator:**
   ```bash
   node scripts/transformers/generateAllCoefficients.cjs
   ```

3. **Verify output:**
   - Check console for any warnings
   - Verify new Update ID was added
   - Check file size is reasonable (~300-400 KB)

4. **Update application:**
   - The app automatically detects which version to use based on ARD date
   - No code changes needed!

## Advantages of This Approach

✅ **Historical Accuracy** - Users get correct coefficients for any assessment date  
✅ **No Backend Needed** - All data in static JSON, works on any CDN  
✅ **Easy Updates** - Just run one script when CMS releases new files  
✅ **Fast** - No API calls, everything precomputed  
✅ **Auditable** - Each version clearly documented with source and dates  

## Legacy Scripts

The following scripts generate individual files (still useful for testing):

- `generateFunctionMultipliers.cjs` - Single version only
- `generateImputationMultipliers.cjs` - Single version only
- `generateIcd10Lookup.cjs`
- `generateIcdToHcc.cjs`
- `generateMdsLookup.cjs`
- `generateValueDescriptions.cjs`

Run all legacy scripts:
```bash
node scripts/test-transformations.cjs
```

## Troubleshooting

**"Could not find Discharge Function Score in schedule"**
- Verify the Risk Adjustment appendix has a "Schedule" sheet
- Check that "Discharge Function Score" with start date 01/01/2023 exists

**"Sheet not found: Coefficients - Admission - ID X"**
- The imputation appendix must have sheets named exactly:
  - "Coefficients - Admission - ID 1"
  - "Coefficients - Admission - ID 2"
  - "Coefficients - Admission - ID 3"

**"Found 0 GG items"**
- Check that row 2 (index 2) of the imputation sheet contains GG item IDs
- Format should be: `['', 'GG0130A1', 'GG0130B1', ...]`

**File size too large (>500 KB)**
- This is normal as more Update IDs are added over time
- Consider compressing the JSON or using gzip on server