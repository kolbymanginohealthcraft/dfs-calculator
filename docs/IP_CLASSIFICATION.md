# Intellectual Property Classification

This document defines the boundary between **publicly available CMS data** and **proprietary Aegis intellectual property** within the DFS Viewer application.

## Guiding Principle

**Every piece of data in this application comes from CMS.** The coefficient multiplier values, the covariate definitions, the covariate multipliers, the imputation thresholds, the ICD-to-HCC crosswalk, the GG item definitions, the condition categories — all of it is extracted from publicly available CMS regulatory appendix files that anyone can download.

Aegis did not create any of this data. What Aegis created is the **working software that assembles all of it** into a comprehensive tool that synthesizes hundreds of data points across multiple CMS-published tables to produce a predicted discharge function score. The intellectual property is the implementation — the code that knows how to read, connect, and apply all of these public ingredients together.

---

## Public Data (CMS-Published)

All data in the application originates from CMS-published sources. This includes values that might intuitively seem proprietary but are not:

- **Function multipliers** — The numeric weights applied to each covariate in the risk adjustment model (e.g., "Admission Function - Continuous Form": 1.2403). Published in the CMS Risk Adjustment Appendix file.
- **Covariate definitions** — The named covariates themselves (e.g., "Primary Medical Condition Category: Stroke", "Moderately Impaired Cognition", "Bowel Continence: Frequently"). Defined in the CMS SNF QRP Measure Calculations and Reporting User's Manual.
- **Covariate multipliers** — The per-covariate weights used in both the function score model and the imputation models. Published in the CMS Risk Adjustment and Imputation Appendix files.
- **Imputation thresholds (alphas)** — The ordinal probit cut points for each GG item. Published in the CMS Imputation Appendix file.
- **Imputation coefficients** — The per-covariate weights used in the imputation regression models. Published in the CMS Imputation Appendix file.

These files contain data extracted from those CMS documents:

| File | Source | Purpose |
|------|--------|---------|
| `coefficients-all-versions.json` | CMS Risk Adjustment & Imputation Appendix files (annual) | Function multipliers, imputation multipliers, imputation thresholds, fiscal year schedule — all versioned by fiscal year |
| `icdToHcc.json` | CMS ICD-10-CM to HCC crosswalk | Maps ~3,700 ICD-10 diagnosis codes to HCC categories |
| `conditionMap.json` | CMS MDS 3.0 specification | Maps 13 I0020 condition codes to category labels |
| `ggItems.json` | CMS MDS 3.0 specification | Defines the 24 GG self-care and mobility items (IDs, labels, domains) |
| `schedule-only.json` | Derived from coefficient file metadata | Fiscal year date ranges and version identifiers (no multiplier values) |
| `mds_item_lookup.json` | CMS MDS 3.0 Data Set | MDS item IDs, labels, and section structure for UI display |
| `mds_section_names.json` | CMS MDS 3.0 Data Set | Section letter-to-name mapping (e.g., "A" → "Identification Information") |
| `icd10_lookup_YYYY.json` | CMS ICD-10-CM code files | ICD-10 code descriptions for UI display |
| `itm_val.json` | CMS MDS 3.0 Data Set | Valid values and descriptions per MDS item |

### Public client-side logic

The following frontend utilities use only CMS-published definitions and perform no proprietary calculation:

| File | What it does |
|------|-------------|
| `calculations.js` | Score maps (MDS codes → numeric values), date/age formatting, mobility type determination, client-side function score summing (sum of 10 GG items — this is the CMS-defined formula), re-exports of `conditionMap.json` and `ggItems.json` |
| `coefficientLoader.js` | Determines which fiscal year schedule period an ARD date falls in. Imports only `schedule-only.json` — no coefficient multiplier values |
| `hccMapping.js` | Looks up HCC values for ICD-10 codes using the public CMS crosswalk |
| `covariateRelatedItems.js` | Maps covariate names to the MDS item IDs that feed into them (used for UI highlighting, not calculation) |
| `fileParser.js` | Parses MDS XML files into key-value pairs, groups by section, identifies missing GG items |
| `xmlParser.js` | Low-level XML parsing utilities |

---

## Proprietary Intellectual Property (Server-Only)

These files contain Aegis's implementation of the DFS prediction and imputation algorithms. They are compiled into the C# backend and **never included in the frontend bundle**.

### Algorithm files

| File | What it protects |
|------|-----------------|
| `Calculations.cs` | **Function score covariate derivation.** The complete logic that transforms 100+ parsed MDS values, patient demographics, ICD-10 codes, and CMS-published coefficient multipliers into individual covariates, then weights them to produce a predicted discharge function score. Includes covariate resolution order, I0020 dependency methodology, interaction term handling, and the specific formula that combines all covariates into a weighted score. |
| `Imputations.cs` | **Statistical imputation of missing GG items.** Ordinal probit regression using CMS-published thresholds and coefficients, including: the normal CDF approximation (Abramowitz & Stegun), z-score accumulation from patient covariates, threshold-based probability distribution, continuous expected value calculation, skip/cascade logic for walker vs. wheelchair mobility paths, and batch imputation sequencing. |
| `CoefficientLoader.cs` | **Version-aware coefficient access.** Loads the full `coefficients-all-versions.json` and provides date-range-based version selection for both function score and imputation multipliers. The data it loads is CMS-published; its role is providing organized, version-aware access that the algorithm files depend on. |

