# Troubleshooting Guide

## 405 Method Not Allowed

### Possible Causes

1. **Not Authenticated** — The backend requires authentication. Try accessing `/account/me` to check if you're logged in. If you get 401, you need to log in via `/account/login`.

2. **Proxy Configuration** — The Vite proxy might not be forwarding requests correctly. Make sure you restarted the dev server after changing `vite.config.js`. Check the browser Network tab to see if requests are going to `localhost:5173` (proxy) or directly to a remote URL.

3. **Backend Endpoint Issue** — The backend might not be fully configured. Contact IT to verify the backend is running and endpoints are accessible.

### Debugging Steps

1. **Check authentication status:**
   ```javascript
   // In browser console:
   fetch('/account/me', { credentials: 'include' })
     .then(r => r.json())
     .then(console.log)
   ```

2. **Test login flow:**
   Navigate to `http://localhost:5173/account/login?returnUrl=http://localhost:5173`. This should redirect you to SAML login and then back.

3. **Check Network tab:**
   - Requests should go to `http://localhost:5173/api/...` (through proxy)
   - If they go directly to a remote URL, the proxy isn't working

4. **Verify proxy is working:**
   Check the Vite dev server console for proxy log output.

---

## 500 Internal Server Error

A 500 means the request reached the backend and authentication passed (you'd get 401 otherwise), but the backend threw an exception during processing.

### Step 1: Check Backend Console

The terminal where you ran `npm run server` or `dotnet run` will show the actual exception — type, message, and stack trace. This is always the fastest path to a fix.

### Step 2: Common Causes

**Missing or corrupt data files:**
The backend needs `Aegis.DfsCalculator/DFSCalculator.Server/Data/coefficients-all-versions.json`. Verify it exists and is valid JSON.

**Null reference exceptions:**
The backend accesses `body.Summary.Age`, `body.ParsedValues`, and `body.ICDList` directly. If any are null or missing, the calculation methods will throw.

**Date format issues:**
`CoefficientLoader.GetFunctionMultipliers(body.ARDDate)` parses dates. Verify the `ardDate` from the frontend is in `YYYYMMDD` format.

### Step 3: Enable Detailed Error Responses (Temporarily)

In `FunctionScoreController.cs` and `ImputationController.cs`:
```csharp
catch (Exception ex)
{
    return StatusCode(500, new { 
        error = "Internal server error", 
        message = ex.Message,
        stackTrace = ex.StackTrace,
        innerException = ex.InnerException?.Message
    });
}
```

**Remove this after debugging — don't expose stack traces in production.**

### Step 4: Add Request Logging (Temporarily)

```csharp
System.Diagnostics.Debug.WriteLine($"Received body: {JsonSerializer.Serialize(body)}");
System.Diagnostics.Debug.WriteLine($"ARDDate: {body?.ARDDate}");
```

### Quick Fixes

- Verify the frontend sends `age` as a number (not null)
- Verify `ardDate` is in `YYYYMMDD` format
- Add null checks in controllers: `if (body.Summary?.Age == null) return BadRequest(...);`

---

## CORS Errors

### When This Happens

CORS errors occur when the browser makes requests directly to a different origin (e.g., `localhost:5173` calling a remote backend URL).

### Solution: Vite Proxy

The Vite proxy (`vite.config.js`) forwards `/api/*` and `/account/*` requests from the local dev server to the backend. The browser only sees same-origin requests, so no CORS issues.

```
Browser → http://localhost:5173/api/function-score
         → Vite Proxy → backend
```

### If You Still Get CORS Errors

1. **Restart the dev server** after any `vite.config.js` changes
2. Check browser Network tab — requests should go to `localhost:5173/api/...`, not a remote URL
3. Clear browser cache and hard refresh (`Ctrl+Shift+R`)

### Production

In production, the frontend and backend are on the same domain (or CORS is configured on the backend), so the proxy isn't needed. The code automatically uses full URLs in production.

---

## Vite Proxy Issues

### Symptoms

- 404 for `/account/me` or `/account/login`
- 405 for `/api/function-score` or `/api/imputation`

### Debugging

1. **Is the backend running?** Test the backend URL directly in your browser. You should get 401 (not authenticated) or 200, not a connection error.

2. **Did you restart the dev server?** Vite proxy config changes require a restart.

3. **Check the Vite console** for proxy forwarding logs.

4. **Check browser Network tab** — verify requests go to `localhost:5173`, not directly to the backend URL.

### Bypassing the Proxy (For Diagnosis Only)

To test whether the backend itself is responding (you'll get CORS errors, but you can check response status):

1. Set in `.env.development`:
   ```env
   VITE_API_BASE_URL=https://your-backend-url
   VITE_AUTH_BASE_URL=https://your-backend-url
   ```

2. Check the Network tab — if you see 401/405 responses, the backend is alive but may need auth or route fixes.

### If the Backend Isn't Responding

- Confirm with IT that the backend is running
- Consider running the C# backend locally instead — see `LOCAL_DEVELOPMENT_GUIDE.md`

---

## Getting Help

If you can't resolve the issue:
1. Copy the **exact error message** from the backend console
2. Copy the **request payload** from browser DevTools (Network tab)
3. Share both with IT (Hannah/Scott)
