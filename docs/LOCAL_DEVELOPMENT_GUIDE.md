# Local Development Guide

## Quick Start

Open two terminals:

```bash
# Terminal 1: Start C# backend
npm run server

# Terminal 2: Start React frontend
npm run dev
```

Then open `http://localhost:5173`. Authentication happens automatically -- `AuthContext` calls `/account/dev-login` on the C# backend to create a session as `dev-user@localhost`.

## How It Works

- **Frontend**: Vite dev server on `http://localhost:5173`
- **Backend**: C# ASP.NET Core on `https://localhost:7194`
- **Proxy**: Vite forwards `/api/*` and `/account/*` requests to the C# backend (configured in `vite.config.js`), so the frontend never needs to know the backend URL during development

### Environment Variables

A single `.env` file contains production URLs:

```env
VITE_API_BASE_URL=https://dfs.mycare.com
VITE_AUTH_BASE_URL=https://dfs.mycare.com
```

These are only used in production builds. During development, the Vite proxy overrides them by routing API and auth requests to `https://localhost:7194`.

## Prerequisites

1. **Node.js** (for the React frontend)

2. **.NET SDK 8.0** (for the C# backend)
   - Check: `dotnet --version`
   - Download: https://dotnet.microsoft.com/download

3. **Trust the localhost HTTPS certificate**:
   ```bash
   dotnet dev-certs https --trust
   ```

4. **IdP certificate installed** in your local certificate store (thumbprint configured in `appsettings.json` under `Saml:IdpCertThumbprint`)

## NPM Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `vite` | Start Vite frontend dev server |
| `npm run server` | `cd Aegis.DfsCalculator/DFSCalculator.Server && dotnet run --launch-profile https` | Start C# backend |
| `npm run build` | `vite build` | Production build |
| `npm test` | `vitest run` | Run frontend tests |

## Troubleshooting

### C# Backend Won't Start
- Check .NET SDK: `dotnet --version`
- Trust certificate: `dotnet dev-certs https --trust`
- Check if port 7194 is in use
- Verify the IdP certificate is installed (see `CERTIFICATE_MANAGEMENT.md`)

### 401 Unauthorized on `/account/me`
- This is normal on first load -- `AuthContext` automatically calls `/account/dev-login` to fix it
- If it persists, ensure the C# backend is running and Vite proxy is forwarding to it
- Check that the C# backend shows `Hosting environment: Development` in its console output

### Frontend Can't Connect to Backend
- Verify the C# backend is running (check terminal for "Now listening on: https://localhost:7194")
- Check browser console Network tab for proxy errors
- Ensure `vite.config.js` proxy targets `https://localhost:7194`

### Certificate Errors
- Run: `dotnet dev-certs https --trust`
- The Vite proxy is configured with `secure: false` to accept self-signed certs
