# C# Backend Migration Guide

## Overview

This document guides you through migrating your React frontend to work with the new C# backend that IT has deployed. The backend has been rewritten in C# and is located in the `DotNetBase` branch of the parent DFS-Calculator repository.

## Current Situation

### What Changed
- **Backend Language**: Migrated from Node.js/Vercel serverless functions to C# (.NET)
- **Repository Structure**: Backend code is in Bitbucket (not GitHub)
- **Authentication**: New SAML login endpoints provided by IT
- **API Endpoints**: Same functionality, different implementation

### What Stayed the Same
- **Frontend**: Your React/Vite application remains unchanged (for now)
- **Business Logic**: Same calculation algorithms, just moved to C# backend
- **Data Flow**: Same request/response formats

## Repository Structure

### Bitbucket (IT's Repository)
- **Parent Repo**: `https://bitbucket.org/aegis-therapies/dfs-calculator`
- **DotNetBase Branch**: `https://bitbucket.org/aegis-therapies/dfs-calculator/src/DotNetBase/`
  - Contains the new C# backend code
  - This is what Hannah completed

### Your Fork (Your Working Branch)
- **Your Fork**: `https://bitbucket.org/aegis-therapies/dfs-calculator_km0001/src/Develop/`
  - This is where you'll be working
  - Currently contains your old codebase
  - Needs to be updated with DotNetBase changes

### GitHub (Your Personal Copy)
- **Your GitHub**: `https://github.com/kolbymanginohealthcraft/dfs-calculator`
  - This is your personal backup/reference
  - Not used by IT, but you can keep it synced

## Step-by-Step Migration Process

### Step 1: Update Your Fork from DotNetBase

**Question: How do I update my fork?**

You need to pull the C# backend code from the `DotNetBase` branch into your `Develop` branch. Here's how:

#### Option A: Using Git Command Line (Recommended)

1. **Navigate to your local repository** (if you have one):
   ```bash
   cd path/to/your/local/repo
   ```

2. **Add the parent repository as a remote** (if not already added):
   ```bash
   git remote add upstream https://bitbucket.org/aegis-therapies/dfs-calculator.git
   ```

3. **Fetch the DotNetBase branch**:
   ```bash
   git fetch upstream DotNetBase
   ```

4. **Checkout your Develop branch**:
   ```bash
   git checkout Develop
   ```

5. **Merge DotNetBase into Develop**:
   ```bash
   git merge upstream/DotNetBase
   ```
   
   OR if you want to see what changed first:
   ```bash
   git merge --no-commit --no-ff upstream/DotNetBase
   git status  # Review changes
   git merge --abort  # If you want to cancel
   ```

6. **Resolve any conflicts** (if they occur):
   - Git will mark conflicts in files
   - You'll need to manually resolve them
   - The C# backend files should be new, so conflicts are unlikely

7. **Push to your fork**:
   ```bash
   git push origin Develop
   ```

#### Option B: Using Bitbucket Web Interface

1. Go to your fork: `https://bitbucket.org/aegis-therapies/dfs-calculator_km0001`
2. Click on "Branches" in the left sidebar
3. Click "Create branch"
4. Source: Select the parent repo's `DotNetBase` branch
5. Destination: Your `Develop` branch
6. Review the changes and merge

#### Option C: Using SourceTree or Other Git GUI

1. Open your repository in SourceTree
2. Add the parent repo as a remote (if needed)
3. Fetch from upstream
4. Right-click on `DotNetBase` branch → "Merge DotNetBase into Develop"
5. Resolve conflicts if any
6. Push to origin

**Important Notes:**
- The C# backend will likely be in a different directory structure (e.g., `Backend/`, `Api/`, or similar)
- Your frontend code in `src/` should remain untouched
- You may need to coordinate with IT about which files to keep/merge

### Step 2: Understanding the New Backend Structure

**Question: Do I need to use Visual Studio?**

**Short Answer**: You don't need Visual Studio for frontend development, but you might need it if you need to:
- Debug the C# backend locally
- Make changes to backend code
- Run the backend on your machine

**For Frontend Work Only:**
- You can continue using VS Code or any editor you prefer
- Your React frontend development workflow stays the same
- You only need to update API endpoint URLs and authentication

