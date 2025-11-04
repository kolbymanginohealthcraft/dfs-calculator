# Security Assessment & Next Steps

## Executive Summary

Your application has the **infrastructure** for protecting your proprietary calculation algorithm, but there are **critical security gaps** that must be addressed before production deployment. The core IP (how you combine CMS guidelines, covariates, multipliers, and imputation methodology) is still exposed in client-side code and can be reverse-engineered.

## Current Status

### ✅ What's Working

1. **API Endpoints Created**: Protected calculation endpoints exist at:
   - `/api/calculate/function-score` - For calculating covariates and weighted scores
   - `/api/calculate/imputation` - For imputation calculations

2. **Protection Middleware**: `protectRoute()` function wraps endpoints to require authentication

3. **Secure API Client**: `src/utils/secureApiClient.js` provides client-side interface for authenticated API calls

4. **Partial Migration**: Some components (`AdvancedAppDetail.jsx`, `AdvancedSummaryView.jsx`, `ImputationTab.jsx`) are using the secure API client

### ⚠️ Critical Security Issues

#### 1. **Token Validation is Placeholder (CRITICAL)**
**Location**: `api/auth/validate-token.js` lines 58-60

```javascript
// TEMPORARY: Placeholder that accepts any non-empty token
// REMOVE THIS and implement real validation before production
if (token && token.length > 0) {
  return { valid: true, user: { id: 'placeholder', source: 'sso' } };
}
```

**Risk**: Anyone can call your protected endpoints with any non-empty string as a token.

**Impact**: HIGH - Your proprietary algorithm is accessible without authentication.

#### 2. **Proprietary Code Still in Client Bundle (CRITICAL)**
**Location**: Multiple files in `src/utils/`:
- `src/utils/calculations.js` - Contains `getFunctionCovariates()` (lines 730-793)
- `src/utils/fileParser.js` - Contains `calculateImputedValue()` (lines 62-102)
- `src/utils/imputationCalculations.js` - Contains `imputeMissingGGItems()` (lines 56-145)
- `src/utils/endScoreImputation.js` - Contains end score imputation logic

**Risk**: These functions are bundled into your client-side JavaScript and can be:
- Extracted from browser DevTools
- Downloaded and reverse-engineered
- Copied by competitors

**Impact**: CRITICAL - Your entire IP is exposed.

#### 3. **Development Bypass Still Active**
**Location**: 
- `api/auth/validate-token.js` lines 30-32
- `src/utils/secureApiClient.js` lines 27-34

**Risk**: Development bypass tokens could be exploited if discovered.

**Impact**: MEDIUM - Only if someone discovers the bypass token value.

#### 4. **Client-Side Calculations Still Used**
**Location**: Multiple components still import and use client-side calculation functions:
- `src/components/AdvancedAppDetail.jsx` - Uses `calculateFunctionScore` from calculations.js (line 275-276)
- `src/utils/fileParser.js` - Still exports `calculateImputedValue` for client use
- Various other utilities

**Note**: Some usage (like `calculateFunctionScore` for simple GG item scoring) is acceptable - it's just adding numbers. The proprietary logic is in `getFunctionCovariates()`.

## What Needs to Happen Next

### Priority 1: Implement Real Token Validation (CRITICAL - Do First)

**File**: `api/auth/validate-token.js`

You need to implement the `validateSSOToken()` function based on how myCare provides SSO tokens. Choose one:

**Note**: Since myCare uses SAML, you'll likely receive a session token after SAML authentication, not a SAML assertion directly. The session token might be JWT format or a custom format.

**Option A: JWT Session Tokens** (if myCare issues JWT after SAML)
```javascript
const jwt = require('jsonwebtoken');

async function validateSSOToken(token) {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  try {
    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, process.env.SSO_PUBLIC_KEY, {
      algorithms: ['RS256'], // or whatever algorithm myCare uses
      issuer: 'myCare', // if myCare sets issuer
      audience: 'your-app-name' // if myCare sets audience
    });
    
    return { valid: true, user: decoded };
  } catch (error) {
    return { valid: false, error: `Token validation failed: ${error.message}` };
  }
}
```

