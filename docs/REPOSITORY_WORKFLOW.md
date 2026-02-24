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

Resolve any conflicts if needed.

### Step 2: Push to your Bitbucket fork

```bash
git push bitbucket Develop
```

### Step 3: Create a Pull Request

- Go to Bitbucket web interface
- Create PR from `dfs-calculator_km0001/Develop` → `dfs-calculator/Develop`
- IT team reviews and merges

### Step 4: IT triggers deployment

Once merged into `Develop`, IT creates or updates a `release/*` branch. The Bitbucket Pipeline (`bitbucket-pipelines.yml`) handles the rest:

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

## Branch Strategy

**Your branches:**
- `safety` — Current working branch
- `main` — Synced with GitHub main

**IT's branches:**
- `Develop` — Development branch (target for your PRs)
- `release/*` — Triggers pipeline deployment
- `DotNetBase` — Historical migration branch (merged)

## Common Tasks

### Syncing with IT

```bash
git fetch upstream Develop
git merge upstream/Develop
# Resolve conflicts if any
git push bitbucket Develop
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
