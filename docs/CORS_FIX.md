# CORS Issue Fix

## Problem

When running the frontend locally (`npm run dev` on `http://localhost:5173`) and trying to connect to the staging backend (`https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net`), you get CORS errors:

```
Access to fetch at 'https://kind-mushroom-023e7820f-staging...' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

## Solution: Vite Proxy

I've configured a Vite proxy that forwards requests from your local frontend to the staging backend. This avoids CORS issues because:

1. Your browser makes requests to `http://localhost:5173/api/...` (same origin)
2. Vite proxy forwards them to the staging backend
3. No CORS issues because the browser sees same-origin requests

## What Changed

### 1. Updated `vite.config.js`
- Added proxy configuration for `/api` and `/account` endpoints
- Proxies to staging backend: `https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net`
- Properly forwards cookies for session authentication

### 2. Updated `src/utils/secureApiClient.js`
- In development: Uses relative URLs (goes through Vite proxy)
- In production: Uses full URLs from environment variables

### 3. Updated `src/utils/authService.js`
- In development: Uses relative URLs for `/account/me`, `/account/login`, `/account/logout`
- In production: Uses full URLs from environment variables

## How to Use

1. **Restart your dev server** (important!):
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

2. **Your `.env.development` can be empty or have staging URL**:
   ```env
   # Either leave it empty (proxy will handle it)
   # OR keep the staging URL (won't hurt)
   VITE_API_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
   VITE_AUTH_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
   ```

3. **Test it**:
   - Open `http://localhost:5173`
   - Try uploading a file
   - API calls should now work through the proxy

## How It Works

**Before (CORS error):**
```
Browser → https://staging-backend/api/function-score ❌ CORS blocked
```

**After (with proxy):**
```
Browser → http://localhost:5173/api/function-score 
         → Vite Proxy → https://staging-backend/api/function-score ✅ Works!
```

## Production

In production, the frontend and backend will be on the same domain (or CORS will be properly configured), so the proxy isn't needed. The code automatically uses full URLs in production.

## Troubleshooting

If you still get CORS errors:
1. Make sure you restarted the dev server after the changes
2. Check browser console - should see requests to `localhost:5173/api/...` not the staging URL
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

If you want to test without the proxy (direct to staging):
- Set `VITE_API_BASE_URL` in `.env.development` to the staging URL
- The code will use full URLs instead of going through the proxy
- But you'll need CORS to be configured on the backend
