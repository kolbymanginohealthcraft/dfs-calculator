# Imputation Algorithm Change — CMS Statistical Imputation (February 2026)

## What Changed

The imputation algorithm was corrected to match the CMS Table 8-8 (S042.02) specification for calculating imputed GG item values. The old approach directly compared the imputation score (`z`) to threshold values to produce an integer (1–6). The correct approach uses the **standard normal cumulative distribution function (Φ)** to compute probabilities across threshold partitions, yielding a **continuous expected value** between 1 and 6.

### Old (Incorrect) Algorithm

```
z = Σ(covariate × multiplier)
imputedValue = 1
for each threshold αᵢ:
    if z > αᵢ → imputedValue = i + 2
Result: integer 1–6  (e.g., 2)
```

### New (Correct) Algorithm — CMS Table 8-8

```
z = Σ(covariate × multiplier)                          [Step 1 — unchanged]

P₁ = Φ(α₁ − z)                                         [Step 2]
Pₖ = Φ(αₖ − z) − Φ(αₖ₋₁ − z)    for k = 2..5
P₆ = 1 − Φ(α₅ − z)

Imputed value = 1·P₁ + 2·P₂ + 3·P₃ + 4·P₄ + 5·P₅ + 6·P₆  [Step 3]
Result: continuous value  (e.g., 1.7903)
```

Where Φ(x) is the standard normal CDF, implemented via the Abramowitz & Stegun rational approximation.

---

## Files Modified

### Server-Side (Algorithm)

| File | Changes |
|------|---------|
| `api/utils/serverImputation.js` | Added `normalCDF()`, `computeImputedValueFromScore()`. Updated `calculateImputedValue()`, `imputeMissingGGItems()`, and `getImputationAnalysisData()` to use probability-based calculation. All three now return continuous `number` values instead of padded string codes. |
| `Aegis.DfsCalculator/DFSCalculator.Server/Utils/Imputations.cs` | Added `NormalCDF()`, `ComputeImputedValueFromScore()`. `CalculateImputedValue()` returns `double`. `ImputeMissingGGItems()` returns `Dictionary<string, double>`. `ImputationAnalysisData.ImputedValue` changed from `string?` to `double?`. |
| `Aegis.DfsCalculator/DFSCalculator.Server/Controllers/ImputationController.cs` | Updated to handle `double` return from `CalculateImputedValue` and `Dictionary<string, double>` from `ImputeMissingGGItems`. |
| `Aegis.DfsCalculator/DFSCalculator.Server/Utils/Calculations.cs` | Added `ResolveScore()` helper. `CalculateFunctionScore()` now returns `double` and handles continuous string values (e.g., `"1.7903"`) in `startScores`. Downstream consumers (`ProcessMedicalConditionCategory`, covariate assignments) receive rounded `int` values for compatibility. |

### Client-Side (Score Resolution & Storage)

| File | Changes |
|------|---------|
| `src/utils/calculations.js` | Added `resolveScore(rawValue)` — handles both MDS codes (`"01"`) and continuous strings (`"1.7903"`). Added `scoreToStoredValue(score)` — always returns a string (integers become `"01"`–`"06"`, continuous become `"1.7903"`). Updated `calculateFunctionScore().safe()` to use `resolveScore`. |
| `src/utils/fileParser.js` | Imputed values from server stored as strings via `String(imputed)`. Fallback changed from `1` (number) to `"01"` (string) for API compatibility with C#'s `Dictionary<string, string>`. |

### Client-Side (UI & Toggling)

| File | Changes |
|------|---------|
| `src/components/AdvancedAppDetail.jsx` | `handleTick()` rewritten: imputed items with non-integer start scores allow values `[imputedValue, ⌈imputedValue⌉, ..., 6]`. Toggle up from 1.7903→2→3→...→6. Toggle down from 6→5→...→2→1.7903. Uses `resolveScore` and `scoreToStoredValue`. Subtotals calculation also updated. |
| `src/components/FunctionItemsList.jsx` | `getScore()` and `getStartScore()` use `resolveScore`. Reset logic updated. Delta display uses `toFixed(4)` for non-integers. Added `formatScore()` helper. |
| `src/components/BarbellChart.jsx` + `.css` | Nodes display `toFixed(2)` for continuous values. Added `.barbell-node-wide` and `.barbell-end-node-wide` CSS classes for wider nodes to accommodate decimal text. |
| `src/components/ScoreBarChart.jsx` | Start, End, and Gain totals display 2 decimal places when non-integer. |
| `src/components/ImputationTab.jsx` + `.module.css` | **Removed** the entire threshold bar visualization (the horizontal bar with threshold lines and score marker). Replaced with a `"Visual coming soon"` placeholder in a dashed-border box. Imputed value column shows `toFixed(4)` for continuous values. Added `.visualPlaceholder` CSS class. |
| `src/components/ExportView.jsx` | Score lookups updated to use `resolveScore`. |
| `src/utils/itemAdapters.js` | Score conversion updated to use `resolveScore`. |

---

## Data Flow Summary

