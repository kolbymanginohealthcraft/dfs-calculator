# Environment Variables Template

Copy these files and create `.env.development`, `.env.staging`, and `.env.production` in your project root.

## `.env.development`

```env
# Development environment variables
# For local development, use localhost if running backend locally
# Backend runs on HTTPS: https://localhost:7194 (or HTTP: http://localhost:5189)
VITE_API_BASE_URL=https://localhost:7194
VITE_AUTH_BASE_URL=https://localhost:7194

# OR use staging URL for testing without running backend locally:
# VITE_API_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
# VITE_AUTH_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net

# Development bypass (optional - for testing without backend)
# VITE_ALLOW_DEV_BYPASS=true
```

## `.env.staging`

```env
# Staging environment variables
VITE_API_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
VITE_AUTH_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
```

## `.env.production`

```env
# Production environment variables
VITE_API_BASE_URL=https://dfs.mycare.com
VITE_AUTH_BASE_URL=https://dfs.mycare.com
```

## Backend Endpoints (from Scott)

All endpoints are relative to the base URLs above:

**Authentication (GET requests):**
- `/account/login` - Logs in user with SAML (https://saml-uat.mycare.com)
- `/account/logout` - Logs out user
- `/account/me` - Returns user info (can check if logged in)

**API Endpoints:**
- `/api/function-score` - Calculate function score (POST)
- `/api/imputation` - Calculate imputation (POST)
- `/api/imputation-analysis` - Get imputation analysis (POST)
- `/api/weather` - Sample API (GET) - for testing

## Notes

- These files are in `.gitignore` so they won't be committed to git
- Vite requires the `VITE_` prefix for environment variables
- The base URLs should NOT have a trailing slash
- For local development, the C# backend runs on:
  - HTTPS: `https://localhost:7194` (default)
  - HTTP: `http://localhost:5189`
- You may need to trust the localhost certificate: `dotnet dev-certs https --trust`
