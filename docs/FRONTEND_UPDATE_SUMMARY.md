# Frontend Update Summary - C# Backend Integration

## ✅ Changes Completed

### 1. Created `src/utils/authService.js`
New authentication service that handles:
- `getCurrentUser()` - Checks if user is logged in via `/account/me`
- `login(returnUrl)` - Redirects to `/account/login` for SAML authentication
- `logout(returnUrl)` - Redirects to `/account/logout` to end session
- `isAuthenticated()` - Synchronous check using stored state

### 2. Updated `src/utils/secureApiClient.js`
**Key Changes:**
- ✅ Removed token-based authentication (old SAML token system)
- ✅ Added session cookie authentication (`credentials: 'include'`)
- ✅ Updated API endpoints:
  - `/api/calculate/function-score` → `/api/function-score`
  - `/api/calculate/imputation` → `/api/imputation`
  - `/api/calculate/imputation-analysis` → `/api/imputation-analysis`
- ✅ Added automatic redirect to login on 401 errors
- ✅ Added API base URL support via environment variables

### 3. Updated `src/contexts/PortalContext.jsx`
**Key Changes:**
- ✅ Now uses `getCurrentUser()` from `authService.js` instead of token checking
- ✅ Stores user object in context
- ✅ Sets `user-authenticated` flag in localStorage for backward compatibility

## 📝 Environment Variables Needed

You need to create environment files (they're in .gitignore, so create them manually):

### `.env.development` (for local development)
```env
# Development environment variables
# For local development, use localhost if running backend locally
# Otherwise, use staging URL for testing
VITE_API_BASE_URL=http://localhost:5000
VITE_AUTH_BASE_URL=http://localhost:5000

# OR use staging URL:
# VITE_API_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
# VITE_AUTH_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net

# Development bypass (optional - for testing without backend)
# VITE_ALLOW_DEV_BYPASS=true
```

### `.env.staging` (for staging/testing)
```env
# Staging environment variables
VITE_API_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
VITE_AUTH_BASE_URL=https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net
```

### `.env.production` (for production)
```env
# Production environment variables
VITE_API_BASE_URL=https://dfs.mycare.com
VITE_AUTH_BASE_URL=https://dfs.mycare.com
```

**✅ URLs provided by Scott:**
- **Staging**: `https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net/`
- **Production**: `https://dfs.mycare.com`

## 🔄 How Authentication Works Now

### Old Way (Token-Based)
1. Get SAML token from cookie
2. Send token in `Authorization: Bearer <token>` header
3. Backend validates token

### New Way (Session-Based)
1. User clicks login → redirects to `/account/login`
2. SAML authentication happens on backend
3. Backend sets session cookie
4. All API calls include `credentials: 'include'` to send cookies
5. Backend validates session cookie

## 🧪 Testing Checklist

Before deploying, test:

- [ ] **Login Flow**
  - [ ] Click login button (if you add one) → should redirect to SAML
  - [ ] After SAML login → should redirect back to app
  - [ ] `/account/me` should return user info

- [ ] **API Calls**
  - [ ] Function score calculation works
  - [ ] Imputation calculation works
  - [ ] Imputation analysis works
  - [ ] Cookies are being sent (check browser DevTools → Network tab)

- [ ] **Error Handling**
  - [ ] 401 errors redirect to login
  - [ ] Network errors are handled gracefully
  - [ ] CORS errors (if any) are reported clearly

- [ ] **CORS Configuration**
  - [ ] Backend allows your frontend origin
  - [ ] Cookies are sent cross-origin (SameSite settings)

## ✅ Backend URLs (from Scott)

**Staging:** `https://kind-mushroom-023e7820f-staging.eastus2.2.azurestaticapps.net/`  
**Production:** `https://dfs.mycare.com`

**Endpoints (all relative to base URL):**
- `/account/login` - SAML login (GET)
- `/account/logout` - Logout (GET)
- `/account/me` - Get user info (GET)
- `/api/function-score` - Calculate function score (POST)
- `/api/imputation` - Calculate imputation (POST)
- `/api/imputation-analysis` - Get imputation analysis (POST)

## 🚨 Questions to Ask IT/Hannah (if needed)

1. **Local Development:**
   - How do I run the C# backend locally?
   - What port does it run on? (default might be 5000 or 7194 based on Program.cs)

2. **CORS:**
   - Is CORS configured for your frontend domain?
   - What origins are allowed?

3. **Cookies:**
   - Are cookies SameSite=Strict or Lax?
   - Are cookies HttpOnly? (They should be for security)

4. **Security Certificate:**
   - The certificate you mentioned - is this for backend SAML configuration?
   - Do you need it for frontend, or is it backend-only?

## 📋 Next Steps

1. **Create environment files** (`.env.development` and `.env.production`) with correct URLs
2. **Get backend URLs** from IT/Hannah
3. **Test login flow** locally (if backend is running)
4. **Test API calls** with authenticated session
5. **Add login/logout UI** if needed (see below)

## 🎨 Optional: Add Login/Logout UI

If you want to add login/logout buttons, you can create:

**`src/components/LoginButton.jsx`:**
```jsx
import { login } from '../utils/authService';

export function LoginButton() {
  return (
    <button onClick={() => login()}>
      Login
    </button>
  );
}
```

**`src/components/LogoutButton.jsx`:**
```jsx
import { logout } from '../utils/authService';

export function LogoutButton() {
  return (
    <button onClick={() => logout()}>
      Logout
    </button>
  );
}
```

Then add them to your `Navbar` or wherever makes sense in your UI.

## 🔍 Files Changed

- ✅ `src/utils/authService.js` (NEW)
- ✅ `src/utils/secureApiClient.js` (UPDATED)
- ✅ `src/contexts/PortalContext.jsx` (UPDATED)

## 📚 Related Documentation

- See `docs/C_SHARP_MIGRATION_GUIDE.md` for detailed migration steps
- See `docs/C_SHARP_MIGRATION_QUICK_REFERENCE.md` for quick reference

---

**Status:** ✅ Frontend code updated and ready for testing once backend URLs are configured!
