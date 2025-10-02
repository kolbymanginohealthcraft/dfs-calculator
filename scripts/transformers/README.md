# Data Transformers

This directory contains scripts that transform raw regulatory data into app-friendly formats.

## Available Transformers

### MDS Data
- `generateMdsLookup.cjs` - Transforms itm_mstr.csv into mds_item_lookup.json
- `generateValueDescriptions.cjs` - Transforms itm_val.csv into value descriptions

### Covariate Multipliers  
- `generateFunctionMultipliers.cjs` - Extracts function multipliers from risk-adjustment appendix
- `generateImputationMultipliers.cjs` - Extracts imputation multipliers from imputation appendix

### Diagnosis Data
- `generateIcdToHcc.cjs` - Creates ICD-10 to HCC mapping from crosswalk file
- `generateIcd10Lookup.cjs` - Creates ICD-10 code lookup (already exists in parent)

## Usage

```bash
# Transform individual data types
node scripts/transformers/generateMdsLookup.cjs
node scripts/transformers/generateFunctionMultipliers.cjs

# Or run all transformations
node scripts/build-all.cjs
```

## Output

All transformed data is written to the appropriate locations:
- `src/data/` - For data used by the app
- `public/` - For data served as static assets
