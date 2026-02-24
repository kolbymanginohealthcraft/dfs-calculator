# DFS Viewer Architecture

## Overview

The Discharge Function Score (DFS) Viewer is a web application that calculates predicted discharge function scores from MDS 3.0 assessment data using CMS-published risk adjustment coefficients.

It operates in two modes:

1. **Basic Mode** — No MDS file required. Users manually input start scores and expected scores, then model end scores. No authentication required.
2. **Advanced Mode** — Drag-and-drop an MDS XML file to automatically calculate start scores, expected scores, and imputation. Requires SAML authentication.

## Technology Stack

- **Frontend:** React 19, React Router 7, Vite 7
- **Styling:** CSS Modules
- **Data Processing:** xlsx (Excel), xml2js / xml-crypto (XML/SAML)
- **Charts:** Recharts
- **PDF Export:** html2pdf.js
- **File Handling:** react-dropzone, jszip
- **Backend:** ASP.NET Core 8.0 (C#) with SAML 2.0 authentication (Sustainsys.Saml2)
- **Secrets:** Azure Key Vault
- **Deployment:** Azure Static Web Apps via Bitbucket Pipelines

## System Architecture

```
Frontend (React/Vite)
  │
  ├── Basic Mode (no auth, no API calls)
  │     └── Manual score input → client-side modeling
  │
  └── Advanced Mode (SAML-authenticated)
        ├── POST /api/function-score      → Function score calculation
        ├── POST /api/imputation          → Missing GG item imputation
        ├── POST /api/imputation-analysis → Imputation detail breakdown
        └── GET  /api/facility-name/{ccn} → CMS facility name lookup
              │
              ▼
        C# ASP.NET Core Backend (SAML-protected)
          ├── Controllers/                → API routing + auth
          ├── Utils/Calculations.cs       → Function score algorithm
          ├── Utils/Imputations.cs        → CMS statistical imputation
          ├── Utils/CoefficientLoader.cs  → Version-aware coefficient access
          └── Data/                       → Shared JSON data (single source of truth)
```

**Frontend API client:** `src/utils/secureApiClient.js` — all calls use session cookies + SAML auth
**Frontend auth:** `src/utils/authService.js` — login/logout/session via `/account/*` endpoints

## Directory Structure

```
dfs-viewer/
├── Aegis.DfsCalculator/              # C# ASP.NET Core backend
│   └── DFSCalculator.Server/
│       ├── Controllers/              # API endpoints
│       │   ├── FunctionScoreController.cs
│       │   ├── ImputationController.cs
│       │   ├── ImputationAnalysisController.cs
│       │   ├── FacilityController.cs
│       │   └── AccountController.cs
│       ├── Data/                     # Shared data (single source of truth)
│       │   ├── coefficients-all-versions.json
│       │   ├── icdToHcc.json
│       │   ├── conditionMap.json
│       │   └── ggItems.json
│       ├── Utils/                    # Algorithm implementations
│       │   ├── Calculations.cs       # Function score & covariates
│       │   ├── Imputations.cs        # CMS statistical imputation
│       │   ├── CoefficientLoader.cs  # Version-aware coefficient access
│       │   └── FacilityLookup.cs     # CMS facility name lookup
│       └── Program.cs               # App startup, SAML auth, routing
├── docs/                             # Active documentation
│   └── archive/                      # Historical docs
├── public/                           # Static assets (served as-is)
│   └── itm_val.json                  # MDS item value descriptions
├── scripts/                          # Data transformation pipeline
│   ├── data-sources/                 # Raw CMS source files (gitignored)
│   ├── transformers/                 # Data generation scripts
│   └── build-all.cjs                # Master build script
├── src/
│   ├── components/                   # Advanced mode React components
│   ├── basic/                        # Basic mode UI
│   │   ├── components/               # BasicLayout, ExpectedScoreSlider, etc.
│   │   └── screens/                  # StartScore, ExpectedScore, EndScore
│   ├── contexts/                     # React contexts
│   │   ├── AuthContext.jsx            # Auth state (SAML session check)
│   │   ├── BulkUploadContext.jsx     # Bulk file processing state
│   │   ├── RedactionContext.jsx      # Data redaction for exports
│   │   └── DataLossWarningContext.jsx
│   ├── data/                         # Frontend-only data
│   │   ├── mds_item_lookup.json      # MDS item definitions
│   │   ├── mds_section_names.json    # MDS section labels
│   │   └── instructionContent.js     # UI instruction text
│   └── utils/                        # Client-side utilities
│       ├── secureApiClient.js        # Authenticated API calls to C# backend
│       ├── authService.js            # SAML auth (login/logout/session)
│       ├── calculations.js           # Score display helpers + shared data re-exports
│       ├── coefficientLoader.js      # Version-aware coefficient access
│       ├── fileParser.js             # MDS XML parsing
│       ├── hccMapping.js             # ICD-10 to HCC lookup
│       └── xmlParser.js              # XML utilities
├── tests/                            # Test scripts
├── test-data/                        # Sample MDS files
├── package.json
└── vite.config.js
```

## Shared Data — Single Source of Truth

All shared data lives in `Aegis.DfsCalculator/DFSCalculator.Server/Data/`. Each JSON file is loaded by C# via a thread-safe lazy singleton, and imported by JavaScript via a relative path to the same file. Generator scripts write directly to this folder.

| File | What | C# Loader | JS Consumer |
|------|------|-----------|-------------|
| `coefficients-all-versions.json` | CMS coefficients (~300 KB) | `CoefficientLoader.cs` | Backend only (multipliers are proprietary algorithm inputs) |
| `icdToHcc.json` | ICD-10 to HCC crosswalk (~3700 entries) | `ICDtoHCC.cs` | `src/utils/hccMapping.js` |
| `conditionMap.json` | 13 medical condition categories | `ConditionMap.cs` | `src/utils/calculations.js` |
| `ggItems.json` | 24 GG item definitions | `GGItems.cs` | `src/utils/calculations.js` |

The frontend `coefficientLoader.js` imports only `src/data/schedule-only.json` (fiscal year date ranges, no multiplier values) for UI display of which FY period a patient falls in. The full coefficient dataset with multiplier values is loaded exclusively by the C# backend.

See `IP_CLASSIFICATION.md` for the complete breakdown of public data vs. proprietary algorithm logic.

## Coefficient Versioning

Managed automatically based on Assessment Reference Date (A2300):

| ARD Date Range | Update ID | Fiscal Year | Model Intercept |
|----------------|-----------|-------------|-----------------|
| 01/01/2023 – 09/30/2024 | 1 | FY 2023-2024 | 26.6465 |
| 10/01/2024 – 09/30/2025 | 2 | FY 2025 | 30.0118 |
| 10/01/2025 – Present | 3 | FY 2026 | 29.076 |

## Data Transformation Pipeline

CMS publishes regulatory files annually. Transformer scripts convert them into app-ready JSON.

**Location:** `scripts/transformers/`

| Script | Output |
|--------|--------|
| `generateAllCoefficients.cjs` | `Data/coefficients-all-versions.json` |
| `generateIcdToHcc.cjs` | `Data/icdToHcc.json` |
| `generateIcd10Lookup.cjs` | `public/icd10_lookup_YYYY.json` |
| `generateMdsLookup.cjs` | `src/data/mds_item_lookup.json` |

**Run all:** `node scripts/build-all.cjs`

## Calculation Flow (Advanced Mode)

```
1. User uploads MDS XML file
2. Client-side: Parse XML → extract all item values
3. Client-side: Determine coefficient version from ARD date
4. POST /api/function-score   → C# calculates covariates & weighted score
5. POST /api/imputation       → C# imputes missing GG items (Table 8-8)
6. POST /api/imputation-analysis → C# returns detailed imputation breakdown
7. Display results with charts, covariates, and export options
```

## Authentication

- **SAML 2.0** via Sustainsys.Saml2 in the C# backend
- Identity Provider managed by IT (myCare SSO)
- Session-based auth with cookies
- In development: `/account/dev-login` bypasses SAML for local testing
- Basic mode requires no authentication

## Development & Operations

- **Local setup:** See `LOCAL_DEVELOPMENT_GUIDE.md`
- **Git workflow & deployment:** See `REPOSITORY_WORKFLOW.md`
- **Annual CMS data updates:** See `TRANSFORMER_USAGE.md`

## Resources

- [CMS SNF PPS](https://www.cms.gov/medicare/payment/prospective-payment-systems/snf-pps)
- [MDS 3.0 Technical Information](https://www.cms.gov/medicare/quality/nursing-home-improvement/mds-30-technical-information)
- [ICD-10-CM Codes](https://www.cms.gov/medicare/coding-billing/icd-10-codes)
