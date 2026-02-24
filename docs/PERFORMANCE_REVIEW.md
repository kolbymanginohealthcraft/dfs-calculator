# Performance Review — Starting Context

This document captures observations and optimization opportunities identified during the February 2026 codebase review. It is intended as a starting point for a dedicated performance conversation.

---

## Background

The migration from a JavaScript-only frontend to a C# backend introduced network round-trips for operations that were previously client-side. This tradeoff was intentional — it moved proprietary algorithm logic (function score, imputation, covariate extraction) behind SAML authentication. The calculation endpoints are:

- `POST /api/function-score` — weighted covariate-based function score
- `POST /api/imputation` — single or batch GG item imputation (CMS Table 8-8)
- `POST /api/imputation-analysis` — imputation detail breakdown
- `GET /api/facility-name/{ccn}` — CMS facility name lookup

Each Advanced mode file upload triggers at least three of these calls sequentially. Bulk processing (up to 100 files) multiplies this.

---

## Identified Opportunities

### 1. Frontend Bundle Contains Unused Coefficient Data (~280 KB)

`src/utils/coefficientLoader.js` imports the full `coefficients-all-versions.json` (~300 KB), which includes `functionMultipliers` and `imputationMultipliers` for all three fiscal year versions. The frontend only uses the `schedule` array (date ranges and fiscal year labels) for UI display — the multiplier values are never used client-side because all calculations happen on the C# backend.

**Impact:** ~280 KB of unnecessary data in the production JavaScript bundle. This affects initial page load time, especially on slower connections.

**Possible approaches:**
- Create a lightweight `schedule-only.json` that contains just the schedule array, and import that instead of the full file
- Use a Vite plugin or build step to tree-shake the unused keys at build time
- Have the frontend fetch schedule data from a lightweight API endpoint instead of bundling it

**Considerations:** The coefficient data is CMS-published (not proprietary), so this is a bundle size / load time optimization, not a security concern. However, removing it from the bundle also reduces what's trivially inspectable in browser DevTools.

### 2. API Call Patterns in Advanced Mode

When a user uploads an MDS file in Advanced mode, the app makes multiple sequential API calls (function score, then imputation, then imputation analysis). Questions to explore:

- Are any of these calls parallelizable? (e.g., can imputation and function score run concurrently?)
- Could a single combined endpoint reduce round-trips?
- What is the measured latency for each call? (Profiling needed)
- Is the C# backend doing any redundant work across these calls (e.g., re-parsing the same data)?

### 3. Bulk Processing Performance

The bulk upload feature processes up to 100 MDS files. Questions to explore:

- Does it process files sequentially or in parallel?
- How does the backend handle 100+ rapid API calls?
- Would a dedicated bulk endpoint (accepting multiple files in one request) be more efficient?
- Are there opportunities for caching (e.g., coefficient loading, facility lookups)?

### 4. ICD-10 Lookup File Size

`public/icd10_lookup_2026.json` (~2 MB) is fetched on demand when the user needs ICD-10 descriptions. Questions to explore:

- When is this fetched? On first use or eagerly?
- Could it be lazy-loaded or paginated?
- Would a server-side lookup endpoint be faster than shipping the full file?

### 5. Static Data in the Bundle

Several JSON files are imported directly into the JavaScript bundle:

| File | Size | Used For |
|------|------|----------|
| `coefficients-all-versions.json` | ~300 KB | Version selection (only `schedule` needed) |
| `icdToHcc.json` | ~50 KB | ICD-10 to HCC crosswalk (used for diagnosis display) |
| `conditionMap.json` | <1 KB | Condition category labels |
| `ggItems.json` | <1 KB | GG item definitions |

`conditionMap.json` and `ggItems.json` are negligible. `icdToHcc.json` is used client-side for display; assess whether this is better as a lookup API or remains fine in the bundle.

### 6. Vite Dev Server Performance

The dev server proxies API requests to the local C# backend on `https://localhost:7194`. During development, each API call goes through an extra hop (Vite proxy → C# backend → response → Vite → browser). This is development-only and doesn't affect production, but it can make the dev experience feel slower than production.

---

## What to Measure First

Before making changes, establish baselines:

1. **Production bundle size** — `npm run build` and check `dist/` output sizes
2. **API latency per endpoint** — Time each call in the browser Network tab or via `performance.now()` wrappers
3. **Bulk processing total time** — Time a 10-file and 100-file batch end-to-end
4. **Initial page load time** — Lighthouse or WebPageTest on the production URL
5. **Time to interactive** — How long until the user can actually use the app after navigating

---

## Principles

- Don't optimize without measuring first
- Latency reductions that improve the user's experience are worth pursuing; micro-optimizations that save milliseconds are not
- The C# backend migration was the right call for IP protection — any performance work should preserve that boundary
- Basic mode (no auth, no API calls) should remain fast since it's the public-facing entry point
