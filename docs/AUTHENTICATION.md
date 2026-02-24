# Authentication Architecture

## History

Authentication in the DFS Calculator has gone through three phases:

### Phase 1: URL/Referrer Check (Original)

The original approach attempted to protect Advanced mode by checking whether the user arrived from the myCare portal. The frontend inspected the URL or HTTP referrer to determine access. This was implemented through a React context originally called `PortalContext`, with a boolean `isFromPortal` that gated access to Advanced mode.

This approach was fragile -- referrer headers can be spoofed, stripped by browsers, or lost during redirects -- and offered no real protection for the proprietary calculation logic.

### Phase 2: C# Backend with SAML SSO (Current)

The IT department implemented proper SAML 2.0 authentication through a C# ASP.NET Core backend. This replaced the referrer-based check with real session-based authentication:

- **Identity Provider (IdP):** myCare portal (SAML SSO)
- **Service Provider (SP):** C# backend using [Sustainsys.Saml2](https://github.com/Sustainsys/Saml2)
- **Session management:** ASP.NET cookie authentication with Data Protection keys
- **Certificate management:** SP certificate stored in Azure Key Vault; IdP certificate installed in the local certificate store

The calculation endpoints (`/api/function-score`, `/api/imputation`, `/api/imputation-analysis`) now live entirely in the C# backend, so the proprietary algorithm is never exposed to the browser.

### Phase 3: Frontend Naming Cleanup (February 2026)

The legacy `PortalContext` / `isFromPortal` / `usePortal` naming was renamed to `AuthContext` / `isAuthenticated` / `useAuth` to accurately reflect that authentication is now handled by SAML, not by checking the portal URL.

## Current Architecture

### Production Flow

```
User on public website          User on myCare portal
        |                               |
   (no session)                  SAML SSO login
        |                               |
   Basic mode only              Session cookie set
                                        |
                                 Full access (Basic + Advanced)
```

1. User accesses the app (hosted on company website or embedded in myCare portal)
2. Frontend calls `GET /account/me` to check session status
3. If no session: `isAuthenticated = false` -- user sees Basic mode only
4. If authenticated via portal: SAML flow creates a session cookie, `/account/me` returns user info, `isAuthenticated = true` -- user gets Advanced mode

### Development Flow

1. Frontend starts via `npm run dev` (Vite on port 5173)
2. C# backend starts via `npm run server` (ASP.NET on `https://localhost:7194`)
3. Vite proxies `/account/*` and `/api/*` requests to the C# backend
4. On app load, `AuthContext` calls `/account/me`
5. If 401 and in development mode, automatically calls `/account/dev-login` to create a local session as `dev-user@localhost`
6. Retries `/account/me` -- now returns 200 with user info
7. `isAuthenticated = true` -- full access

The `/account/dev-login` endpoint only works when `ASPNETCORE_ENVIRONMENT=Development`. It returns 404 in production.

### Key Files

| File | Purpose |
|---|---|
| `src/contexts/AuthContext.jsx` | React context providing `isAuthenticated`, `isLoading`, `user` |
| `src/utils/authService.js` | `getCurrentUser()`, `login()`, `logout()` functions |
| `src/utils/secureApiClient.js` | Authenticated API calls with auto dev-reauth on 401 |
| `Aegis.DfsCalculator/DFSCalculator.Server/Controllers/AccountController.cs` | Login, logout, me, dev-login endpoints |
| `Aegis.DfsCalculator/DFSCalculator.Server/Program.cs` | SAML configuration, cookie auth setup, CORS |

### What Each Auth State Controls

| Feature | Unauthenticated | Authenticated |
|---|---|---|
| Basic mode | Yes | Yes |
| FAQ | Yes | Yes |
| Home screen | Yes | Yes |
| Advanced mode | No (redirects to `/`) | Yes |
| MDS file upload | No | Yes |
| Mode banner switch | Shows "Customer Only" modal | Navigates to Advanced |
| API calculation endpoints | 401 Unauthorized | Full access |

### Backend Authentication Configuration

The C# backend (`Program.cs`) configures:

- **Cookie authentication** with 1-hour sliding expiration
- **SAML 2.0** via Sustainsys.Saml2 (IdP metadata in `appsettings.json`)
- **Policy scheme** (`ApiOrSaml`): API routes get cookie auth (401 on failure), other routes get SAML (redirect to IdP on failure)
- **CORS** for `localhost:5173` in development
- **Data Protection** keys persisted to filesystem (dev) or Azure Key Vault (production)

### Environment Variables

The frontend `.env` file contains:

```env
VITE_API_BASE_URL=https://dfs.mycare.com
VITE_AUTH_BASE_URL=https://dfs.mycare.com
```

In development, these are overridden by the Vite proxy (`vite.config.js`), which forwards `/api/*` and `/account/*` to `https://localhost:7194`.

The C# backend reads its configuration from `appsettings.json`:

- `KeyVault:Url` -- Azure Key Vault URL for SP certificate and Data Protection keys
- `KeyVault:SamlCert` -- Secret name for the SAML SP certificate
- `Saml:IdpEntityId` -- myCare IdP entity ID
- `Saml:IdpSingleSignOnUrl` -- myCare SSO endpoint
- `Saml:IdpCertThumbprint` -- Thumbprint of the IdP signing certificate (installed locally)
