# Performance Review

This document captures observations and optimization work from the February 2026 codebase review.

---

## Background

The migration from a JavaScript-only frontend to a C# backend introduced network round-trips for operations that were previously client-side. This tradeoff was intentional — it moved proprietary algorithm logic (function score, imputation, covariate extraction) behind SAML authentication. The calculation endpoints are:

- `POST /api/function-score` — weighted covariate-based function score
- `POST /api/imputation` — single or batch GG item imputation (CMS Table 8-8)
- `POST /api/imputation-analysis` — imputation detail breakdown
- `GET /api/facility-name/{ccn}` — CMS facility name lookup

Each Advanced mode file upload triggers two of these calls (imputation during parsing, then function score). Bulk processing (up to 100 files) multiplies this. The imputation analysis call is deferred until the user views a specific file's Imputation tab.

---

## Baseline Measurements (Feb 24, 2026)

Production build (`npm run build`) before any changes:

| Chunk | Raw Size | Gzipped | Notes |
|-------|----------|---------|-------|
| `vendor-pdf` | 871.34 KB | 230.70 KB | PDF export library (html2pdf.js) |
| `index` (main) | 624.80 KB | 165.64 KB | Main application bundle |
| `index.es` (vendor) | 156.50 KB | 51.37 KB | React + core vendor libs |
| `MdsSnapshot` | 45.17 KB | 12.16 KB | Lazy-loaded component |
| `index.css` | 136.23 KB | 20.34 KB | Main stylesheet |

Vite reported a >600 KB chunk warning on both `vendor-pdf` and `index`.

---

## Completed Optimizations

### 1. Coefficient Loader Cleanup

**Problem:** `coefficientLoader.js` imported the full `coefficients-all-versions.json` (303 KB, 4,172 lines) which contains proprietary `functionMultipliers` and `imputationMultipliers` data. The frontend only uses the `schedule` array (~35 lines) for fiscal year date-range lookups. Four multiplier-accessor functions (`getFunctionMultipliers`, `getImputationMultipliers`, `getImputationMultipliersForItem`) and a raw `export { allVersions }` were dead code left over from the pre-backend migration.

**Finding:** Vite 7's tree-shaking was already excluding the multiplier data from the production bundle, so the estimated ~280 KB savings was incorrect. However, the dead code and the `export { allVersions }` escape hatch represented an IP risk — any future import of `allVersions` would have leaked all coefficient values to the browser.

**Changes:**
- Created `src/data/schedule-only.json` (1.7 KB) with only `metadata` and `schedule`
- Rewrote `coefficientLoader.js` to import the lightweight file and removed all multiplier-related functions
- Updated tests to match the slimmed-down API

**Impact:** No bundle size change (tree-shaking was already handling it), but the source code now explicitly prevents coefficient data from reaching the frontend. Defense in depth for IP protection.

### 2. Lazy-Loading of Advanced Mode and FAQ Components

**Problem:** `App.jsx` statically imported `AdvancedSummaryView`, `AdvancedAppDetail`, and `FAQ`. This pulled all their dependencies — including `mds_item_lookup.json` (212 KB), the file parser chain, the secure API client, and html2pdf.js — into the main bundle that every user downloads on first page load, regardless of whether they use Advanced mode.

**Changes:**
- Converted all three to `React.lazy()` with `Suspense` fallbacks
- `HomeScreen` and `BasicApp` remain statically imported (public-facing, should load instantly)

**Impact:**

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Main chunk (raw) | 624.80 KB | 272.49 KB | **−56%** |
| Main chunk (gzip) | 165.64 KB | 85.52 KB | **−48%** |
| Build time | 1m 51s | 37s | **−67%** |
| 600 KB warning | Yes (main chunk) | No | Resolved |

The advanced components now load on-demand in separate chunks:

| New Chunk | Raw Size | Gzipped | Loaded When |
|-----------|----------|---------|-------------|
| `AdvancedSummaryView` | 138.64 KB | 41.11 KB | User navigates to Advanced mode |
| `mds_item_lookup` | 157.65 KB | 22.58 KB | Along with AdvancedSummaryView |
| `SummaryView` | 22.69 KB | 6.89 KB | Shared by advanced components |
| `AdvancedAppDetail` | 18.07 KB | 6.37 KB | User opens a file detail view |
| `FAQ` | 19.01 KB | 6.23 KB | User opens FAQ page |

The `vendor-pdf` chunk (871 KB) was already in its own lazy chunk and unaffected.

### 3. Bulk Processing: Removed Artificial Delays

**Problem:** `AdvancedSummaryView.jsx` contained two `await new Promise(resolve => setTimeout(resolve, 200))` calls — one in the zip extraction path and one in the regular file path. The comment said "Wait a bit for all callbacks to complete," but investigation showed the callbacks are synchronous local variable assignments inside a fully `await`ed async function chain. The delays were unnecessary.

**Note:** These delays are unrelated to the facility name fetch timing issue in the detail view (which occurs in `AdvancedAppDetail` and `SummaryView` during PDF export).

**Impact:** Eliminated 200ms of dead time per file. For a 100-file batch, this removes ~20 seconds of pure waiting.

