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

### Server-Side (Algorithm — C# Backend)

| File | Changes |
|------|---------|
| `Aegis.DfsCalculator/DFSCalculator.Server/Utils/Imputations.cs` | Added `NormalCDF()`, `ComputeImputedValueFromScore()`. `CalculateImputedValue()` returns `double`. `ImputeMissingGGItems()` returns `Dictionary<string, double>`. `ImputationAnalysisData.ImputedValue` changed from `string?` to `double?`. |
| `Aegis.DfsCalculator/DFSCalculator.Server/Controllers/ImputationController.cs` | Updated to handle `double` return from `CalculateImputedValue` and `Dictionary<string, double>` from `ImputeMissingGGItems`. |
| `Aegis.DfsCalculator/DFSCalculator.Server/Utils/Calculations.cs` | Added `ResolveScore()` helper. `CalculateFunctionScore()` now returns `double` and handles continuous string values (e.g., `"1.7903"`) in `startScores`. Downstream consumers (`ProcessMedicalConditionCategory`, covariate assignments) receive rounded `int` values for compatibility. |

> **Note:** The previously duplicated JS algorithm files (`api/utils/serverImputation.js`, `api/utils/serverCalculations.js`) have been removed. The C# backend is now the single source of truth for all algorithm logic.

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
batchImputeValues() API call → POST /api/imputation (C# backend)
  ↓
Server runs: ImputeMissingGGItems()
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

## MDS Skip Cascade Rules (Skipped vs. Not Attempted)

### Problem

The MDS form has built-in skip patterns: when a "gate" item is coded as ANA (Activity Not Attempted: `07`, `09`, `10`, `88`), downstream items in the same sequence are skipped entirely. These skipped items must use the **Skipped covariate** (not the Not Attempted covariate) when computing imputation scores for other GG items. Using the wrong covariate applies the wrong multiplier, changing the imputed value.

**Example**: When imputing GG0170F1 (Toilet Transfer), the covariate for Walk 10 Feet Uneven Surface (GG0170L1) was incorrectly using "Not Attempted" (multiplier = −0.0774) instead of "Skipped" (multiplier = 0), because GG0170I1 (Walk 10 Feet) was coded `88` (ANA).

### MDS Skip Cascade Rules

| Gate Item | Gate Condition | Downstream Items Become Skipped (`^`) |
|-----------|---------------|---------------------------------------|
| GG0170I1 (Walk 10 Feet) | ANA (07, 09, 10, 88) | J1 (Walk 50 Feet), K1 (Walk 150 Feet), L1 (Walk 10 Feet Uneven) |
| GG0170M1 (1 Step - Curb) | ANA (07, 09, 10, 88) | N1 (4 Steps), O1 (12 Steps) |
| GG0170N1 (4 Steps) | ANA (07, 09, 10, 88) | O1 (12 Steps) |

No cascade applies to wheelchair items (R1, S1).

### Implementation

**Hard override**: When the gate item is ANA, downstream items are forced to `^` (skipped) regardless of their raw MDS value.

A new helper function `getEffectiveGGValue()` / `GetEffectiveGGValue()` checks the gate item's raw value before returning the downstream item's value. All covariate lookup code now calls this function instead of reading `parsedValues` directly.

### Items With Skipped Covariate

Seven GG items conceptually have a separate "Skipped" covariate: **J1, K1, L1, N1, O1, R1, S1**. However, the CMS coefficient data only includes non-zero Skipped multipliers for **J1, N1, O1, and R1**. The Skipped multipliers for K1, L1, and S1 are zero and therefore omitted from `coefficients-all-versions.json`.

The previous code determined whether an item had a Skipped covariate by searching the multiplier dictionary for a matching key. This failed for K1, L1, and S1 (zero-valued multipliers are absent), causing `^` to be misclassified as "Not Attempted."

**Fix**: Replaced the dictionary-based check with a hardcoded constant `ITEMS_WITH_SKIPPED_COVARIATE` containing all 7 items. The distinction between Skipped and Not Attempted is now always correct, regardless of whether the Skipped multiplier is zero or non-zero.

### Files Modified

| File | Changes |
|------|---------|
| `Aegis.DfsCalculator/DFSCalculator.Server/Utils/Imputations.cs` | Added `ITEMS_WITH_SKIPPED_COVARIATE`, `SKIP_CASCADE_WALK_DOWNSTREAM`, `SKIP_CASCADE_STEP_M_DOWNSTREAM`, `GetEffectiveGGValue()`. Updated `GetGGItemSpecificCovariate()` and inline covariate code in `ImputeMissingGGItems()` to use effective values and hardcoded item set. Also fixed a pre-existing bug where the inline `hasSkippedCovariate` check in `ImputeMissingGGItems` was comparing against `ggItemId` (the item being imputed) instead of `itemId` (the covariate item). |

---

## Outstanding Items / Next Steps

### ~~1. Imputation Tab Visual (Placeholder)~~ — DONE

The "Visual coming soon" placeholder has been replaced with the `ImputationDistributionChart` component. The chart shows the normal distribution partitioned by thresholds, with shaded probability regions and the z-score marker. Each expanded covariate detail row displays the z-score, threshold positions, per-value probabilities, and the resulting continuous imputed value.

### ~~2. Pre-existing 400 Error Investigation~~ — DONE

The 400 was caused by MDS files missing DOB (`A0900`) or all admission date fields (`A2400B`, `A1600`, `A1900`), producing `null` for `PatientSummary.Age` (non-nullable `int` in C#). Fixed by adding validation checks in `src/utils/fileValidation.js` — files missing these fields are now rejected at upload time with clear error messages (`MISSING_DOB`, `MISSING_ADMIT_DATE`) before they ever reach the API.

### ~~3. C# Covariate Dictionary Type~~ — ALREADY RESOLVED

The covariate dictionary is already `Dictionary<string, double>` throughout `Calculations.cs`. The function score flows through as a full-precision `double` — no `Math.Round()` or `int` cast is applied. The doc was written before this was fixed.

---

## Key Architecture Notes

- **Proprietary IP protection**: All imputation algorithm logic lives exclusively in the C# backend (`Aegis.DfsCalculator/DFSCalculator.Server/Utils/Imputations.cs`). The frontend calls the API and never has access to the algorithm.

- **Single backend**: The app runs against the C# ASP.NET Core backend (`Aegis.DfsCalculator/`) with SAML 2.0 authentication. Algorithm changes only need to be made in one place.

- **Coefficient versioning**: Imputation multipliers and thresholds are version-specific, selected based on the ARD date (`A2300`). Data loaded via `CoefficientLoader.cs`.

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
