# Dummy Test Data

This directory contains dummy MDS XML files created with **fake patient data** for testing purposes.

## Purpose

These files are specifically designed to test the application of different fiscal year coefficient versions and the manual wheelchair covariate without using any sensitive or real patient information.

## Files

Both files represent the **same fictitious patient** (Jane D. Dummy) with identical characteristics, allowing for apples-to-apples comparison of fiscal year coefficient differences.

### DUMMY_FY2025.xml
- **Patient Name**: Jane D. Dummy (fictitious)
- **DOB**: 01/15/1948 → **Age 77** at admission
- **Admission Date (A1600)**: 02/15/2025
- **ARD Date (A2300)**: 03/01/2025 (March 1, 2025)
- **Fiscal Year**: FY 2025 (October 1, 2024 - September 30, 2025)
- **Coefficient Version**: Update ID 2, Manual Version 6.0
- **Primary Condition**: Fractures and Other Multiple Trauma (I0020 = 08)
- **Manual Wheelchair Use**: Yes (GG0170Q1 = 1)
- **Mobility Type**: Walk (GG0170G1 = 10)
- **Prior Surgery**: Yes (J2000 = 1)
- **Height/Weight**: 65 inches, 150 lbs (BMI: 24.9)
- **Imputed Items**: GG0170I (Walk 10 feet) = 88 → imputed to 03
- **Imputed Items**: GG0170J (Walk 50 feet) = 88 → imputed to 01
- **Start Score**: 31
- **Expected Score**: 48.95

### DUMMY_FY2026.xml
- **Patient Name**: Jane D. Dummy (fictitious) - **SAME COVARIATES**
- **DOB**: 01/15/1949 → **Age 77** at admission (same age!)
- **Admission Date (A1600)**: 02/15/2026 (exactly 1 year later)
- **ARD Date (A2300)**: 03/01/2026 (exactly 1 year later)
- **Fiscal Year**: FY 2026 (October 1, 2025 onwards)
- **Coefficient Version**: Update ID 3, Manual Version 7.0
- **Primary Condition**: Fractures and Other Multiple Trauma (I0020 = 08)
- **Manual Wheelchair Use**: Yes (GG0170Q1 = 1)
- **Mobility Type**: Walk (GG0170G1 = 10)
- **Prior Surgery**: Yes (J2000 = 1)
- **Height/Weight**: 65 inches, 150 lbs (BMI: 24.9)
- **Imputed Items**: GG0170I (Walk 10 feet) = 88 → imputed to 04
- **Imputed Items**: GG0170J (Walk 50 feet) = 88 → imputed to 04
- **Start Score**: 35
- **Expected Score**: 50.44

## Key Testing Points

Both files are designed to have:
1. **Similar function scores** - allowing comparison of expected scores across fiscal years
2. **Manual wheelchair covariate** - to demonstrate the application of this specific covariate
3. **Valid MDS structure** - passing all validation checks
4. **Clear fiscal year separation** - one in FY 2025, one in FY 2026
5. **Imputation demonstration** - GG0170I and GG0170J are set to 88 (Not Performed) to trigger imputation
   - Shows how imputation values differ between fiscal years for the SAME patient (Age 77)
   - FY2025: GG0170I→03, GG0170J→01 (Start Score: 31, Expected: 48.95)
   - FY2026: GG0170I→04, GG0170J→04 (Start Score: 35, Expected: 50.44)
   - The 4-point difference in start score is entirely due to different imputation multipliers
   - The 1.49-point difference in expected score is due to different coefficient versions

## Usage

Upload either file through the web application's file upload interface to see how the application handles different fiscal year coefficients.

## Expected Comparison Results

When processing these identical patient files through different fiscal years, you should observe:

### Same Patient, Different Outcomes:
- **Patient**: Jane D. Dummy (same in both files)
- **Facility**: 999999 (same in both files)
- **Primary Condition**: Amputation (same in both files)
- **Mobility Type**: Walk (same in both files)

### Key Differences Due to Fiscal Year:
| Metric | FY 2025 | FY 2026 | Notes |
|--------|---------|---------|-------|
| **Age** | 77 | 77 | ✅ **Same age** (apples-to-apples) |
| **DOB** | 01/15/1948 | 01/15/1949 | Shifted 1 year to maintain same age |
| **Admission Date** | 02/15/2025 | 02/15/2026 | Exactly 1 year apart |
| **ARD Date** | 03/01/2025 | 03/01/2026 | Exactly 1 year apart |
| **GG0170I Imputed** | 03 | 04 | Different imputation multipliers |
| **GG0170J Imputed** | 01 | 04 | Different imputation multipliers |
| **Start Score** | 31 | 35 | Due to different imputed values |
| **Expected Score** | 48.95 | 50.44 | Different coefficients applied |
| **Score Δ** | 17.95 | 15.44 | Impact on predicted improvement |
| **Manual Wheelchair Coef** | -2.4513 | See coefficients file | Coefficient updates |

### What This Demonstrates:
1. **Perfect comparison** - Both patients have identical characteristics (same age, same conditions, same GG scores)
2. **Imputation differences** - The same missing data (88 = Not Performed) produces different imputed values:
   - FY2025: GG0170I→03, GG0170J→01
   - FY2026: GG0170I→04, GG0170J→04
3. **Coefficient changes** - The manual wheelchair covariate and other coefficients differ between fiscal years
4. **Impact on scores** - Despite identical patient characteristics, the start score differs (31 vs 35) due to different imputation, and expected score differs (49.3 vs 50.74) due to different coefficients

## Coefficient Differences

The "Prior Mobility Device Use: Manual Wheelchair and/or Motorized Wheelchair and/or Scooter" covariate has different coefficients:

- **FY 2025 (Update ID 2)**: -2.4513
- **FY 2026 (Update ID 3)**: Check the coefficients-all-versions.json file for the current value

This allows you to see how the same patient data produces different expected scores when different coefficient versions are applied.

## Data Privacy

⚠️ **All patient information in these files is completely fictitious.**

- Names: Jane D. Dummy, John T. Sample
- SSN: All zeros or dummy values
- Facility IDs: 999999, 888888 (fictitious)
- Medicare Numbers: DUMMY123456, SAMPLE987654 (fictitious)

These files contain **NO real patient data** and are safe for testing and development purposes.

## Git Ignore

These XML files are git-ignored via the `.gitignore` pattern:
```
test-data/dummy-examples/*.xml
```

The README.md file itself is tracked in git to document the purpose of this directory.

