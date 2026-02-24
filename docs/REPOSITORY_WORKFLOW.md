# Repository Workflow & Deployment Guide

## Overview

This project uses a multi-repository workflow. Development happens locally and is pushed to GitHub for personal backup. Production deployment goes through Bitbucket, where the IT team reviews and merges via pull request.

## Repositories

### 1. GitHub — Personal Workspace
**Remote:** `origin` → `https://github.com/kolbymanginohealthcraft/dfs-calculator.git`

- Your personal repository for development and version control
- Push frequently for backup and history
- Not connected to any deployment pipeline
- Previously used with Vercel for quick test deployments (see [Vercel Retirement](#vercel-retirement) below)

### 2. Bitbucket Fork — Your IT Fork
**Remote:** `bitbucket` → `https://bitbucket.org/aegis-therapies/dfs-calculator_km0001.git`

- Your fork of the main IT repository
- Push here when changes are ready for IT review
- Branch: `Develop`

### 3. Bitbucket Main — IT's Production Repository
**Remote:** `upstream` → `https://bitbucket.org/aegis-therapies/dfs-calculator.git`

- IT team's main repository (managed by Scott and Hannah)
- Production code lives here
- Deployment is triggered from `release/*` branches
- **Branches:** `Develop`, `release/1.0.0`, `release/1.1.0`, etc.

## Daily Development

```bash
# Terminal 1: Start C# backend
npm run server

# Terminal 2: Start React frontend
npm run dev

# Open http://localhost:5173
```

Commit and push to GitHub as often as you like:

```bash
git add .
git commit -m "Description of changes"
git push origin safety
```

## Deploying to Production

### Step 1: Sync with IT's latest code

```bash
git fetch upstream
git merge upstream/Develop
```

Resolve any conflicts if needed. Conflicts are rare because you work on the frontend (`src/`) and IT works on the backend (`Aegis.DfsCalculator/`). If conflicts appear in `src/`, keep your changes. If they involve IT's backend files, check with Scott or Hannah.

### Step 2: Push to your Bitbucket fork

Push your local `safety` branch to the `Develop` branch on your Bitbucket fork. This avoids needing to switch branches:

```bash
git push bitbucket safety:Develop
```

If the push is rejected (non-fast-forward), it means `bitbucket/Develop` has commits you don't have. Re-run Step 1 to sync, resolve any conflicts, then retry the push.

### Step 3: Create a Pull Request

1. Go to your fork on Bitbucket: `https://bitbucket.org/aegis-therapies/dfs-calculator_km0001`
2. Click **Create pull request**
3. Set the source and destination:
   - **Source:** `dfs-calculator_km0001` / `Develop`
   - **Destination:** `dfs-calculator` / `release/1.1.0` (or current release branch)
4. Add a title and description summarizing the changes (see [Pull Request History](#pull-request-history) for examples)
5. Submit — IT reviews and merges

**Important:** PRs go to a `release/*` branch, not to `Develop`. The `Develop` branch on IT's repo is the base you originally forked from. IT manages the release branch lifecycle.

### Step 4: IT triggers deployment

The Bitbucket Pipeline (`bitbucket-pipelines.yml`) triggers on `release/*` branches:

1. **Build** — `npm ci && npm run build` (produces `dist/`)
2. **Deploy to Staging** — Automatic, uses Azure Static Web Apps CLI
3. **Deploy to Production** — Manual trigger after staging verification

The C# backend is deployed separately by IT to Azure App Service.

## Bitbucket Pipeline

The pipeline is defined in `bitbucket-pipelines.yml` and triggers on `release/*` branches:

| Step | Trigger | What it does |
|---|---|---|
| Build React App | Push to `release/*` | `npm ci` + `npm run build` → `dist/` artifact |
| Deploy to Staging | Automatic | Deploys `dist/` to Azure Static Web Apps staging |
| Deploy to Production | Manual | Deploys `dist/` to Azure Static Web Apps production |

**Required variable:** `AZURE_STATIC_WEB_APPS_API_TOKEN` (configured in Bitbucket repository settings by IT)

## Frontend vs Backend Ownership

| Area | Owner | Location |
|---|---|---|
| React frontend | You (Clinical) | `src/`, `public/`, `scripts/` |
| C# backend | IT (Scott, Hannah) | `Aegis.DfsCalculator/DFSCalculator.Server/` |
| Data transformers | You (Clinical) | `scripts/transformers/` |
| Shared data files | You (Clinical) | `Aegis.DfsCalculator/DFSCalculator.Server/Data/` |
| Pipeline config | IT | `bitbucket-pipelines.yml` |
| SAML / certificates | IT | `appsettings.json`, Azure Key Vault |

## Vercel Retirement

The project previously used Vercel for quick test deployments directly from GitHub. This was a personal convenience for sharing test links before the IT infrastructure was in place.

**Why it no longer works:** The migration to a C# backend means the app now depends on ASP.NET Core for authentication (SAML) and all protected API endpoints (function score, imputation). Vercel only supports serverless Node.js/Edge functions, so the C# backend cannot run there. The old Vercel serverless functions (`api/` directory) and the JavaScript-based calculation logic they used have been removed -- those calculations now live exclusively in the C# backend.

**Current deployment path:** Bitbucket → Azure Static Web Apps (frontend) + Azure App Service (C# backend). This is managed by IT and is the only supported deployment target.

## Pull Request History

### PR #1 — Initial frontend submission (Declined)

- **Target:** `dfs-calculator/release/1.1.0`
- **Outcome:** Declined by IT due to security vulnerabilities in the JavaScript-only architecture. The frontend bundle contained exposed calculation logic in Vercel serverless functions (`api/` directory), and client-side files included proprietary algorithm code (`server.js`, `covariateMapping.js`, `imputationCalculations.js`).
- **Result:** Triggered the migration to a C# ASP.NET Core backend to move all proprietary logic behind SAML authentication.

### PR #2 — C# backend migration (February 2026)

- **Target:** `dfs-calculator_km0001/Develop` → `dfs-calculator/release/1.1.0`
- **Title:** C# backend migration: security remediation and frontend modernization
- **Scope:** 34 commits, 158 files changed (~9,500 insertions, ~12,200 deletions)
- **Key changes:**
  - Full C# ASP.NET Core 8.0 backend with SAML 2.0 authentication
  - All proprietary logic (`Calculations.cs`, `Imputations.cs`) compiled and server-only
  - Removed Vercel serverless functions and all client-side algorithm code
  - Frontend modernized: CSS Modules, lazy loading, new charts, performance optimizations
  - Comprehensive documentation and C# unit tests added

### Writing a PR description

For significant PRs, include:
1. **Summary** — One paragraph explaining the purpose and what changed at a high level
2. **What Changed** — Grouped by area (Backend, Security, Frontend, Performance, Documentation, Removed)
3. **Testing** — How the changes were verified (unit tests, manual testing, specific scenarios)

## Branch Strategy

**Your branches:**
- `safety` — Current working branch (pushed to GitHub as `origin/safety`)
- `main` — Synced with GitHub main

**IT's branches:**
- `Develop` — Base development branch (you forked from this)
- `release/*` — Target for your PRs; triggers pipeline deployment
- `DotNetBase` — Historical migration branch (merged)

## Common Tasks

### Full Bitbucket push and PR workflow

```bash
# 1. Sync with IT's latest code
git fetch upstream
git merge upstream/Develop

# 2. Push your safety branch to Develop on your Bitbucket fork
git push bitbucket safety:Develop

# 3. Create PR on Bitbucket web interface:
#    Source: dfs-calculator_km0001 / Develop
#    Destination: dfs-calculator / release/1.1.0 (or current release branch)
```

### Running tests before pushing

```bash
# Frontend tests
npm test

# C# backend tests
cd Aegis.DfsCalculator
dotnet test
```

## Troubleshooting

### Can't push to Bitbucket
- Verify remote URL: `git remote -v`
- Check that you have write access to your fork
- May need to re-authenticate with Bitbucket

### Conflicts when merging upstream
- IT's backend changes rarely conflict with frontend code
- Keep your frontend changes when conflicts are in `src/`
- Ask IT if conflicts involve `Aegis.DfsCalculator/` or `Program.cs`

### Pipeline fails on build
- Run `npm run build` locally to reproduce
- Check for missing dependencies or import errors
- Ensure `vite.config.js` build settings are correct

---

**Last Updated:** February 2026