**Option B: API Validation** (if myCare has a validation endpoint)
```javascript
async function validateSSOToken(token) {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  try {
    const response = await fetch('https://mycare.com/api/validate-token', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      // Add timeout
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return { valid: false, error: 'Invalid token' };
    }
    
    const user = await response.json();
    return { valid: true, user };
  } catch (error) {
    return { valid: false, error: `Token validation failed: ${error.message}` };
  }
}
```

**Option C: Session-Based** (if myCare uses session tokens)
```javascript
// You'll need to implement session validation based on myCare's system
// This might involve checking a shared session store, database, etc.
```

### Priority 2: Move Calculation Logic to Server-Only Module (CRITICAL)

**Goal**: Ensure proprietary calculation functions are NEVER bundled into client-side code.

**Steps**:

1. **Create a server-only calculation module**:
   - Create `api/utils/serverCalculations.js` (or similar)
   - Move `getFunctionCovariates()` from `src/utils/calculations.js` to this module
   - Move `calculateImputedValue()` from `src/utils/fileParser.js` to this module
   - Move `imputeMissingGGItems()` from `src/utils/imputationCalculations.js` to this module
   - Move any other proprietary calculation logic

2. **Update API endpoints** to import from server-only module:
   ```javascript
   // api/calculate/function-score.js
   import { getFunctionCovariates } from '../utils/serverCalculations.js';
   import { getFunctionMultipliers } from '../utils/serverCoefficientLoader.js';
   ```

3. **Remove or stub client-side functions**:
   - In `src/utils/calculations.js`: Remove `getFunctionCovariates()` or replace with a stub that throws an error
   - In `src/utils/fileParser.js`: Remove `calculateImputedValue()` or replace with a stub
   - In `src/utils/imputationCalculations.js`: Remove `imputeMissingGGItems()` or replace with a stub

4. **Update build configuration** to ensure server-only modules are never bundled:
   - Add to `vite.config.js` or build config to exclude server-only modules from client bundle

### Priority 3: Complete Client Migration (HIGH)

**Goal**: Ensure all components use the secure API client instead of client-side calculations.

**Files to Update**:

1. **Verify all components are migrated**:
   - ✅ `src/components/AdvancedAppDetail.jsx` - Already using secure API
   - ✅ `src/components/AdvancedSummaryView.jsx` - Already using secure API
   - ✅ `src/components/ImputationTab.jsx` - Already using secure API
   - ⚠️ Check any other components that might use calculations

2. **Remove unused imports**:
   - Remove `getFunctionCovariates` imports from client-side files
   - Remove `calculateImputedValue` imports from client-side files
   - Remove `imputeMissingGGItems` imports from client-side files

3. **Update utility functions** that still call client-side calculations

### Priority 4: Configure Token Retrieval (HIGH)

**File**: `src/utils/secureApiClient.js`

Implement `getSSOToken()` based on how myCare provides tokens:

**Option A: localStorage** (if myCare stores token there)
```javascript
function getSSOToken() {
  return localStorage.getItem('mycare_sso_token');
}
```

**Option B: Cookie** (if myCare sets a cookie)
```javascript
function getSSOToken() {
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('mycare_token='));
  return tokenCookie ? decodeURIComponent(tokenCookie.split('=')[1]) : null;
}
```

**Option C: URL Parameter** (if myCare passes token in URL)
```javascript
function getSSOToken() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('sso_token');
}
```

**Option D: Parent Window** (if embedded in iframe)
```javascript
function getSSOToken() {
  try {
    return window.parent?.myCareSSOToken || null;
  } catch (e) {
    // Cross-origin error - handle appropriately
    return null;
  }
}
```