```
MDS XML File
  ↓
fileParser.js — parseXml() extracts raw values
  ↓
batchImputeValues() API call → POST /api/imputation (C# or Vercel)
  ↓
Server runs: imputeMissingGGItems()
  - Calculates z = Σ(covariate × multiplier) for each GG item needing imputation
  - Computes continuous imputed value via normalCDF probability formula
  - Returns { imputedValues: { "GG0130A1": 1.7903, ... } }
  ↓
fileParser.js stores values as strings:
  - Valid MDS items:  startScores["GG0130A"] = "01"  (original code)
  - Imputed items:    startScores["GG0130A"] = "1.7903"  (string of continuous value)
  - imputedItems Set tracks which items were imputed
  ↓
resolveScore() handles both formats everywhere:
  - "01" → scoreMap["01"] → 1
  - "1.7903" → parseFloat("1.7903") → 1.7903
  ↓
UI displays continuous values in blue nodes, allows toggling
```

---

## Toggling Behavior for Imputed Items

For an imputed item with start score 1.7903:
- **Allowed values**: `[1.7903, 2, 3, 4, 5, 6]`
- **Toggle up**: 1.7903 → 2 → 3 → 4 → 5 → 6
- **Toggle down**: 6 → 5 → 4 → 3 → 2 → 1.7903
- **At minimum** (1.7903): minus button disabled
- **At maximum** (6): plus button disabled
- Non-imputed items behave as before (integer-only)

---

## Outstanding Items / Next Steps

### 1. Imputation Tab Visual (Placeholder)
The threshold bar visualization was removed from `ImputationTab.jsx` and replaced with a **"Visual coming soon"** placeholder. A new visualization needs to be designed that reflects the probability-based approach (showing the normal distribution partitioned by thresholds, with shaded probability regions, rather than a simple threshold comparison bar).

**Location**: `src/components/ImputationTab.jsx`, lines ~207–210 (inside the expanded covariate detail row, within `<div className={styles.thresholdVisualization}>`).

**Data available from server** (`getImputationAnalysisData` response for each GG item):
- `imputationScore` — the z-score (continuous)
- `thresholds` — array of 5 α values
- `imputedValue` — the continuous expected value (1–6)
- `covariates` — object of non-zero covariate values
- `multipliers` — all multipliers for the item
- `needsImputation` — boolean
- `originalValue` — raw MDS value

### 2. C# Server Rebuild Required
The C# backend needs to be stopped and rebuilt to pick up the algorithm changes. The code compiles clean but the running process (PID 28932 at time of last attempt) locks the output file.

### 3. Pre-existing 400 Error Investigation
A `400 Bad Request` from `/api/function-score` was observed. This appears to be **pre-existing** (not from our changes) — likely caused by test files with missing date fields that produce `null` for `PatientSummary.Age` (non-nullable `int` in C#). The `FunctionScoreCalculationBody.StartScores` values are confirmed to always be strings after our fix.

### 4. C# Covariate Dictionary Type
The C# covariate dictionary remains `Dictionary<string, int>`. The continuous function score is rounded to `int` via `Math.Round()` before being stored as `"Admission Function - Continuous Form"` and squared. A future refactor could change this to `Dictionary<string, double>` for full precision, but this is a larger change that ripples through the entire calculation pipeline.

---

## Key Architecture Notes

- **Proprietary IP protection**: All imputation algorithm logic is server-only. Client-side files (`src/utils/imputationCalculations.js`, `src/utils/fileParser.js`) contain only stubs that throw errors if called directly. The real implementations live in `api/utils/serverImputation.js` (Vercel) and `Aegis.DfsCalculator/DFSCalculator.Server/Utils/Imputations.cs` (C#).

- **Dual backend**: The app runs against either:
  - **Vercel serverless functions** (`api/` directory) — production
  - **C# ASP.NET backend** (`Aegis.DfsCalculator/`) — local development
  Both backends must stay in sync for any algorithm changes.

- **Coefficient versioning**: Imputation multipliers and thresholds are version-specific, selected based on the ARD date (`A2300`). Data lives in `src/data/coefficients-all-versions.json` (JS) and loaded via `CoefficientLoader` (C#).

- **Values are stored as strings**: All GG item values in `startScores` and `modeledValues` are strings for C# API compatibility. MDS codes are `"01"`–`"06"`. Continuous imputed values are `"1.7903"`. The `resolveScore()` function (JS) and `ResolveScore()` method (C#) handle both formats.

- **normalCDF implementation**: Both JS and C# use the Abramowitz & Stegun rational approximation with coefficients `a1..a5` and `p = 0.3275911`. Max error ~1.5×10⁻⁷.

---

## CMS Reference

**CMS Table 8-8 (continued)** — Discharge Function Score (CMS ID: S042.02)⁶⁰

The imputation procedure (Steps 1–4) specifies:
1. Calculate z using imputation regression coefficients × covariates
2. Calculate probabilities for each possible value (1–6) using Φ(αᵢ − z)
3. Compute imputed value as weighted sum: Σ(value × probability)
4. Repeat for each GG item coded as NA
