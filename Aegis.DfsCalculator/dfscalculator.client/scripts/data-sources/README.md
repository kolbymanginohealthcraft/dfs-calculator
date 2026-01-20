# Data Sources Directory

This directory contains the raw regulatory data files that need to be transformed into app-friendly formats.

**⚠️ Note: This directory is gitignored. Download files manually using the links below.**

## Download Links

### 📋 MDS Specifications
Download from: [CMS MDS Technical Information](https://www.cms.gov/medicare/quality/nursing-home-improvement/minimum-data-set-technical-information)

- **Item Master File** (`itm_mstr.csv`) - MDS item definitions and descriptions
- **Value Descriptions File** (`itm_val.csv`) - Valid values for each MDS item

*Look for the most recent date in the file listings.*

### 🔢 Covariates (Multipliers)
Download from: [CMS SNF Quality Reporting Program](https://www.cms.gov/medicare/quality/snf-quality-reporting-program/measures-and-technical-information)

- **Imputation Appendix** (`imputation-appendix-file-for-snf-*.xlsx`) - Imputation multipliers for missing GG items
- **Risk Adjustment Appendix** (`risk-adjustment-appendix-file-for-snf-*.xlsx`) - Function multipliers for calculating the expected DFS

*Files are typically named with effective dates (e.g., effective-10-01-2024).*

### 🏥 Diagnoses
Download from: [CMS SNF Quality Reporting Program](https://www.cms.gov/medicare/quality/snf-quality-reporting-program/measures-and-technical-information)

- **ICD-to-HCC Crosswalk** (`snf-discharge-function-model-icd10-hcc-crosswalk-*.xlsx`) - Maps ICD-10 codes to HCC categories

Download from: [CMS ICD-10 Codes](https://www.cms.gov/medicare/coding-billing/icd-10-codes)

- **ICD-10-CM Codes** (`icd10cm_codes_YYYY.txt`) - Complete list of ICD-10 diagnosis codes
  - Click "Code Descriptions in Tabular Order" for the latest year
  - Files are named by fiscal year (e.g., `icd10cm_codes_2025.txt`)

## File Naming Patterns

The transformation scripts will automatically find files matching these patterns:

- `*itm_mstr*.csv` - MDS item master
- `*itm_val*.csv` - MDS value descriptions  
- `*imputation*appendix*snf*.xlsx` - Imputation multipliers
- `*risk*adjustment*appendix*snf*.xlsx` - Risk adjustment multipliers
- `*snf*discharge*function*icd10*hcc*crosswalk*.xlsx` - ICD-to-HCC mapping
- `icd10cm_codes_*.txt` - ICD-10 codes

## Usage

1. **Download** the latest files using the links above
2. **Place** them in this directory (any filename matching the patterns above)
3. **Run** the transformation scripts:
   ```bash
   # Test all transformations
   node scripts/test-transformations.cjs
   
   # Run individual transformations
   node scripts/transformers/generateMdsLookup.cjs
   node scripts/transformers/generateFunctionMultipliers.cjs
   # etc.
   ```

## Notes

- ✅ **Flexible naming** - Scripts automatically find the latest version
- ✅ **Safe testing** - Generated files have `_generated` suffix
- ✅ **Auto-discovery** - No need to update script paths when files change
- ⚠️ **Large files** - These are excluded from git to keep repository size manageable
- 📅 **Annual updates** - Most files are updated each fiscal year (October 1st)
