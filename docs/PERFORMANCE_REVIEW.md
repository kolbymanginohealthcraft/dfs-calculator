# Performance Review

This document captures observations and optimization work from the February 2026 codebase review.

---

## Background

The migration from a JavaScript-only frontend to a C# backend introduced network round-trips for operations that were previously client-side. This tradeoff was intentional — it moved proprietary algorithm logic (function score, imputation, covariate extraction) behind SAML authentication. The calculation endpoints are:

- `POST /api/process-file` — **combined** imputation + function score in a single round-trip (primary bulk processing endpoint)
- `POST /api/function-score` — weighted covariate-based function score (used by detail view for manual override recalculation)
- `POST /api/imputation` — single or batch GG item imputation (used by detail view)
- `POST /api/imputation-analysis` — imputation detail breakdown (deferred; on-demand)
- `GET /api/facility-name/{ccn}` — CMS facility name lookup

Each Advanced mode file upload triggers a single `process-file` call. Bulk processing (up to 100 files) uses concurrent batches of 5. The imputation analysis call is deferred until the user views a specific file's Imputation tab.

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

### 7. Combined Imputation + Function Score Endpoint

**Problem:** Each file required two sequential API round-trips: `POST /api/imputation` during parsing (in `fileParser.js`), then `POST /api/function-score` after parsing (in `AdvancedSummaryView.jsx`). Both endpoints receive the same core data (`parsedValues`, `summary`, `icdList`, `startScores`, `ardDate`), meaning the backend derived the same intermediate values (age group, ICD-to-HCC mapping, condition flags) twice per file. For bulk processing, this meant 200 API calls for 100 files.

**Changes:**

Backend:
- Created `ProcessFileController.cs` with `POST /api/process-file` endpoint
- Accepts the union of both request bodies: `parsedValues`, `summary`, `icdList`, `startScores`, `ardDate`, and `targetGGItems`
- Internally runs `ServerImputations.ImputeMissingGGItems()`, merges imputed values into `startScores` (mapping sourceId `"GG0130A1"` → itemId `"GG0130A"`), then runs `ServerCalculations.GetFunctionCovariates()` with the merged scores
- Returns `{ imputedValues, covariates, weightedScore, multipliers }`

Frontend:
- Added `processFileComplete()` in `secureApiClient.js` — calls the new combined endpoint
- Added `skipImputation` option to `handleFileUpload()` in `fileParser.js` — when true, skips the `batchImputeValues` API call during parsing. Also exposes `onTargetGGItems` and `onRawStartScores` callbacks so callers can capture the data needed for the combined endpoint
- Wired the `options` parameter through `handleFileUploadWithValidation()` in `enhancedFileParser.js`
- Updated both processing paths in `AdvancedSummaryView.jsx` (zip and regular) to use `skipImputation: true` and call `processFileComplete()` instead of the separate `calculateFunctionScoreSecure()`. Imputed values from the response are merged back into `startData` for the detail view

Unchanged:
- `AdvancedAppDetail.jsx` still uses the individual `/api/function-score` endpoint (needed for manual override recalculation)
- `ImputationTab.jsx` still uses `/api/imputation-analysis` (deferred, on-demand)
- All original endpoints remain functional for backward compatibility

**Measured result (100-file zip, cold start):**

