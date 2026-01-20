# Troubleshooting Guide

## 405 Method Not Allowed Error

If you're getting `405 Method Not Allowed` errors when making API calls:

### Possible Causes:

1. **Not Authenticated**: The backend requires authentication. You need to log in first.
   - Try accessing `/account/me` to check if you're logged in
   - If you get 401, you need to log in via `/account/login`

2. **Proxy Configuration**: The Vite proxy might not be forwarding requests correctly.
   - Make sure you restarted the dev server after changing `vite.config.js`
   - Check browser Network tab to see if requests are going to `localhost:5173` (proxy) or directly to staging

3. **Backend Endpoint Issue**: The staging backend might not be fully configured.
   - Contact IT/Hannah to verify the staging backend is running and endpoints are accessible

### Steps to Debug:

1. **Check Authentication Status**:
   ```javascript
   // In browser console:
   fetch('/account/me', { credentials: 'include' })
     .then(r => r.json())
     .then(console.log)
   ```
   - If you get user info → you're logged in
   - If you get 401 → you need to log in

2. **Test Login Flow**:
   - Navigate to: `http://localhost:5173/account/login?returnUrl=http://localhost:5173`
   - This should redirect you to SAML login
   - After login, you should be redirected back

3. **Check Network Tab**:
   - Open browser DevTools → Network tab
   - Make an API call
   - Check the request URL:
     - ✅ Should be: `http://localhost:5173/api/function-score` (going through proxy)
     - ❌ Should NOT be: `https://kind-mushroom.../api/function-score` (direct call)

4. **Verify Proxy is Working**:
   - Check Vite dev server console for proxy logs
   - Should see requests being forwarded

### Quick Fix: Test with Direct Staging URL

If you want to test if the backend itself works (bypassing proxy):

1. Temporarily set in `.env.development`:
   ```env
   VITE_API_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
   VITE_AUTH_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
   ```

2. Update `secureApiClient.js` to always use full URLs (remove the `isDevelopment` check)

3. **Note**: This will give you CORS errors unless the backend has CORS configured for `localhost:5173`

### Contact IT/Hannah If:

- You've verified you're logged in but still get 405
- The staging backend endpoints aren't responding
- You need CORS configured on the backend for localhost development
