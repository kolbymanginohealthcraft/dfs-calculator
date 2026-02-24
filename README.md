# DFS Viewer — Discharge Function Score Calculator

A web application for calculating predicted discharge function scores from MDS 3.0 assessment data using CMS-published risk adjustment coefficients.

## Features

- **Two Modes** — Basic mode for manual score input (no auth required), Advanced mode for full MDS file processing (SAML-authenticated)
- **Automatic Coefficient Versioning** — Selects correct CMS coefficients based on assessment date (FY 2023–2026)
- **MDS 3.0 XML Parsing** — Drag-and-drop upload with automatic data extraction
- **Imputation** — Handles missing GG items using CMS statistical methodology (Table 8-8)
- **Bulk Processing** — Process up to 100 MDS files at once via the Analysis Console
- **Export** — PDF reports and data export
- **Facility Lookup** — CMS facility name lookup by CCN

## Quick Start

### Prerequisites

- Node.js 16+
- .NET 8.0 SDK (for the C# backend)

### Installation

```bash
npm install
```

### Development

```bash
# Terminal 1: Start the C# backend
npm run server

# Terminal 2: Start the Vite dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies API requests to the local C# backend automatically.

### Production Build

```bash
npm run build
```

Output goes to `dist/`.

## Project Structure

```
dfs-viewer/
├── Aegis.DfsCalculator/              # C# ASP.NET Core backend
│   └── DFSCalculator.Server/
│       ├── Controllers/              # API endpoints
│       ├── Data/                     # Shared data (single source of truth)
│       ├── Utils/                    # Algorithm implementations
│       └── Program.cs               # Startup, SAML auth, routing
├── docs/                             # Active documentation
├── public/                           # Static assets
├── scripts/                          # Data transformation pipeline
│   ├── data-sources/                 # Raw CMS source files (gitignored)
│   └── transformers/                 # Data generation scripts
├── src/
│   ├── components/                   # Advanced mode React components
│   ├── basic/                        # Basic mode UI
│   ├── contexts/                     # React contexts (auth, bulk upload, etc.)
│   ├── data/                         # Frontend-only data files
│   └── utils/                        # Client-side utilities
├── tests/                            # Test scripts
└── test-data/                        # Sample MDS files
```

## Architecture

- **Frontend:** React 19, Vite 7, CSS Modules, Recharts
- **Backend:** ASP.NET Core 8.0 (C#), SAML 2.0 via Sustainsys.Saml2
- **Deployment:** Azure Static Web Apps + Azure App Service via Bitbucket Pipelines

All proprietary algorithm logic lives exclusively in the C# backend. The React frontend handles file parsing and UI, then calls C# API endpoints for all protected calculations. Shared data files (coefficients, ICD-to-HCC, condition maps, GG items) live in a single location under the C# `Data/` folder and are consumed by both C# and JavaScript.

See `docs/ARCHITECTURE.md` for the full architecture reference.

## Data Pipeline

CMS publishes regulatory files annually. Transformer scripts convert them into app-ready JSON:

```bash
node scripts/build-all.cjs
```

See `docs/TRANSFORMER_USAGE.md` for details.

## Testing

```bash
npm test                     # Coefficient version selection tests
npm run test:transformers    # Data transformation tests (requires CMS source data)
npm run lint                 # ESLint
```

Sample MDS files for manual testing are in `test-data/`.

## Annual Updates (October)

When CMS releases new fiscal year coefficients:

1. Download new files to `scripts/data-sources/`
2. Run `node scripts/build-all.cjs`
3. Run `npm test` to verify version selection
4. Test with sample MDS files
5. Deploy

No code changes required — the versioning system handles new fiscal years automatically.

## Documentation

- `docs/ARCHITECTURE.md` — System architecture and design decisions
- `docs/LOCAL_DEVELOPMENT_GUIDE.md` — Dev environment setup
- `docs/AUTHENTICATION.md` — Authentication architecture and SAML flow
- `docs/TRANSFORMER_USAGE.md` — Data transformation pipeline
- `docs/TROUBLESHOOTING.md` — Common issues and fixes

## Resources

- [CMS SNF PPS](https://www.cms.gov/medicare/payment/prospective-payment-systems/snf-pps)
- [MDS 3.0 Technical Information](https://www.cms.gov/medicare/quality/nursing-home-improvement/mds-30-technical-information)
- [ICD-10-CM Codes](https://www.cms.gov/medicare/coding-billing/icd-10-codes)

## License

Internal use — Aegis Therapies, Inc.