| Metric | Before (opt #5, warm) | After (combined, cold) | After (combined, warm) |
|--------|----------------------|----------------------|----------------------|
| API calls per file | 2 (imp + fs) | **1** | **1** |
| Total API calls (100 files) | 200 | **100** | **100** |
| Cold batch (first 5 files) | N/A | ~1,700ms avg | N/A |
| Warm batch (last 5 files) | ~400ms wall clock | N/A | ~250–550ms wall clock |
| Warm per-file avg | ~300ms (140+85+overhead) | N/A | **~300ms** |

The combined endpoint consolidates two round-trips into one. Per-file latency is comparable (the backend now does both operations sequentially within a single request), but total network overhead is halved: 100 HTTP requests instead of 200, with proportionally less serialization, fewer TCP round-trips, and a simpler frontend data flow.

### 8. Coefficient Data: Static In-Memory Cache

**Problem:** `CoefficientLoader.LoadAllVersions()` read `coefficients-all-versions.json` (303 KB, 4,172 lines) from disk and deserialized it on every call. There was no caching — each call opened a `StreamReader`, read the full file, and ran `JsonConvert.DeserializeObject`. Every public method in `CoefficientLoader` called `LoadAllVersions()`, and several methods called each other, creating cascading file reads.

**Measured call frequency per single `POST /api/process-file` request:**

| Call site | `LoadAllVersions()` calls |
|-----------|--------------------------|
| `GetImputationMultipliers` in `ImputeMissingGGItems` | 2 (self + `GetUpdateIdForDate`) |
| `GetFunctionCovariates` called from `ImputeMissingGGItems` | 2 |
| `GetImputationThresholds` × N items needing imputation | 2 × N |
| `GetFunctionMultipliers` in `ProcessFileController` | 2 |
| `GetFunctionCovariates` in `ProcessFileController` | 2 |
| **Total per request** | **8 + 2N** |

With ~15 GG items needing imputation: **~38 file reads + deserializations per request**. At concurrency 5: **~190 per batch**. This was the primary driver of the cold-start penalty (~1,500ms) and contributed to warm-state latency.

**Changes:**

`CoefficientLoader.cs`:
- Replaced `LoadAllVersions()` body with a `Lazy<CoefficientAllVersions>` static field using `LazyThreadSafetyMode.ExecutionAndPublication` (thread-safe, exactly-once initialization)
- The actual file I/O moved to a private `LoadFromDisk()` method called only by the `Lazy<>` initializer
- `LoadAllVersions()` now returns `_cachedData.Value` — a single in-memory reference for the process lifetime

`Imputations.cs`:
- `ImputeMissingGGItems`: replaced `GetImputationThresholds(ggItemId, ardDate)` inside the loop (which re-fetched all multipliers per item) with `ExtractThresholds(itemMultipliers)` using the already-available `entry.Value`
- Extracted `ExtractThresholds(Dictionary<string, double?> itemMultipliers)` as a private helper
- Refactored public `GetImputationThresholds` to delegate to the same helper

**Impact:**

| Metric | Before | After |
|--------|--------|-------|
| File reads per request (~15 items) | ~38 | **1** (once per process) |
| File reads per 100-file batch | ~3,800 | **1** |
| JSON deserialization per request | ~38 | **0** (after first) |
| Cold-start penalty source | File I/O + deserialization + JIT | **JIT only** |

**Measured result (100-file zip, warm server):**

| Metric | Before cache (warm) | After cache (warm) | Change |
|--------|--------------------|--------------------|--------|
| Per-request avg | ~300ms | **~75ms** | **−75%** |
| Per-request range | 172–551ms | **34–136ms** | **4× faster** |
| 100-file wall clock (at concurrency 5) | ~8s | **~1.9s** | **−76%** |

The pre-cache "warm" numbers (172–551ms) were still paying ~38 file reads and JSON deserializations per request. With the static cache, the per-request time reflects only the actual computation (imputation + covariate extraction + weighted score calculation).

Cold-start behavior (100-file zip, fresh server): first batch of 5 files takes ~1,700ms avg (JIT compilation), settling to warm-state (~75ms avg) after ~70 files. Total cold-start wall clock is ~20.8s, unchanged from pre-cache — JIT dominates cold start, not file I/O.

All 57 existing tests pass with the cache in place.

### Cumulative Impact Summary (100-File Zip Upload)

| Metric | Original Baseline | After All Optimizations | Improvement |
|--------|-------------------|------------------------|-------------|
| API calls per file | 2 (sequential) | 1 (combined) | **−50%** |
| Total API calls | 200 | 100 | **−50%** |
| Processing pattern | 1 file at a time, 200ms delays | 5 concurrent, no delays | **5× parallel** |
| Main JS bundle (gzip) | 165.64 KB | 85.52 KB | **−48%** |
| Backend file I/O per request | ~38 reads (303 KB each) | **0** (cached) | **~100%** |
| Per-request latency (warm) | ~300ms | **~75ms** | **−75%** |
| Measured 100-file time (cold) | ~60s+ | ~20.8s | **~−65%** |
| Measured 100-file time (warm) | ~60s+ | **~1.9s** | **~−97%** |

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

Pre-cache (optimization #7):

| Endpoint | Cold (first batch) | Warm (steady-state) | Notes |
|----------|---------------------|---------------------|-------|
| `POST /api/process-file` | 1,569–1,994ms | 172–551ms (avg ~300ms) | Combined imputation + function-score |
| `POST /api/imputation` | 1,245–1,483ms | 70–300ms (avg ~180ms) | Used only by detail view now |
| `POST /api/function-score` | 338–493ms | 51–200ms (avg ~120ms) | Used only by detail view (manual overrides) |
| `POST /api/imputation-analysis` | ~420ms | ~420ms | Deferred; only on Imputation tab view |

Post-cache (optimization #8):

| Endpoint | Cold (first batch) | Warm (steady-state) | Notes |
|----------|---------------------|---------------------|-------|
| `POST /api/process-file` | 1,569–1,994ms (unchanged) | **34–136ms (avg ~75ms)** | **−75% from pre-cache warm** |

Cold-start penalty is ~1,700ms avg on the combined endpoint (first batch of 5 files) — unchanged by caching since it's dominated by .NET JIT compilation. Warm steady-state dropped from ~300ms to ~75ms after coefficient caching (optimization #8) eliminated ~38 file reads and JSON deserializations per request.

#### Current per-file call flow (after optimization #7)

Each file upload in Advanced mode now triggers a **single API call**:

- **`POST /api/process-file`** — Called from `AdvancedSummaryView.jsx` via `processFileComplete()`. The backend runs imputation, merges imputed values into start scores, then computes function score covariates — all in one request. Controller: `ProcessFileController.cs`.

**Deferred calls** (unchanged):
- `POST /api/imputation-analysis` — only fires when the user opens the Imputation tab
- `POST /api/function-score` — only used in `AdvancedAppDetail.jsx` for manual override recalculation

#### Remaining areas to investigate

- **Response payload for bulk** — `ProcessFileController.cs` returns `{ imputedValues, covariates, weightedScore, multipliers }`. During bulk processing in `AdvancedSummaryView`, only `weightedScore` and `imputedValues` are used. The `covariates` and `multipliers` are only needed in the detail view (`AdvancedAppDetail.jsx`). A lighter bulk response could skip these fields via a query parameter (e.g., `?bulk=true`). Note: `multipliers` contains proprietary coefficient values — while the endpoint is behind auth, minimizing how often they're transmitted is good practice.

- ~~**Coefficient loading** — resolved in optimization #8. `LoadAllVersions()` was reading from disk on every call with no caching. Added `Lazy<CoefficientAllVersions>` static cache — file is now read once per process lifetime. Also eliminated redundant `GetImputationThresholds` calls inside `ImputeMissingGGItems` by extracting thresholds directly from the already-loaded item multipliers.~~

- **Redundant intermediate computation** — Within the combined endpoint, `ImputeMissingGGItems()` and `GetFunctionCovariates()` both receive the same input data and likely derive overlapping intermediate values (age group, ICD-to-HCC mapping, condition flags). Profiling these two methods server-side could reveal whether shared computation is being repeated and whether extracting a common setup step would help. Note: with coefficient caching (optimization #8), the repeated computation is now in-memory dictionary lookups rather than file I/O, making this less urgent.

#### Key files for backend investigation

| File | Purpose |
|------|---------|
| `Aegis.DfsCalculator/DFSCalculator.Server/Controllers/ProcessFileController.cs` | Combined imputation + function-score endpoint (new) |
| `Aegis.DfsCalculator/DFSCalculator.Server/Controllers/FunctionScoreController.cs` | Function score endpoint (detail view only) |
| `Aegis.DfsCalculator/DFSCalculator.Server/Controllers/ImputationController.cs` | Imputation endpoint (detail view only) |
| `Aegis.DfsCalculator/DFSCalculator.Server/Controllers/ImputationAnalysisController.cs` | Imputation analysis endpoint |
| `Aegis.DfsCalculator/DFSCalculator.Server/Utils/Calculations.cs` (772 lines) | `ServerCalculations.GetFunctionCovariates()` |
| `Aegis.DfsCalculator/DFSCalculator.Server/Utils/Imputations.cs` (459 lines) | `ServerImputations.ImputeMissingGGItems()`, `GetImputationAnalysisData()` |
| `src/utils/secureApiClient.js` | Frontend API client (all endpoint wrappers + latency instrumentation) |
| `src/utils/fileParser.js` | Parsing + optional imputation (`skipImputation` option) |
| `src/components/AdvancedSummaryView.jsx` | Calls `processFileComplete` for bulk processing |

### vendor-pdf Chunk (871 KB)

The `html2pdf.js` library produces the largest chunk. It is already lazy-loaded (only fetched when Advanced mode is accessed). It is statically imported in `AdvancedAppDetail.jsx` (line 16) and `SummaryView.jsx` (line 6). Potential future optimization: dynamically import `html2pdf.js` only when the user clicks "Export to PDF" rather than when the component loads. This would defer 871 KB until the moment it's actually needed.

---

## Principles

- Don't optimize without measuring first
- Latency reductions that improve the user's experience are worth pursuing; micro-optimizations that save milliseconds are not
- The C# backend migration was the right call for IP protection — any performance work should preserve that boundary
- Basic mode (no auth, no API calls) should remain fast since it's the public-facing entry point