**If You Need to Work with Backend:**
- Visual Studio 2022 (Community edition is free) or Visual Studio Code with C# extension
- .NET SDK (version will be specified in the backend project)
- Ask IT/Hannah for the exact .NET version required

**Recommended Approach:**
1. Start by just updating your frontend to connect to the new backend
2. Only install Visual Studio if you need to debug backend issues
3. Most likely, IT will handle backend deployments, and you'll just consume the APIs

### Step 3: Connecting Frontend to C# Backend

**Question: How do I connect my frontend to the new back-end?**

The C# backend will expose REST APIs similar to your current Vercel serverless functions, but hosted differently. Here's what you need to do:

#### 3.1: Identify the Backend Base URL

Ask IT/Hannah for:
- **Development URL**: e.g., `https://dfs-api-dev.aegis-therapies.com`
- **Production URL**: e.g., `https://dfs-api.aegis-therapies.com`
- **Local Development URL**: e.g., `http://localhost:5000` (if running locally)

#### 3.2: Update API Endpoint Configuration

Create or update an environment configuration file:

**File: `.env.development`** (for local development):
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_AUTH_BASE_URL=http://localhost:5000
```

**File: `.env.production`** (for production):
```env
VITE_API_BASE_URL=https://dfs-api.aegis-therapies.com
VITE_AUTH_BASE_URL=https://dfs-api.aegis-therapies.com
```

#### 3.3: Update `secureApiClient.js`

You'll need to modify `src/utils/secureApiClient.js` to:

1. **Change the base URL** for API calls:
   ```javascript
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
   
   async function authenticatedFetch(endpoint, options = {}) {
     // Prepend base URL if endpoint doesn't start with http
     const fullUrl = endpoint.startsWith('http') 
       ? endpoint 
       : `${API_BASE_URL}${endpoint}`;
     
     // ... rest of the function
   }
   ```

2. **Update authentication method** (see Step 4 below)

#### 3.4: Verify API Endpoint Paths

Ask Hannah/IT for the exact endpoint paths. They should be similar to:
- `/api/calculate/function-score` → Should still work
- `/api/calculate/imputation` → Should still work
- `/api/calculate/imputation-analysis` → Should still work
- `/api/facility-name/[ccn]` → Should still work

**Important**: The C# backend might use different routing (e.g., `/api/Calculate/FunctionScore` with different casing). Verify the exact paths.

### Step 4: Implementing SAML Login

**Question: How do I complete the login process?**

Based on Hannah's message, you have three GET endpoints to work with:

#### 4.1: Login Endpoints (from Hannah's message)

```javascript
// Login - redirects to SAML login, then back to returnUrl
fetch('/account/login?returnUrl=<encoded-url>')

// Logout - logs out and redirects to returnUrl  
fetch('/account/logout?returnUrl=<encoded-url>')

// Check login status / Get current user
fetch('/account/me')
```

#### 4.2: Create Authentication Service

Create a new file: `src/utils/authService.js`

```javascript
/**
 * Authentication Service
 * Handles SAML login/logout and user session management
 */

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || '';

/**
 * Get the current user or check if logged in
 * @returns {Promise<{loggedIn: boolean, user?: object}>}
 */
export async function getCurrentUser() {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/account/me`, {
      method: 'GET',
      credentials: 'include', // Important: Include cookies for session
    });

    if (response.ok) {
      const user = await response.json();
      return { loggedIn: true, user };
    } else if (response.status === 401) {
      return { loggedIn: false };
    } else {
      throw new Error(`Failed to check auth status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
    return { loggedIn: false };
  }
}

/**
 * Initiate login flow
 * Redirects to SAML login, then back to the specified return URL
 * @param {string} returnUrl - URL to return to after login (default: current page)
 */
export function login(returnUrl = null) {
  const currentUrl = returnUrl || window.location.href;
  const encodedReturnUrl = encodeURIComponent(currentUrl);
  const loginUrl = `${AUTH_BASE_URL}/account/login?returnUrl=${encodedReturnUrl}`;
  
  // Redirect to login endpoint (which will handle SAML flow)
  window.location.href = loginUrl;
}

/**
 * Logout current user
 * @param {string} returnUrl - URL to redirect to after logout (default: home page)
 */
