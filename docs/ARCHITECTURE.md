# DFS Viewer Architecture

## Overview

The Discharge Function Score (DFS) Viewer is a React-based web application that calculates predicted discharge function scores from MDS 3.0 assessment data using CMS-published coefficients.

## Technology Stack

- **Frontend:** React 19 + React Router
- **Build Tool:** Vite
- **Styling:** CSS Modules [[memory:4277039]]
- **Data Processing:** PapaParse (CSV), xlsx (Excel)
- **Charts:** Recharts
- **Deployment:** Vercel

## Architecture Decisions

### Static-First Approach

**All coefficient data is bundled at build time** - no backend database required.

**Benefits:**
- Zero API latency
- Works offline after initial load
- Simple deployment (static hosting)
- No server costs
- Easy to maintain

### Data Flow

```
CMS Source Files (Excel/CSV/TXT)
    ↓
Transformation Scripts (scripts/transformers/)
    ↓
Generated Data Files (JSON/CSV)
    ↓
Bundle at Build Time
    ↓
Runtime: User Uploads MDS XML → Calculations → Display Results
```

## Directory Structure

```
dfs-viewer/
├── api/                           # Vercel serverless functions
│   └── facility-name/
│       └── [ccn].js              # CMS facility lookup API
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
│   │   ├── coefficients-all-versions.json
│   │   ├── mds_item_lookup.json
│   │   └── instructionContent.js
│   └── utils/                    # Business logic & helpers
│       ├── calculations.js       # Core scoring algorithms
│       ├── coefficientLoader.js  # Version-aware coefficient access
│       ├── fileParser.js         # MDS XML parsing
│       ├── imputationCalculations.js
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
- Single source of truth: `src/data/coefficients-all-versions.json`
- Access via: `src/utils/coefficientLoader.js`

See `docs/COEFFICIENT_MIGRATION.md` for details.

### Core Calculation Engine

**`src/utils/calculations.js`**

Main functions:
- `calculateFunctionScore()` - Computes discharge function score
- `getFunctionCovariates()` - Extracts covariates from MDS data
- `extractPatientSummary()` - Aggregates patient demographics

**`src/utils/imputationCalculations.js`**

Handles missing GG item imputation using CMS methodology.

### File Parsing

**`src/utils/fileParser.js`**

Parses MDS 3.0 XML files and orchestrates calculations.

## Data Files

### Build-Time (imported in code)

| File | Purpose | Size |
|------|---------|------|
| `coefficients-all-versions.json` | All CMS coefficient versions | ~300 KB |
| `mds_item_lookup.json` | MDS item definitions | ~100 KB |

### Runtime (loaded from public/)

| File | Purpose | Size |
|------|---------|------|
| `icd10_lookup_2025.json` | ICD-10 code descriptions | ~2 MB |
| `itm_val.csv` | MDS value descriptions | ~200 KB |

## Calculation Flow

```
1. User uploads MDS XML file
2. Parse XML → extract all item values
3. Extract ARD date (A2300)
4. Load correct coefficient version for ARD date
5. Calculate covariates from parsed data
6. Apply function multipliers
7. Calculate predicted discharge score
8. Display results + export options
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

Automatic deployment via Vercel on push to main branch.

**Environment:** Static site + serverless functions (facility lookup)

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
