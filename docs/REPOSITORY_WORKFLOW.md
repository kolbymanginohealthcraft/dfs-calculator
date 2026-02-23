# Repository Workflow & Setup Guide

## Overview

This project uses a multi-repository workflow due to organizational requirements. Understanding this setup is crucial for maintaining the codebase and collaborating with the IT team.

## Repository Structure

### 1. GitHub Personal Repository (Your Workspace)
**URL:** `https://github.com/kolbymanginohealthcraft/dfs-calculator`

**Purpose:**
- Your personal workspace for development and testing
- Push changes frequently to test in Vercel
- Not used by IT team
- Your primary working repository

**Workflow:**
- Make changes locally
- Commit and push to GitHub
- Test in Vercel (if configured)
- Use as backup/reference

### 2. Bitbucket Fork (Your IT Fork)
**URL:** `https://bitbucket.org/aegis-therapies/dfs-calculator_km0001/src/Develop/`

**Purpose:**
- Your fork of the main IT repository
- Where you push changes for IT review
- Branch: `Develop` (your working branch)

**Workflow:**
- Pull latest changes from IT's main repo
- Make your changes
- Push to your fork's `Develop` branch
- Create pull request to main IT repo

### 3. Bitbucket Main Repository (IT's Repository)
**URL:** `https://bitbucket.org/aegis-therapies/dfs-calculator/src/Develop/`

**Purpose:**
- IT team's main repository
- Production code lives here
- Managed by Scott and Hannah

**Branches:**
- `Develop` - Development branch
- `DotNetBase` - C# backend migration branch (created by Hannah)
- `main` - Production branch (likely)

## Migration History

### C# Backend Migration

**What Happened:**
1. IT team (Scott & Hannah) migrated backend from Node.js to C# for security/IP protection
2. Hannah created `DotNetBase` branch with C# backend code
3. You pulled `DotNetBase` into your working directory
4. Frontend remains React/Vite (your code)
5. Backend is now C# ASP.NET Core (IT's code)

**Current Structure:**
```
dfs-viewer/
├── src/                          # YOUR frontend (React)
├── public/                       # YOUR frontend assets
├── scripts/                      # YOUR data transformation scripts
├── Aegis.DfsCalculator/
│   ├── DFSCalculator.Server/    # IT's C# backend (USED)
│   └── dfscalculator.client/     # Duplicate frontend (NOT USED - can be removed)
└── api/                          # Old Vercel functions (legacy, may not be needed)
```

## Typical Workflow

### Daily Development

1. **Work in your local repository** (this workspace)
2. **Test locally:**
   ```bash
   # Terminal 1: Start C# backend
   npm run server
   # OR
   cd Aegis.DfsCalculator/DFSCalculator.Server
   dotnet run
   
   # Terminal 2: Start React frontend
   npm run dev
   ```
3. **Commit and push to GitHub** (for your own testing/backup)
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin safety  # or your branch name
   ```

### Pushing to IT Team

1. **Ensure your fork is up to date:**
   ```bash
   # Add IT's repo as upstream (if not already)
   git remote add upstream https://bitbucket.org/aegis-therapies/dfs-calculator.git
   
   # Fetch latest from IT
   git fetch upstream
   
   # Merge IT's changes into your branch
   git merge upstream/Develop
   ```

2. **Push to your Bitbucket fork:**
   ```bash
   # Add your fork (if not already)
   git remote add bitbucket https://bitbucket.org/aegis-therapies/dfs-calculator_km0001.git
   
   # Push to your fork
   git push bitbucket Develop
   ```

3. **Create Pull Request:**
   - Go to Bitbucket web interface
   - Create PR from `dfs-calculator_km0001/Develop` → `dfs-calculator/Develop`
   - IT team reviews and merges

## Important Notes

### Frontend vs Backend

**Frontend (Your Code):**
- Located at root: `src/`, `public/`, `scripts/`
- React + Vite application
- You maintain and develop this
- This is what you work with daily

**Backend (IT's Code):**
- Located: `Aegis.DfsCalculator/DFSCalculator.Server/`
- C# ASP.NET Core
- Managed by IT team
- You typically don't modify this

**Duplicate Frontend (Can Be Removed):**
- Located: `Aegis.DfsCalculator/dfscalculator.client/`
- This was copied by Hannah when setting up Visual Studio
- **NOT USED** - you use the root-level frontend
- Safe to remove (see cleanup guide)

### Git Remotes

Your repository likely has multiple remotes:

```bash
# Check your remotes
git remote -v

# Typical setup:
# origin      → GitHub (your personal repo)
# bitbucket   → Your Bitbucket fork
# upstream    → IT's main Bitbucket repo (optional)
```

### Branch Strategy

**Your Branches:**
- `safety` - Your current working branch (or similar)
- `main` - May sync with GitHub main

**IT's Branches:**
- `Develop` - Development branch
- `DotNetBase` - Migration branch (historical)
- `main` - Production

## Common Tasks

### Syncing with IT Team

```bash
# 1. Fetch latest from IT
git fetch upstream Develop

# 2. Merge into your branch
git checkout Develop  # or your branch
git merge upstream/Develop

# 3. Resolve any conflicts
# ... fix conflicts ...

# 4. Push to your fork
git push bitbucket Develop
```

### Testing Changes Locally

```bash
# Start backend
npm run server

# In another terminal, start frontend
npm run dev

# Open browser to http://localhost:5173
```

### Deploying Changes

1. **Local testing** - Ensure everything works
2. **Push to GitHub** - Your personal backup
3. **Push to Bitbucket fork** - For IT review
4. **Create PR** - Request merge to main IT repo
5. **IT reviews and merges** - They handle deployment

## Troubleshooting

### "DotNetBase branch not found"
- This branch was merged into `Develop`
- You should work from `Develop` branch now

### "Conflicts when merging"
- IT's backend changes may conflict with your frontend
- Usually safe to keep your frontend changes
- Ask IT if unsure about backend conflicts

### "Can't push to Bitbucket"
- Check you have write access to your fork
- Verify remote URL is correct
- May need to authenticate with Bitbucket

## Questions for IT Team

If you encounter issues:
1. **Backend changes needed?** → Contact Hannah or Scott
2. **Deployment issues?** → IT handles deployment
3. **Authentication problems?** → IT manages SAML/certificates
4. **Repository access?** → IT manages permissions

## Summary

- **GitHub**: Your personal workspace (push frequently)
- **Bitbucket Fork**: Your IT workspace (push for review)
- **Bitbucket Main**: IT's production repo (create PRs here)
- **Frontend**: Root-level `src/` (your code)
- **Backend**: `Aegis.DfsCalculator/DFSCalculator.Server/` (IT's code)
- **Duplicate**: `Aegis.DfsCalculator/dfscalculator.client/` (can be removed)

---

**Last Updated:** January 2025  
**Maintained By:** Clinical Team (Kolm Mangino)