export function logout(returnUrl = null) {
  const defaultReturnUrl = `${window.location.origin}/`;
  const targetUrl = returnUrl || defaultReturnUrl;
  const encodedReturnUrl = encodeURIComponent(targetUrl);
  const logoutUrl = `${AUTH_BASE_URL}/account/logout?returnUrl=${encodedReturnUrl}`;
  
  // Redirect to logout endpoint
  window.location.href = logoutUrl;
}

/**
 * Check if user is authenticated (synchronous check using stored state)
 * For real check, use getCurrentUser()
 */
export function isAuthenticated() {
  // You might store this in localStorage or context after initial check
  return localStorage.getItem('user-authenticated') === 'true';
}
```

#### 4.3: Update `secureApiClient.js` for New Auth

Replace the `getSSOToken()` function with session-based authentication:

```javascript
/**
 * Make an authenticated API request
 * Uses session cookies instead of tokens
 */
async function authenticatedFetch(endpoint, options = {}) {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
  const fullUrl = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(fullUrl, {
    ...options,
    credentials: 'include', // CRITICAL: Include cookies for session auth
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Handle 401 by redirecting to login
    if (response.status === 401) {
      const { login } = await import('./authService.js');
      login(window.location.href); // Redirect to login, then back here
      throw new Error('Authentication required');
    }
    
    // ... rest of error handling
  }

  return response.json();
}
```

#### 4.4: Update `PortalContext.jsx` to Use New Auth

Modify `src/contexts/PortalContext.jsx`:

```javascript
import { getCurrentUser } from '../utils/authService';

export const PortalProvider = ({ children }) => {
  const [isFromPortal, setIsFromPortal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check authentication status
    getCurrentUser().then(({ loggedIn, user: currentUser }) => {
      setIsFromPortal(loggedIn);
      setUser(currentUser);
      setIsLoading(false);
      
      // Store auth state for quick checks
      localStorage.setItem('user-authenticated', loggedIn ? 'true' : 'false');
    });
  }, []);

  // ... rest of context
};
```

#### 4.5: Add Login/Logout UI Components

Create `src/components/LoginButton.jsx`:

```javascript
import { login } from '../utils/authService';

export function LoginButton() {
  return (
    <button onClick={() => login()}>
      Login
    </button>
  );
}
```

Create `src/components/LogoutButton.jsx`:

```javascript
import { logout } from '../utils/authService';

export function LogoutButton() {
  return (
    <button onClick={() => logout()}>
      Logout
    </button>
  );
}
```

#### 4.6: Protect Routes Based on Auth

Update `src/App.jsx` to check authentication:

```javascript
import { usePortal } from './contexts/PortalContext';
import { LoginButton } from './components/LoginButton';

