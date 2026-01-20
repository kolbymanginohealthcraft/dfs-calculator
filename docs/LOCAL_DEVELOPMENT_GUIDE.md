# Local Development Guide

## Overview

The development process has changed now that we're using the C# backend instead of the Node.js backend.

## Old Process (Before C# Migration)

```bash
# Terminal 1: Start Node.js backend
npm run server

# Terminal 2: Start React frontend
npm run dev
```

## New Process (With C# Backend)

### Option 1: Run C# Backend Locally (Recommended for Full Testing)

```bash
# Terminal 1: Start C# backend
cd Aegis.DfsCalculator/DFSCalculator.Server
dotnet run

# Terminal 2: Start React frontend
npm run dev
```

**Note:** Make sure your `.env.development` has:
```env
VITE_API_BASE_URL=https://localhost:7194
VITE_AUTH_BASE_URL=https://localhost:7194
```

### Option 2: Use Staging Backend (Easier, No Local Backend Needed)

```bash
# Only need one terminal: Start React frontend
npm run dev
```

**Note:** Make sure your `.env.development` has:
```env
VITE_API_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
VITE_AUTH_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
```

## Prerequisites for Running C# Backend Locally

If you want to run the C# backend locally, you'll need:

1. **.NET SDK** (version specified in the project)
   - Check `Aegis.DfsCalculator/DFSCalculator.Server/DFSCalculator.Server.csproj` for the target framework
   - Download from: https://dotnet.microsoft.com/download

2. **Trust the localhost certificate** (for HTTPS):
   ```bash
   dotnet dev-certs https --trust
   ```

3. **Visual Studio or VS Code** (optional, for debugging)
   - Visual Studio 2022 Community (free)
   - OR VS Code with C# extension

## What Changed?

### Old Backend (`npm run server`)
- Node.js/Express server
- Provided `/api/facility-name` endpoint
- Ran on port 3001
- **No longer needed** - replaced by C# backend

### New Backend (C#)
- C# ASP.NET Core backend
- Provides all API endpoints:
  - `/account/login`, `/account/logout`, `/account/me`
  - `/api/function-score`
  - `/api/imputation`
  - `/api/imputation-analysis`
  - `/api/facility-name` (handled by `FacilityController.cs`)
- Runs on `https://localhost:7194` (HTTPS) or `http://localhost:5189` (HTTP)

## Quick Start (Easiest)

If you just want to test the frontend without running the backend locally:

1. **Set up environment file:**
   Create `.env.development` with staging URL:
   ```env
   VITE_API_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
   VITE_AUTH_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
   ```

2. **Start frontend:**
   ```bash
   npm run dev
   ```

3. **Test in browser:**
   - Open `http://localhost:5173`
   - The frontend will connect to the staging backend
   - You can test login, API calls, etc.

## Troubleshooting

### C# Backend Won't Start
- Make sure you have .NET SDK installed: `dotnet --version`
- Trust the certificate: `dotnet dev-certs https --trust`
- Check if port 7194 is already in use

### Frontend Can't Connect to Backend
- Check your `.env.development` file has the correct URL
- Make sure the backend is running (if using localhost)
- Check browser console for CORS errors (backend may need CORS configuration)

### Certificate Errors
- Run: `dotnet dev-certs https --trust`
- Or use HTTP instead: `http://localhost:5189` (update `.env.development`)

## Summary

**You no longer need `npm run server`** - that was the old Node.js backend.

**New workflow:**
- Frontend: `npm run dev` (same as before)
- Backend: Either run C# backend locally OR use staging URL

The easiest approach is to use the staging backend URL in your `.env.development` file, so you only need to run `npm run dev`.
