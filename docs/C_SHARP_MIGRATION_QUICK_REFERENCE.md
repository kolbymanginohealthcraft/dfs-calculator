# C# Migration Quick Reference

## Repository URLs

- **Parent Repo (IT)**: `https://bitbucket.org/aegis-therapies/dfs-calculator`
- **DotNetBase Branch**: `https://bitbucket.org/aegis-therapies/dfs-calculator/src/DotNetBase/`
- **Your Fork**: `https://bitbucket.org/aegis-therapies/dfs-calculator_km0001/src/Develop/`
- **Your GitHub**: `https://github.com/kolbymanginohealthcraft/dfs-calculator` (personal backup)

## Quick Answers to Your Questions

### Q: How do I update my fork?
**A**: Merge `DotNetBase` branch into your `Develop` branch:
```bash
git fetch upstream DotNetBase
git checkout Develop
git merge upstream/DotNetBase
```

### Q: Do I need Visual Studio?
**A**: 
- **For frontend work**: No, continue using VS Code
- **For backend debugging**: Yes, but only if you need to debug C# code
- **Most likely**: You won't need it - IT handles backend

### Q: How do I connect frontend to new backend?
**A**: 
1. Get backend URL from IT (e.g., `https://dfs-api-dev.aegis-therapies.com`)
2. Add to `.env.development`: `VITE_API_BASE_URL=<backend-url>`
3. Update `secureApiClient.js` to use base URL
4. Change auth from tokens to session cookies

### Q: How do I complete the login process?
**A**: Use these three endpoints (all GET):
- `GET /account/login?returnUrl=<url>` - Redirects to SAML login
- `GET /account/logout?returnUrl=<url>` - Logs out user
- `GET /account/me` - Returns current user or 401 if not logged in

## New Authentication Flow

### Old Way (Token-Based)
```
1. Get SAML token from cookie
2. Send token in Authorization header
3. Backend validates token
```

### New Way (Session-Based)
```
1. Call /account/login → redirects to SAML
2. SAML redirects back → session cookie set
3. Send requests with credentials: 'include'
4. Backend checks session cookie
```

## Files to Create/Modify

### New Files
- `src/utils/authService.js` - Login/logout functions
- `.env.development` - Development API URL
- `.env.production` - Production API URL

### Files to Modify
- `src/utils/secureApiClient.js` - Add base URL, use cookies
- `src/contexts/PortalContext.jsx` - Use new auth service
- `src/App.jsx` - Add login UI if needed

## Code Snippets

### Login Function
```javascript
export function login(returnUrl = null) {
  const url = returnUrl || window.location.href;
  window.location.href = `${AUTH_BASE_URL}/account/login?returnUrl=${encodeURIComponent(url)}`;
}
```

### Authenticated Fetch (with cookies)
```javascript
const response = await fetch(`${API_BASE_URL}${endpoint}`, {
  method: 'POST',
  credentials: 'include', // CRITICAL: sends cookies
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

### Check Auth Status
```javascript
const response = await fetch(`${AUTH_BASE_URL}/account/me`, {
  credentials: 'include'
});
const { loggedIn, user } = await response.json();
```

## Questions to Ask IT/Hannah

1. What are the backend URLs? (dev, staging, prod)
2. Are API endpoint paths the same? (`/api/calculate/function-score`)
3. What does `/account/me` return? (user object structure)
4. Is CORS configured? (what origins are allowed?)
5. How do I run backend locally? (if needed)

## Common Issues

| Issue | Solution |
|-------|----------|
| CORS errors | Ask IT to add your frontend origin |
| 401 errors | Add `credentials: 'include'` to fetch calls |
| Redirect loop | Check returnUrl encoding |
| Cookies not sent | Verify SameSite/HttpOnly settings with IT |

## Step-by-Step Checklist

1. [ ] Update fork: `git merge upstream/DotNetBase`
2. [ ] Get backend URLs from IT
3. [ ] Create `.env.development` with API URL
4. [ ] Create `src/utils/authService.js`
5. [ ] Update `src/utils/secureApiClient.js`
6. [ ] Update `src/contexts/PortalContext.jsx`
7. [ ] Test login flow
8. [ ] Test API calls
9. [ ] Deploy and test

## Key Differences

| Aspect | Before (Node.js) | After (C#) |
|--------|-----------------|------------|
| Auth | Token in header | Session cookie |
| Deployment | Same domain (Vercel) | Different domain |
| CORS | Not needed | Required |
| Fetch | Standard | Need `credentials: 'include'` |

---

**See `C_SHARP_MIGRATION_GUIDE.md` for detailed instructions.**
