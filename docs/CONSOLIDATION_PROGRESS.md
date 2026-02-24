# Backend Consolidation Progress — February 2026

## Status: DATA CONSOLIDATION COMPLETE

All shared data now lives in exactly one place: `Aegis.DfsCalculator/DFSCalculator.Server/Data/`. Zero data duplication remains between the C# backend and JavaScript frontend. See "What's Left" at the bottom for remaining cleanup items.

---

## Context

This app historically had duplicated algorithm logic across two backends:
1. **JavaScript** — Vercel serverless functions (`api/` directory) + Express server (`src/utils/server.js`)
2. **C#** — ASP.NET Core 8.0 backend (`Aegis.DfsCalculator/DFSCalculator.Server/`)

The duplication existed because the app evolved from client-side → Express backend → C# with SAML. Each migration left remnants of the previous architecture.

**Decision made:** C# is the canonical backend. Vercel deployment is sacrificed. All algorithm logic lives exclusively in C#. The frontend calls C# API endpoints for all protected calculations.

---

## What Was Done (This Session)

### 1. Removed All Duplicated JS Algorithm Code

**Deleted files (14 files, ~91 KB):**

| File | What It Was | C# Equivalent |
|------|-------------|----------------|
| `api/utils/serverImputation.js` | Imputation engine | `Imputations.cs` |
| `api/utils/serverCalculations.js` | Function score / covariates | `Calculations.cs` |
| `api/utils/serverCoefficientLoader.js` | Coefficient loader wrapper | `CoefficientLoader.cs` |
| `api/calculate/function-score.js` | Vercel endpoint | `FunctionScoreController.cs` |
| `api/calculate/imputation.js` | Vercel endpoint | `ImputationController.cs` |
| `api/calculate/imputation-analysis.js` | Vercel endpoint | `ImputationAnalysisController.cs` |
| `api/facility-name/[ccn].js` | Vercel facility lookup | `FacilityController.cs` |
| `api/auth/validate-token.js` | Vercel SSO auth | C# SAML handles this |
| `api/utils/rateLimiter.js` | Vercel middleware | N/A |
| `api/utils/auditLogger.js` | Vercel middleware | N/A |
| `api/utils/timeoutHandler.js` | Vercel middleware | N/A |
| `api/utils/validation.js` | Vercel middleware | N/A |
| `src/utils/server.js` | Old Express server | C# backend |
| `src/utils/imputationCalculations.js` | Dead stub (nothing imported it) | N/A |

The `api/` directory is now completely empty.

### 2. Removed Dead JS Data Files

| File | Why It Was Dead |
|------|-----------------|
| `src/utils/covariateMapping.js` | Only consumer was `serverImputation.js` (deleted). C# has `CovariateMap.cs`. |

### 3. Consolidated ICD-to-HCC Data to Single File

**Before:** Three representations of the same CMS public data:
- `ICDtoHCC.cs` — 3,755 lines of hardcoded C# dictionary
- `src/data/icdToHcc.json` — auto-generated JSON (used by frontend)
- Both contained identical ICD→HCC mapping data

**After:** One JSON file, zero copies:
- `Aegis.DfsCalculator/DFSCalculator.Server/Data/icdToHcc.json` — single source of truth
- `ICDtoHCC.cs` — rewritten to 73 lines; loads JSON at runtime with thread-safe lazy singleton (same pattern as `CoefficientLoader.cs`)
- `src/utils/hccMapping.js` — import path updated to reference the C# Data copy
- `src/utils/calculations.js` — dead `icdToHcc` import removed
- `scripts/transformers/generateIcdToHcc.cjs` — output path updated to write to C# Data folder
- `src/data/icdToHcc.json` — deleted

### 4. Cleaned Up Package Dependencies

Removed from `package.json`:
- `dev:vercel` script
- `vercel` (devDependency)
- `express` (devDependency)
- `cors` (devDependency)
- `node-fetch` (dependency)

Deleted: `vercel.json`

### 5. Updated Documentation

- `docs/ARCHITECTURE.md` — updated to reflect single C# backend, removed Vercel references
- `docs/IMPUTATION_ALGORITHM_CHANGE.md` — removed dual-backend references, noted JS files were deleted

---

## What Was NOT Changed