### What makes the algorithm proprietary

CMS publishes all of the data — the coefficient tables, covariate definitions, multiplier values, imputation thresholds, and the general statistical methodology — in their SNF QRP manuals and appendix files. Any organization can download those same files.

What Aegis has built is the **working software that assembles all of it**: the implementation that reads those published tables, connects them to real patient data from MDS assessments, and produces accurate predictions. The proprietary value is in the specific engineering decisions that make this work:

- **Covariate derivation rules** — How raw MDS values are transformed into the covariates that the CMS model expects (e.g., which continence codes map to which covariate, how cognitive impairment is classified from BIMS scores, how mobility type gates which items are included)
- **I0020 dependency methodology** — The configurable logic that determines how the primary medical condition code (I0020) influences covariate computation
- **Imputation sequencing** — The order in which missing GG items are imputed, including cascade dependencies where imputing one item affects the inputs to subsequent imputations
- **Skip pattern handling** — How Activity Not Attempted (ANA) codes and skip patterns are resolved differently for walkers vs. wheelchair users
- **Edge case handling** — Default values, fallback chains, validation rules, and boundary conditions that make the algorithm robust against real-world MDS data variability
- **End-to-end synthesis** — The complete pipeline from raw XML upload through parsing, validation, imputation, covariate derivation, and score prediction — assembled into a single cohesive tool

### Protected API endpoints

All proprietary logic is accessed exclusively through authenticated API endpoints:

| Endpoint | Controller | Algorithm |
|----------|-----------|-----------|
| `POST /api/process-file` | `ProcessFileController.cs` | Combined imputation + function score (bulk processing) |
| `POST /api/function-score` | `FunctionScoreController.cs` | Covariate derivation + weighted score |
| `POST /api/imputation` | `ImputationController.cs` | Single or batch GG item imputation |
| `POST /api/imputation-analysis` | `ImputationAnalysisController.cs` | Detailed imputation breakdown for UI display |

These endpoints require SAML 2.0 authentication. The frontend sends parsed MDS data and receives only the computed results — covariates, scores, and imputed values — never the algorithm logic itself.

---

## The Boundary in Practice

```
┌──────────────────────────────────────────────────────┐
│  CMS-PUBLISHED DATA (Public — Used by Both Sides)    │
│                                                      │
│  • Function multipliers (risk adjustment appendix)   │
│  • Covariate definitions and multiplier values       │
│  • Imputation coefficients and thresholds (alphas)   │
│  • ICD-10 → HCC crosswalk                            │
│  • GG item definitions and condition categories      │
│  • Fiscal year schedule and version history          │
│  • MDS item specifications and value descriptions    │
└──────────────────────────────────────────────────────┘
        │                              │
        ▼                              ▼
┌────────────────────────┐  ┌──────────────────────────┐
│  FRONTEND              │  │  BACKEND                 │
│  (Client Bundle)       │  │  (Compiled C#)           │
│                        │  │                          │
│  • XML parsing         │  │  • Covariate derivation  │
│  • Score display       │  │  • Weighted scoring      │
│  • GG item labels      │  │  • Statistical imputation│
│  • ICD/HCC lookup      │  │  • Cascade sequencing    │
│  • Schedule dates      │  │  • Skip pattern logic    │
│  • Score summing       │  │  • Edge case handling    │
│  • PDF export          │  │  • I0020 methodology     │
│  • Chart rendering     │  │                          │
│                        │  │  The assembly of all     │
│  Uses public data      │  │  public data into a      │
│  for display only      │  │  working prediction      │
│                        │  │  system = Aegis IP       │
│  secureApiClient.js ──────▶                          │
│        (authenticated HTTP)                          │
└────────────────────────┘  └──────────────────────────┘
```

---

## Maintaining This Boundary

When adding new features or modifying existing ones:

1. **Never move algorithm logic to the frontend.** The data is all public — the code that assembles it is the IP. If a new calculation is needed client-side, create a backend endpoint and call it through `secureApiClient.js`.
2. **All CMS data is safe to share.** Multiplier values, covariate definitions, thresholds, ICD mappings — all of it is CMS-published. The frontend can import and display any of this data. If unsure whether something is CMS-published, check the source appendix files in `scripts/data-sources/`.
3. **Computed results can be cached client-side.** The frontend caches covariates, multipliers, and scores returned by the backend (in `_rawData` and `userCovariates`). Caching results is fine — exposing the logic that produced them is not.
4. **The distinction is data vs. logic.** Showing a user that the multiplier for "Stroke" is -9.2667 is fine (that's a CMS-published number). Exposing the code that determines *when and how* that multiplier gets applied to a specific patient's data is not.