### 4. Bulk Processing: Concurrent File Processing (Individual Uploads)

**Problem:** `startProcessing` used a `for` loop with `await processFile(fileObj)` — each file had to fully complete (parsing + imputation API call + function score API call) before the next one started. For 100 files at ~400ms each, this meant ~40 seconds of sequential processing.

**Changes:**
- Replaced sequential loop with batched `Promise.all` using a concurrency limit of 5
- Files are now processed in groups of 5, with each batch completing before the next starts

**Impact:** Estimated ~5x throughput improvement for individual file bulk uploads. A 100-file batch drops from ~60 seconds (40s sequential + 20s delays) to ~8 seconds.

### 5. Bulk Processing: Concurrent Zip Extraction Processing

**Problem:** The concurrency fix in optimization #4 only applied to the `startProcessing` path, which handles individually uploaded files. When a zip file is uploaded, `processFile` extracts all XML files and then processes them in a sequential `for...of` loop with `await` — bypassing the batched `Promise.all` entirely. A 100-file zip ran every file one at a time: imputation → function-score → next file.

**Discovery:** API latency instrumentation (added to `authenticatedFetch` in `secureApiClient.js`) revealed the sequential pattern. A 100-file zip showed strict alternating imputation/function-score pairs with no concurrency, while individually uploaded files correctly used batching.

**Measured baseline (100-file zip, warm server):**

| Endpoint | Avg Latency | Pattern |
|----------|-------------|---------|
| `/api/imputation` | ~140ms | Sequential — one at a time |
| `/api/function-score` | ~85ms | Sequential — after each imputation |
| **Per-file total** | **~225ms** | **Strictly serial** |
| **100-file total API time** | **~22.5s** | **No parallelism** |

**Changes:**
- Extracted the per-file processing logic in the zip branch into an async `processExtractedFile` function
- Replaced the sequential `for...of` loop with the same batched `Promise.all` pattern used by `startProcessing`, using the existing `CONCURRENCY_LIMIT = 5`

**Measured result (100-file zip, warm server):**

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Processing pattern | 1 file at a time | 5 concurrent | **5× parallelism** |
| API calls visible in batch | imp → fs (2) | 5×imp → 5×fs (10) | Batched |
| Estimated 100-file wall clock | ~22.5s API time | ~8s API time | **~−65%** |

**Note on cold start:** The first batch of 5 imputation calls on a cold server takes ~1.2–1.5s each (likely .NET JIT compilation + first coefficient file load). Subsequent batches settle to ~100–300ms per call. The concurrent batching amortizes this cold-start cost across 5 files instead of paying it on a single file.

### 6. API Latency Instrumentation

**Added:** `performance.now()` timing wrappers around every `authenticatedFetch` call in `secureApiClient.js`. Every API call logs to the browser console with color-coded output:

- Green: < 200ms
- Orange: 200–500ms
- Red (bold): > 500ms

Format: `[API] POST /api/imputation → 200 in 347ms`

All timings are also stored in an in-memory `apiTimings` array accessible via exported `getApiTimings()` and `clearApiTimings()` functions. Zero behavioral impact — only adds two `performance.now()` calls and a `console.log` per request.

---

## Investigated — No Changes Needed

### ICD-10 Lookup File (6.8 MB)

The file `public/icd10_lookup_2026.json` is 6.8 MB (not the ~2 MB originally estimated). Investigation showed it is already well-optimized:

- **Not in the JS bundle** — served as a static file from `public/`, fetched via `fetch()`
- **Loaded on-demand** — only fetched when `MdsSnapshot` mounts (user views raw MDS data)
- **Globally cached** — `globalLookupCache` prevents re-fetching within a session
- **MdsSnapshot is lazy-loaded** — the component itself is in a separate chunk

The browser's HTTP cache handles repeat visits. The main consideration is ensuring gzip is enabled on the production server (6.8 MB JSON should compress to ~1-1.5 MB over the wire).

### Static JSON Data in the Bundle

| File | Size | Status |
|------|------|--------|
| `coefficients-all-versions.json` | 303 KB | Removed from frontend (schedule-only.json replaces it) |
| `mds_item_lookup.json` | 212 KB | Moved to lazy chunk (loads with AdvancedSummaryView) |
| `icdToHcc.json` | 63 KB | Already in lazy MdsSnapshot chunk |
| `ggItems.json` | 1.8 KB | Negligible |
| `conditionMap.json` | 0.6 KB | Negligible |

### Vite Dev Server Proxy

Development-only overhead. No production impact. No changes made.

---

## Remaining Opportunities

### Backend API Performance