- **All C# algorithm files** — `Imputations.cs`, `Calculations.cs`, `CoefficientLoader.cs` are untouched
- **All C# controllers** — `FunctionScoreController.cs`, `ImputationController.cs`, etc. are untouched
- **`CovariateMap.cs`** — stays as-is (C# is the only consumer now)
- **`ConditionMap.cs`** — later consolidated to load from `conditionMap.json` (see below)
- **`src/utils/secureApiClient.js`** — already wired to C# endpoints, no changes needed
- **`src/utils/authService.js`** — SAML auth, no changes needed
- **`src/utils/calculations.js`** — client-side display helpers (resolveScore, scoreToStoredValue, etc.) still used by frontend; `conditionMap` later consolidated (see below)

---

## Data Consolidation (All Complete)

### `coefficients-all-versions.json` — CONSOLIDATED

**Before:** Two identical copies:
- `src/data/coefficients-all-versions.json` — used by frontend `coefficientLoader.js`
- `Aegis.DfsCalculator/DFSCalculator.Server/Data/coefficients-all-versions.json` — used by C# `CoefficientLoader.cs`

**After:** One JSON file, zero copies:
- `Aegis.DfsCalculator/DFSCalculator.Server/Data/coefficients-all-versions.json` — single source of truth
- `src/utils/coefficientLoader.js` — import path updated to reference the C# Data copy
- `tests/version-selection.test.cjs` — require path updated
- `scripts/transformers/generateAllCoefficients.cjs` — output path updated to write to C# Data folder
- `src/data/coefficients-all-versions.json` — deleted

### `ConditionMap` — CONSOLIDATED

**Before:** Two copies of the same 13-entry map:
- C#: `ConditionMap.cs` — hardcoded `Dictionary<string, string>`
- JS: inline `conditionMap` object in `src/utils/calculations.js`

**After:** One JSON file, zero copies:
- `Aegis.DfsCalculator/DFSCalculator.Server/Data/conditionMap.json` — single source of truth
- `ConditionMap.cs` — rewritten to load JSON at runtime with thread-safe lazy singleton (same pattern as `ICDtoHCC.cs`)
- `src/utils/calculations.js` — imports from the C# Data JSON, re-exports for downstream consumers

### `GG_ITEMS` — CONSOLIDATED

**Before:** Two copies of the same 24-entry GG item list (id, label, domain):
- C#: `GGItems.cs` — hardcoded `List<GGItem>`
- JS: inline `GG_ITEMS` array in `src/utils/calculations.js`

**After:** One JSON file, zero copies:
- `Aegis.DfsCalculator/DFSCalculator.Server/Data/ggItems.json` — single source of truth
- `GGItems.cs` — rewritten to load JSON at runtime with thread-safe lazy singleton (same pattern as `ICDtoHCC.cs`)
- `src/utils/calculations.js` — imports from the C# Data JSON, re-exports for downstream consumers (~12 JS files import `GG_ITEMS` from `calculations.js`)

---

## Parity Verification Notes

Before deleting the JS code, both implementations were compared line-by-line. The C# versions are actually more robust:

1. **`ResolveScore()`** in `Calculations.cs` handles continuous imputed values (e.g., "1.7903") — the JS `calculateFunctionScore` only handled "01"-"06"
2. **Cached covariates** in `Imputations.cs` avoids recalculating `GetFunctionCovariates` per multiplier
3. **Cleaner API responses** — C# filters out "Model Threshold" keys from multiplier responses
4. **Better null handling** for `O0500I` (handles `^` skip pattern explicitly)

---

## Architecture After Consolidation

```
Frontend (React/Vite)
  ↓ POST /api/function-score
  ↓ POST /api/imputation
  ↓ POST /api/imputation-analysis
  ↓ GET  /api/facility-name/{ccn}
C# ASP.NET Core Backend (SAML-protected)
  ├── Controllers/          → API routing + auth
  ├── Utils/Calculations.cs → Function score algorithm (proprietary)
  ├── Utils/Imputations.cs  → CMS statistical imputation (proprietary)
  ├── Utils/CoefficientLoader.cs → Version-aware coefficient access
  └── Data/                 → Public CMS data files (JSON + static maps)
```

**Frontend API client:** `src/utils/secureApiClient.js` — all calls use session cookies + SAML auth
**Frontend auth:** `src/utils/authService.js` — login/logout/session via `/account/*` endpoints

---

## Build Verification

Both builds pass after all changes:
- `npm run build` — exit code 0, 2009 modules
- `dotnet build` — compiles successfully (only fails to copy .exe if server is already running, which is expected)

---

## Shared Data — Single Source of Truth

All shared data files now live in `Aegis.DfsCalculator/DFSCalculator.Server/Data/`:

| File | What | C# Loader | JS Consumer |
|------|------|-----------|-------------|
| `coefficients-all-versions.json` | CMS coefficients (~300 KB) | `CoefficientLoader.cs` | `src/utils/coefficientLoader.js` |
| `icdToHcc.json` | ICD-10 to HCC crosswalk (~3700 lines) | `ICDtoHCC.cs` | `src/utils/hccMapping.js` |
| `conditionMap.json` | 13 medical condition categories | `ConditionMap.cs` | `src/utils/calculations.js` |
| `ggItems.json` | 24 GG item definitions | `GGItems.cs` | `src/utils/calculations.js` |

**Pattern:** Each JSON file is the single source of truth. C# loads it via a thread-safe lazy singleton (`ICDtoHCC.cs` pattern). JS imports it via a relative path to the C# Data folder. Generator scripts (`scripts/transformers/`) write directly to the C# Data folder.

---

## What Still Uses `src/data/` and `src/utils/`

These folders contain **frontend-only** files with no C# equivalents or duplication:

**`src/data/` (3 files):**
- `mds_item_lookup.json` — MDS item display definitions
- `mds_section_names.json` — MDS section name labels
- `instructionContent.js` — UI instruction text

**`src/utils/` (~15 files):**
- `fileParser.js`, `xmlParser.js` — client-side MDS XML parsing
- `secureApiClient.js` — authenticated API calls to C# backend
- `authService.js` — SAML auth (login/logout/session)
- `coefficientLoader.js` — version-aware coefficient access (imports shared JSON)
- `calculations.js` — score display helpers + re-exports shared data
- `hccMapping.js` — HCC lookup (imports shared JSON)
- `itemAdapters.js`, `scoreHelpers.js`, `itemDefinitions.js` — React component utilities
- Various other UI utilities (themes, compression, pagination, etc.)

These cannot and should not be moved to the C# folder — they are JavaScript running in the browser, not shared data. Vite's module resolution requires them under `src/`.

---

## What's Left

### 1. ~~Dead Proprietary Function Stubs in `calculations.js`~~ — DONE

Removed 15 dead stub functions (`getAgeCovariate`, `processAgeCovariate`, `processMobilityType`, `processUsesWheelchair`, `processBMICovariates`, `processCognitiveFunction`, `processCommunicationImpairment`, `processContinenceCovariates`, `processPriorFunctioning`, `processPriorMobilityDevices`, `processMedicalConditionCategory`, `processHccConditions`, `processAdditionalClinicalConditions`, `getHccCount`, `getFunctionCovariates`). Also removed the unused `getFunctionMultipliers` import and `USE_I0020_DEPENDENCIES` constant. `calculations.js` reduced from ~390 lines to ~215 lines.

Deleted `scripts/bulk-process.js` and `scripts/README-BULK-PROCESS.md` — this CLI tool was superseded by the in-app Analysis Console which supports drag-and-drop bulk processing of up to 100 files. Removed `bulk-process` npm script from `package.json`.

### 2. Intentional Logic Duplication (Not Actionable)

`coefficientLoader.js` (JS) and `CoefficientLoader.cs` (C#) both implement date-range version selection logic. This is intentional — the frontend needs it for UI display (showing which FY period a patient falls in) without a server round-trip. The shared data file is already consolidated; only the selection logic is duplicated.

### 3. Items From `IMPUTATION_ALGORITHM_CHANGE.md`

See `docs/IMPUTATION_ALGORITHM_CHANGE.md` for additional outstanding items:
- ~~Imputation Tab visualization (placeholder)~~ — DONE (replaced with `ImputationDistributionChart`)
- ~~Pre-existing 400 error~~ — DONE (added `MISSING_DOB` and `MISSING_ADMIT_DATE` validation checks in `fileValidation.js`)
- ~~C# covariate dictionary type (`int` vs `double`)~~ — ALREADY RESOLVED (dictionary is `Dictionary<string, double>` throughout)