// In your route protection:
{isFromPortal ? (
  <AdvancedRouteHandler />
) : (
  <div>
    <p>Please log in to access advanced features.</p>
    <LoginButton />
  </div>
)}
```

### Step 5: Testing the Integration

#### 5.1: Local Testing Checklist

1. **Backend Running Locally?**
   - Ask IT how to run the C# backend locally
   - Update `.env.development` with local URL
   - Test `/account/me` endpoint first

2. **Login Flow Testing**:
   - Click login button
   - Should redirect to SAML login
   - After login, should redirect back
   - `/account/me` should return user info

3. **API Call Testing**:
   - Try a calculation request
   - Check browser Network tab for requests
   - Verify cookies are being sent (`credentials: 'include'`)

4. **Error Handling**:
   - Test with expired session
   - Test with invalid credentials
   - Verify 401 redirects to login

#### 5.2: Common Issues and Solutions

**Issue: CORS Errors**
- **Symptom**: Browser blocks requests with CORS errors
- **Solution**: Backend needs CORS configuration. Ask IT to add your frontend origin to allowed origins

**Issue: Cookies Not Being Sent**
- **Symptom**: 401 errors even after login
- **Solution**: Ensure `credentials: 'include'` in all fetch calls
- **Solution**: Check if cookies are SameSite/HttpOnly (backend config)

**Issue: Redirect Loop**
- **Symptom**: Infinite redirects between login and app
- **Solution**: Check returnUrl encoding
- **Solution**: Verify backend login endpoint behavior

**Issue: API Endpoints Not Found (404)**
- **Symptom**: 404 errors on API calls
- **Solution**: Verify exact endpoint paths with IT
- **Solution**: Check API base URL configuration

## Architecture Changes Summary

### Before (Node.js/Vercel)
```
Frontend (React) 
  → Vercel Serverless Functions (/api/*)
    → validate-token.js (SAML validation)
    → calculate/function-score.js
    → calculate/imputation.js
```

### After (C# Backend)
```
Frontend (React)
  → C# Backend API (separate server)
    → /account/login (SAML login)
    → /account/logout (SAML logout)  
    → /account/me (check auth)
    → /api/calculate/* (calculation endpoints)
```

### Key Differences

1. **Authentication**: 
   - **Before**: Token-based (SAML assertion in cookie/token)
   - **After**: Session-based (cookies managed by backend)

2. **Deployment**:
   - **Before**: Frontend + API on Vercel (same domain)
   - **After**: Frontend separate from backend (different domains/ports)

3. **CORS**:
   - **Before**: Same origin, no CORS needed
   - **After**: Cross-origin, CORS configuration required

## Questions to Ask IT/Hannah

Before you start, get answers to these:

1. **Backend URLs**:
   - What is the development API URL?
   - What is the production API URL?
   - How do I run it locally?

2. **API Endpoints**:
   - Are the endpoint paths the same? (`/api/calculate/function-score`)
   - What is the exact casing? (C# is case-sensitive)
   - Are there any new endpoints?

3. **Authentication**:
   - Do the login endpoints work exactly as described? (GET with returnUrl)
   - What does `/account/me` return? (user object structure)
   - Are cookies HttpOnly? SameSite settings?

4. **CORS Configuration**:
   - What frontend origins are allowed?
   - What headers are allowed?
   - Are credentials allowed?

5. **Development Setup**:
   - Do I need Visual Studio?
   - What .NET version?
   - How do I run/debug the backend locally?

6. **Deployment**:
   - Where is the backend deployed?
   - How are environment variables configured?
   - What's the deployment process?

## Next Steps (In Order)

1. ✅ **Update your fork** from DotNetBase branch
2. ✅ **Get answers** to questions above from IT/Hannah
3. ✅ **Set up environment variables** (.env files)
4. ✅ **Create authService.js** with login/logout functions
5. ✅ **Update secureApiClient.js** to use session cookies
6. ✅ **Update PortalContext.jsx** to use new auth
7. ✅ **Test login flow** locally
8. ✅ **Test API calls** with authenticated session
9. ✅ **Update any remaining components** that use old auth
10. ✅ **Test end-to-end** with real MDS files
11. ✅ **Deploy to staging** and test
12. ✅ **Deploy to production**

## Getting Help

- **Hannah**: For backend questions and API details
- **IT Department**: For SAML configuration and deployment
- **This Document**: Reference for frontend integration steps

## Important Notes

- **Don't delete old code yet**: Keep your current codebase as backup
- **Use feature branches**: Create a branch for C# integration work
- **Test incrementally**: Don't change everything at once
- **Ask questions early**: Better to clarify than guess
- **Document changes**: Keep notes on what you changed and why

## File Changes Summary

Files you'll need to modify:
- `src/utils/secureApiClient.js` - Update API base URL and auth method
- `src/utils/authService.js` - **NEW FILE** - Login/logout functions
- `src/contexts/PortalContext.jsx` - Use new auth service
- `src/App.jsx` - Add login UI if needed
- `.env.development` - **NEW FILE** - Development API URLs
- `.env.production` - **NEW FILE** - Production API URLs
- `package.json` - No changes needed (frontend dependencies stay same)

Files that might change (depending on backend structure):
- `vercel.json` - Might not be needed if frontend deploys separately
- `api/` folder - **MIGHT BE REMOVED** - Backend handles APIs now

## Testing Checklist

- [ ] Fork updated from DotNetBase
- [ ] Environment variables configured
- [ ] Login endpoint works (redirects to SAML)
- [ ] `/account/me` returns user info when logged in
- [ ] Logout endpoint works
- [ ] API calls work with authenticated session
- [ ] 401 errors redirect to login
- [ ] Calculations return correct results
- [ ] CORS configured correctly
- [ ] Cookies are sent with requests
- [ ] Session persists across page refreshes

---

**Remember**: Take this one step at a time. Start with updating your fork and getting the backend URLs, then work through authentication, then API integration. Don't try to do everything at once!