### Priority 5: Remove/Disable Development Bypass (MEDIUM)

**Before Production**:

1. **Remove development bypass from token validation**:
   - Remove lines 26-32 from `api/auth/validate-token.js`
   - Or wrap in a strict environment check that only works in local development

2. **Remove development bypass from client**:
   - Remove lines 27-34 from `src/utils/secureApiClient.js`
   - Or ensure it only works when `NODE_ENV === 'development'` AND `VERCEL_ENV !== 'production'`

3. **Add environment variable checks**:
   ```javascript
   const isDev = process.env.NODE_ENV === 'development' 
     && process.env.VERCEL_ENV !== 'production'
     && process.env.ALLOW_DEV_BYPASS === 'true'; // Require explicit flag
   ```

### Priority 6: Additional Security Hardening (MEDIUM)

1. **Rate Limiting**: Add rate limiting to calculation endpoints to prevent abuse
   - Use a library like `express-rate-limit` or similar

2. **Request Validation**: Add strict validation of request bodies
   - Validate all required fields
   - Validate data types and ranges
   - Reject malformed requests

3. **Error Handling**: Ensure error messages don't leak internal details
   - ✅ Already partially done (checking `NODE_ENV`)
   - Verify all endpoints follow this pattern

4. **HTTPS Enforcement**: Ensure HTTPS is required in production
   - Check `vercel.json` configuration

5. **CORS Configuration**: Ensure CORS is properly configured
   - Only allow requests from myCare portal domain(s)

6. **Audit Logging**: Consider logging authentication attempts
   - Log successful authentications
   - Log failed authentication attempts
   - Monitor for suspicious patterns

## Testing Checklist

Before production deployment, test:

- [ ] Token validation rejects invalid tokens
- [ ] Token validation accepts valid tokens from myCare
- [ ] Protected endpoints return 401 without valid token
- [ ] Protected endpoints work with valid token
- [ ] Development bypass is disabled in production
- [ ] Client bundle does NOT contain proprietary calculation functions
- [ ] All components use secure API client
- [ ] Error handling doesn't expose internal details
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] Rate limiting works (if implemented)

## Migration Strategy

### Recommended Approach: Phased Migration

**Phase 1: Fix Critical Issues (Week 1)**
1. Implement real token validation
2. Move calculation logic to server-only module
3. Update API endpoints to use server-only module

**Phase 2: Complete Migration (Week 2)**
1. Verify all components use secure API
2. Remove client-side calculation functions
3. Test thoroughly

**Phase 3: Hardening (Week 3)**
1. Remove development bypasses
2. Add rate limiting
3. Security audit
4. Production deployment

### Alternative: Feature Flag Approach

If you want to test incrementally:

1. Add feature flag to toggle between client/server calculations
2. Migrate all code behind the flag
3. Test with flag on/off
4. Remove old code once stable

## Questions to Answer

Before proceeding, you need to determine:

1. **How does myCare provide SSO tokens?**
   - JWT tokens?
   - Session tokens?
   - Custom format?
   - Where are they stored/passed? (localStorage, cookie, URL, etc.)

2. **Does myCare have a token validation endpoint?**
   - If yes, what's the URL?
   - What's the authentication method?

3. **What's the token format?**
   - JWT structure?
   - Custom structure?
   - What claims/fields does it contain?

4. **What's your deployment environment?**
   - Vercel?
   - Other?
   - How do you set environment variables?

## Summary

**Current State**: Infrastructure exists, but critical security gaps remain.

**Critical Actions Required**:
1. Implement real token validation (Priority 1)
2. Move calculation logic to server-only (Priority 2)
3. Complete client migration (Priority 3)

**Timeline**: 2-3 weeks for full security implementation, depending on myCare SSO integration complexity.

**Risk Level**: HIGH - Your proprietary algorithm is currently exposed and can be reverse-engineered from client-side code.

