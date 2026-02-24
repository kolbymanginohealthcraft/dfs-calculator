# DFS Viewer Architecture

## Overview

The Discharge Function Score (DFS) Viewer is a React-based web application that calculates predicted discharge function scores from MDS 3.0 assessment data using CMS-published coefficients.

## Technology Stack

- **Frontend:** React 19 + React Router
- **Build Tool:** Vite
- **Styling:** CSS Modules
- **Data Processing:** xlsx (Excel), JSON (replaced CSV parsing)
- **Charts:** Recharts
- **Backend:** ASP.NET Core 8.0 (C#) with SAML 2.0 authentication
- **Deployment:** Azure Static Web Apps via Bitbucket Pipelines

## Architecture Decisions

### C# Backend as Single Source of Truth

All proprietary algorithm logic (function score calculation, imputation, coefficient loading) lives exclusively in the C# backend (`Aegis.DfsCalculator/`). The React frontend calls the C# API endpoints for all protected calculations.

**Benefits:**
- Single codebase for all algorithm logic (no JS/C# duplication)
- SAML 2.0 authentication protects all calculation endpoints
- Coefficient data loaded at runtime by the backend
- Frontend remains a thin presentation layer

### Data Flow

```
CMS Source Files (Excel/CSV/TXT)
    ↓
Transformation Scripts (scripts/transformers/)
    ↓
Generated Data Files (JSON/CSV)
    ↓
Bundle at Build Time (frontend assets)
    ↓
Runtime: User Uploads MDS XML → C# API Calls → Display Results
```

## Directory Structure

```
dfs-viewer/
├── Aegis.DfsCalculator/           # C# ASP.NET Core backend
│   └── DFSCalculator.Server/
│       ├── Controllers/           # API endpoints (function-score, imputation, etc.)
│       ├── Data/                  # Static data (ICD-to-HCC, covariate maps, coefficients)
│       ├── Utils/                 # Algorithm implementations
│       │   ├── Calculations.cs    # Function score & covariate calculation
│       │   ├── Imputations.cs     # CMS statistical imputation engine
│       │   └── CoefficientLoader.cs # Version-aware coefficient access
│       └── Program.cs             # App startup, SAML auth, routing
├── docs/                          # Project documentation
├── public/                        # Static assets (served as-is)
│   ├── icd10_lookup_2025.json    # ICD-10 code descriptions
│   └── itm_val.csv               # MDS item value descriptions
├── scripts/                       # Data transformation pipeline
│   ├── data-sources/             # Raw CMS source files
│   ├── transformers/             # Data generation scripts
│   └── build-all.cjs             # Master build script
├── src/
│   ├── components/               # React components
│   ├── data/                     # Build-time data imports
│   │   ├── mds_item_lookup.json
│   │   └── instructionContent.js
│   └── utils/                    # Client-side helpers
│       ├── secureApiClient.js    # Authenticated API calls to C# backend
│       ├── authService.js        # SAML auth (login/logout/session)
│       ├── calculations.js       # Client-side score display helpers
│       ├── coefficientLoader.js  # Version-aware coefficient access
│       ├── fileParser.js         # MDS XML parsing
│       └── [other utilities]
└── test-data/                    # Sample MDS files for testing
```

## Key Components

### Data Transformation Pipeline

**Purpose:** Convert CMS regulatory files into app-ready JSON/CSV formats

**Location:** `scripts/transformers/`

**Transformers:**
1. `generateAllCoefficients.cjs` - Extracts multi-version coefficients from Excel
2. `generateIcd10Lookup.cjs` - Converts ICD-10 TXT to JSON
3. `generateIcdToHcc.cjs` - Creates ICD-10 to HCC crosswalk
4. `generateMdsLookup.cjs` - Transforms MDS item definitions

**Run all:** `node scripts/build-all.cjs`

### Coefficient Management

**Multi-Version System** (since Oct 2025)

- Stores all historical CMS coefficient versions (FY 2023, 2025, 2026)
- Automatically selects correct version based on ARD date (A2300)
- Single source of truth: `Aegis.DfsCalculator/DFSCalculator.Server/Data/coefficients-all-versions.json`
- Access via: `src/utils/coefficientLoader.js`

See `docs/COEFFICIENT_MIGRATION.md` for details.

### Core Calculation Engine (C# Backend)

**`Aegis.DfsCalculator/DFSCalculator.Server/Utils/Calculations.cs`**

Main functions:
- `CalculateFunctionScore()` - Computes discharge function score
- `GetFunctionCovariates()` - Extracts covariates from MDS data
- `ExtractPatientSummary()` - Aggregates patient demographics

**`Aegis.DfsCalculator/DFSCalculator.Server/Utils/Imputations.cs`**

Handles missing GG item imputation using CMS statistical methodology (Table 8-8).

### File Parsing (Client-Side)

**`src/utils/fileParser.js`**

Parses MDS 3.0 XML files and orchestrates API calls to the C# backend.

## Data Files

### Build-Time (imported in code)

| File | Purpose | Size |
|------|---------|------|
| `Aegis.DfsCalculator/.../Data/coefficients-all-versions.json` | All CMS coefficient versions (shared with C# backend) | ~300 KB |
| `src/data/mds_item_lookup.json` | MDS item definitions | ~100 KB |

### Runtime (loaded from public/)

| File | Purpose | Size |
|------|---------|------|
| `icd10_lookup_2025.json` | ICD-10 code descriptions | ~2 MB |
| `itm_val.csv` | MDS value descriptions | ~200 KB |

## Calculation Flow

```
1. User uploads MDS XML file
2. Parse XML client-side → extract all item values
3. POST to /api/function-score → C# calculates covariates & weighted score
4. POST to /api/imputation → C# imputes missing GG items
5. Display results + export options
```

## Versioning Strategy

### Coefficient Versions

Managed automatically based on ARD date:
- **Update ID 1:** FY 2023-2024 (Jan 2023 - Sep 2024)
- **Update ID 2:** FY 2025 (Oct 2024 - Sep 2025)  
- **Update ID 3:** FY 2026 (Oct 2025 - Present)

### ICD-10 Codes

Separate files per year: `icd10_lookup_YYYY.json`

Currently using: 2025

## Build & Deploy

### Development
```bash
npm run dev          # Local development server
npm run lint         # ESLint
```

### Production
```bash
npm run build        # Vite production build
npm run preview      # Preview production build locally
```

### Deployment

Automatic deployment via Bitbucket Pipelines on push to `release/*` branches.

**Environment:** Azure Static Web Apps with C# ASP.NET Core backend

## Testing

### Manual Testing
- Sample MDS files in `test-data/examples/`
- `GOOD_EXAMPLE.xml` - Valid file
- `BAD_EXAMPLE.xml` - Test error handling

### Validation
- `test-version-selection.js` - Coefficient version selection tests
- `scripts/test-transformations.cjs` - Data transformation tests

## Performance Considerations

### Bundle Optimization
- Code splitting via React.lazy() for large components
- JSON files gzipped by Vite
- CSS Modules for scoped styles

### Data Loading
- Large files (ICD-10 lookup) loaded on-demand
- Coefficients bundled for instant access
- MDS parsing happens client-side (no backend latency)

## Future Enhancements

### Planned
- [ ] Convert `itm_val.csv` to JSON for faster parsing
- [ ] Add coefficient version indicator in UI
- [ ] Automated testing suite

### Potential
- [ ] TypeScript migration
- [ ] Service worker for offline support
- [ ] Batch file processing

## Maintenance

### Annual Updates (October)

When CMS releases new fiscal year coefficients:

1. Download new files to `scripts/data-sources/`
2. Run `node scripts/build-all.cjs`
3. Test with sample MDS files
4. Deploy

**No code changes required** - version system handles it automatically.

### Dependencies

Update regularly:
```bash
npm outdated         # Check for updates
npm update           # Update within version ranges
```

## Resources

- [CMS SNF PPS](https://www.cms.gov/medicare/payment/prospective-payment-systems/snf-pps)
- [MDS 3.0 Technical Information](https://www.cms.gov/medicare/quality/nursing-home-improvement/mds-30-technical-information)
- [ICD-10-CM Codes](https://www.cms.gov/medicare/coding-billing/icd-10-codes)