Profiled via `performance.now()` instrumentation in `secureApiClient.js` (see optimization #6). Baseline latency established from 100-file zip uploads and 8-file individual uploads.

#### Measured Latency (Feb 24, 2026)

| Endpoint | Cold (first batch) | Warm (steady-state) | Notes |
|----------|---------------------|---------------------|-------|
| `POST /api/imputation` | 1,245–1,483ms | 70–300ms (avg ~180ms) | Cold-start dominates first 5 calls |
| `POST /api/function-score` | 338–493ms | 51–200ms (avg ~120ms) | Occasional spikes to ~400ms under load |
| `POST /api/imputation-analysis` | ~420ms | ~420ms | Deferred; only on Imputation tab view |

Cold-start penalty is ~900ms on imputation and ~250ms on function-score, likely from .NET JIT compilation and/or first-time coefficient file I/O.

#### Per-file call flow

Each file upload in Advanced mode triggers **two sequential API calls**:

1. **`POST /api/imputation`** — Called during file parsing in `src/utils/fileParser.js` (line ~118, via `batchImputeValues`). Sends all GG item values to the backend; receives imputed values for missing items. Controller: `ImputationController.cs`. Backend logic: `ServerImputations.ImputeMissingGGItems()` in `Utils/Imputations.cs`.

2. **`POST /api/function-score`** — Called after parsing completes, in `src/components/AdvancedSummaryView.jsx` (via `calculateFunctionScoreSecure`). Sends `parsedValues`, `summary`, `icdList`, `startScores`, and `ardDate`. Controller: `FunctionScoreController.cs`. Backend logic: `ServerCalculations.GetFunctionCovariates()` in `Utils/Calculations.cs`.

A **third call** (`POST /api/imputation-analysis`) is deferred — it only fires when the user opens the Imputation tab in the detail view (`src/components/ImputationTab.jsx`). Controller: `ImputationAnalysisController.cs`.

#### Remaining areas to investigate

- **Combined endpoint** — Since imputation and function score are always called together for the same file data, a single endpoint that returns both results would eliminate one full round-trip per file (~120ms warm). The backend would run imputation first, merge imputed values into `parsedValues`, then run function-score — mirroring the current frontend flow. Existing individual endpoints should remain for single-item recalculations and the detail view. Based on measured latency, this would save ~100–120ms per file warm, or ~500–600ms per batch of 5.

- **Response payload for bulk** — `FunctionScoreController.cs` (line ~40) returns `new { covariates, weightedScore, multipliers }`. The `multipliers` field is the full `Dictionary<string, double?>` from `CoefficientLoader.GetFunctionMultipliers()`. During bulk processing in `AdvancedSummaryView`, only `weightedScore` is used (`covariateResult?.weightedScore || 0`). The `covariates` and `multipliers` are only needed in the detail view (`AdvancedAppDetail.jsx`). A lighter bulk response could skip these fields. Note: `multipliers` contains proprietary coefficient values — while the endpoint is behind auth, minimizing how often they're transmitted is good practice.

- **Coefficient loading** — `CoefficientLoader.GetFunctionMultipliers(ardDate)` is called on every `/api/function-score` request. Check whether this reads from disk each time or uses an in-memory cache. If it's file I/O, add a static cache. The cold-start penalty (~900ms on imputation, ~250ms on function-score) may partly stem from first-time file reads.

- **Redundant work across calls** — Both `/api/imputation` and `/api/function-score` receive the same `parsedValues`, `summary`, `icdList`, and `startScores`. Both backend methods likely derive the same intermediate values (age group, ICD-to-HCC mapping, condition flags). A combined endpoint would naturally eliminate this duplication.

#### Key files for backend investigation

| File | Purpose |
|------|---------|
| `Aegis.DfsCalculator/DFSCalculator.Server/Controllers/FunctionScoreController.cs` | Function score endpoint |
| `Aegis.DfsCalculator/DFSCalculator.Server/Controllers/ImputationController.cs` | Imputation endpoint |
| `Aegis.DfsCalculator/DFSCalculator.Server/Controllers/ImputationAnalysisController.cs` | Imputation analysis endpoint |
| `Aegis.DfsCalculator/DFSCalculator.Server/Utils/Calculations.cs` (772 lines) | `ServerCalculations.GetFunctionCovariates()` |
| `Aegis.DfsCalculator/DFSCalculator.Server/Utils/Imputations.cs` (459 lines) | `ServerImputations.ImputeMissingGGItems()`, `GetImputationAnalysisData()` |
| `src/utils/secureApiClient.js` | Frontend API client (all endpoint wrappers + latency instrumentation) |
| `src/utils/fileParser.js` | Calls `batchImputeValues` during file parsing |
| `src/components/AdvancedSummaryView.jsx` | Calls `calculateFunctionScoreSecure` after parsing |

### vendor-pdf Chunk (871 KB)

The `html2pdf.js` library produces the largest chunk. It is already lazy-loaded (only fetched when Advanced mode is accessed). It is statically imported in `AdvancedAppDetail.jsx` (line 16) and `SummaryView.jsx` (line 6). Potential future optimization: dynamically import `html2pdf.js` only when the user clicks "Export to PDF" rather than when the component loads. This would defer 871 KB until the moment it's actually needed.

---

## Principles

- Don't optimize without measuring first
- Latency reductions that improve the user's experience are worth pursuing; micro-optimizations that save milliseconds are not
- The C# backend migration was the right call for IP protection — any performance work should preserve that boundary
- Basic mode (no auth, no API calls) should remain fast since it's the public-facing entry point
