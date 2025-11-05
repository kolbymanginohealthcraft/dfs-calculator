# DFS Viewer - Discharge Function Score Calculator

A React-based web application for calculating predicted discharge function scores from MDS 3.0 assessment data using CMS-published risk adjustment coefficients.

## Features

- **Automatic Coefficient Versioning** - Uses correct historical CMS coefficients based on assessment date (FY 2023-2026)
- **MDS 3.0 XML Parsing** - Direct upload and parsing of MDS assessment files
- **Interactive Calculations** - Real-time score calculations with covariate visualization
- **Imputation Support** - Handles missing GG items using CMS methodology
- **Export Functionality** - Generate PDF reports and export data
- **Facility Lookup** - Integrated CMS facility name lookup by CCN

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Modern web browser

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

## Usage

1. **Upload MDS File** - Drag and drop or select an MDS 3.0 XML file
2. **Review Data** - View parsed assessment information
3. **Calculate Score** - System automatically calculates predicted discharge function score
4. **View Results** - Explore covariates, imputation details, and function items
5. **Export** - Generate PDF or download data

## Architecture

### Technology Stack

- **Frontend:** React 19, React Router 7
- **Build Tool:** Vite 7
- **Styling:** CSS Modules (no Tailwind)
- **Data:** PapaParse, xlsx, html2pdf
- **Charts:** Recharts
- **Deployment:** Vercel

### Key Design Decisions

- **Static-First:** All coefficient data bundled at build time (no backend database)
- **Multi-Version Support:** Automatic selection of correct CMS coefficients by date
- **Hybrid Processing:** File parsing happens in browser; calculations use secure, authenticated backend APIs

See `docs/ARCHITECTURE.md` for detailed architecture information.

## Project Structure

```
dfs-viewer/
├── api/                    # Vercel serverless functions
├── docs/                   # Documentation
├── public/                 # Static assets (ICD-10 lookup, MDS values)
├── scripts/                # Data transformation pipeline
│   ├── data-sources/       # Raw CMS files (Excel, TXT, CSV)
│   └── transformers/       # Data generation scripts
├── src/
│   ├── components/         # React components
│   ├── data/               # Generated data files
│   └── utils/              # Business logic and calculations
└── test-data/              # Sample MDS files
```

## Data Pipeline

### Source Data

CMS regulatory files are stored in `scripts/data-sources/`:

- Risk Adjustment Excel files (function multipliers)
- Imputation Excel files (imputation coefficients)
- ICD-10-CM code files (diagnosis codes)
- MDS item definitions (CSV files)

### Transformation

Convert CMS files to app-ready formats:

```bash
node scripts/build-all.cjs
```

This runs all transformation scripts:
- `generateAllCoefficients.cjs` - Extract multi-version coefficients
- `generateIcd10Lookup.cjs` - Convert ICD-10 codes to JSON
- `generateIcdToHcc.cjs` - Create ICD-to-HCC crosswalk
- `generateMdsLookup.cjs` - Transform MDS item definitions

### Generated Files

- `src/data/coefficients-all-versions.json` - All historical coefficient versions (~300 KB)
- `public/icd10_lookup_2025.json` - ICD-10 code descriptions (~2 MB)
- `src/data/mds_item_lookup.json` - MDS item definitions (~100 KB)

## Coefficient Versioning

The app automatically selects the correct coefficient version based on the Assessment Reference Date (A2300) from the MDS file:

| ARD Date Range | Update ID | Fiscal Year | Model Intercept |
|----------------|-----------|-------------|-----------------|
| 01/01/2023 - 09/30/2024 | 1 | FY 2023-2024 | 26.6465 |
| 10/01/2024 - 09/30/2025 | 2 | FY 2025 | 30.0118 |
| 10/01/2025 - Present | 3 | FY 2026 | 29.076 |

See `docs/COEFFICIENT_MIGRATION.md` for details.

## Annual Updates

When CMS releases new fiscal year coefficients (typically in October):

1. Download new files to `scripts/data-sources/`
2. Run `node scripts/build-all.cjs`
3. Test with sample MDS files
4. Build and deploy: `npm run build`

**No code changes required** - the versioning system handles it automatically.

## Testing

### Sample Files

Test with example MDS files in `test-data/examples/`:
- `GOOD_EXAMPLE.xml` - Valid assessment
- `BAD_EXAMPLE.xml` - Error handling test

### Validation

```bash
# Test coefficient version selection
node test-version-selection.js

# Test data transformations
node scripts/test-transformations.cjs

# Lint code
npm run lint
```

## Deployment

### Vercel (Current)

Automatic deployment on push to `main` branch.

Configuration in `vercel.json`:
- Static site with serverless functions
- Facility lookup API: `/api/facility-name/[ccn]`

### Manual Deployment

```bash
npm run build
# Deploy dist/ folder to any static host
```

## Documentation

- `docs/ARCHITECTURE.md` - System architecture and design decisions
- `docs/COEFFICIENT_MIGRATION.md` - Multi-version coefficient system
- `docs/MIGRATION_GUIDE.md` - Migration patterns for code updates
- `docs/DEFAULT_VALUE_ARCHITECTURE.md` - GG item default value strategy
- `scripts/data-sources/README.md` - CMS data source information
- `scripts/transformers/README.md` - Transformation script documentation

## Development Guidelines

### Code Style

- Use CSS Modules for component styling (no Tailwind)
- Follow ESLint configuration
- Keep business logic in `src/utils/`
- Keep UI components in `src/components/`

### Performance

- Large data files loaded on-demand
- Code splitting for heavy components
- Coefficient data bundled for instant access

### Git Workflow

- Do not automatically push changes
- User handles git push manually

## Resources

- [CMS SNF PPS](https://www.cms.gov/medicare/payment/prospective-payment-systems/snf-pps) - Payment system information
- [MDS 3.0 Technical Information](https://www.cms.gov/medicare/quality/nursing-home-improvement/mds-30-technical-information) - MDS specifications
- [ICD-10-CM Codes](https://www.cms.gov/medicare/coding-billing/icd-10-codes) - Diagnosis code system

## License

Internal use for Aegis Therapies, Inc.

## Support

For questions or issues, contact the Clinical team.