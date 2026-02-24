# Environment Variables

## `.env` (Single File)

The project uses a single `.env` file with production URLs. In development, the Vite proxy overrides these by forwarding `/api/*` and `/account/*` to the local C# backend.

```env
# API endpoints (in dev, the Vite proxy overrides these)
VITE_API_BASE_URL=https://dfs.mycare.com
VITE_AUTH_BASE_URL=https://dfs.mycare.com
```

**Previous setup:** The project formerly used separate `.env.development`, `.env.staging`, and `.env.production` files. These were consolidated into a single `.env` in February 2026 since the Vite proxy handles development routing automatically.

## Backend Endpoints

All endpoints are relative to the base URLs above:

**Authentication (GET requests):**
- `/account/login` - Initiates SAML login flow (redirects to IdP)
- `/account/logout` - Signs out and clears session
- `/account/me` - Returns current user info (401 if not authenticated)
- `/account/dev-login` - Creates a dev session (Development environment only)

**API Endpoints (POST, require authentication):**
- `/api/function-score` - Calculate function score
- `/api/imputation` - Calculate imputation for missing GG items
- `/api/imputation-analysis` - Get detailed imputation breakdown

**API Endpoints (GET, no auth required):**
- `/api/facility-name/{ccn}` - CMS facility name lookup

## Notes

- `.env` is in `.gitignore` and will not be committed
- Vite requires the `VITE_` prefix for environment variables
- Base URLs should NOT have a trailing slash
- The C# backend listens on:
  - HTTPS: `https://localhost:7194` (default)
  - HTTP: `http://localhost:5189`
- Trust the localhost certificate: `dotnet dev-certs https --trust`
