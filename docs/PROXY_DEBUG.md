# Proxy Debugging Guide

## Current Issue

Getting:
- **404** for `/account/me` and `/account/login` (proxy not forwarding?)
- **405** for `/api/function-score` and `/api/imputation` (proxy working but backend rejecting?)

## Possible Causes

### 1. Staging Backend Not Running
The staging backend might not be accessible or running.

**Test:** Try accessing the staging URL directly in your browser:
- `https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net/account/me`
- Should get 401 (not authenticated) or 200 (if somehow authenticated)
- If you get connection error → backend is down

### 2. Proxy Configuration Issue
Vite proxy might not be forwarding requests correctly.

**Check:**
1. Make sure you restarted dev server after changing `vite.config.js`
2. Check Vite console for proxy logs
3. Check browser Network tab - should see requests to `localhost:5173`, not staging URL

### 3. Backend Route Mismatch
The backend routes might be different than expected.

**From C# backend code:**
- `/account/login` - Should exist (AccountController)
- `/account/logout` - Should exist (AccountController)  
- `/account/me` - Should exist (AccountController)
- `/api/function-score` - Should exist (FunctionScoreController)
- `/api/imputation` - Should exist (ImputationController)

### 4. Authentication Required
The 405 might actually be an authentication issue.

**Test:** Try logging in first:
1. Go to: `http://localhost:5173/account/login?returnUrl=http://localhost:5173`
2. Should redirect to SAML login
3. After login, try API calls again

## Quick Test: Bypass Proxy

To test if the backend itself works (will get CORS errors, but we can see if backend responds):

1. **Temporarily disable proxy logic:**
   In `src/utils/secureApiClient.js`, change:
   ```javascript
   const fullUrl = endpoint.startsWith('http') 
     ? endpoint 
     : isDevelopment 
       ? endpoint  // Use relative URL in dev (goes through Vite proxy)
       : `${API_BASE_URL}${endpoint}`;
   ```
   
   To:
   ```javascript
   const fullUrl = endpoint.startsWith('http') 
     ? endpoint 
     : `${API_BASE_URL}${endpoint}`; // Always use full URL
   ```

2. **Set environment variable:**
   Make sure `.env.development` has:
   ```env
   VITE_API_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
   VITE_AUTH_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
   ```

3. **Test:**
   - You'll get CORS errors (expected)
   - But check Network tab - should see requests going to staging URL
   - Check response status - if you get 401/405, backend is responding
   - If connection refused, backend is down

## Next Steps

1. **Verify staging backend is accessible**
   - Contact IT/Hannah to confirm staging is running
   - Ask for the correct staging URL if it changed

2. **Check if you need to authenticate first**
   - The backend requires authentication for all API calls
   - You might need to log in via SAML first

3. **Consider running backend locally**
   - If staging isn't working, try Option 2 (run C# backend locally)
   - See `docs/LOCAL_DEVELOPMENT_GUIDE.md`
