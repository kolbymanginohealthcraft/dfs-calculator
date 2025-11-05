# Security Implementation - Action Plan

## Immediate Actions (This Week)

### 1. Implement Real Token Validation (CRITICAL - Do First)

**File**: `api/auth/validate-token.js`

**Current Issue**: Lines 58-60 accept ANY non-empty token as valid.

**SAML-Specific**: Since myCare uses SAML, you'll likely receive a **session token** after SAML authentication, not a SAML assertion directly.

**Action Required**:
1. **Contact myCare** to determine:
   - Do they provide a session token after SAML authentication?
   - What's the token format? (JWT, custom string, etc.)
   - Where is it stored? (cookie, localStorage, URL param?)
   - Do they have a validation endpoint? (URL, authentication method?)
2. Implement proper validation based on their response
3. Test with real tokens

**See**: `docs/SAML_IMPLEMENTATION_GUIDE.md` for SAML-specific implementation details.

**Estimated Time**: 2-4 hours (depends on myCare documentation/clarity)

---

### 2. Move Calculation Logic to Server-Only (CRITICAL)

**Current Issue**: Proprietary calculation functions are in `src/utils/` which get bundled into client-side JavaScript.

**Action Required**:

#### Step 2.1: Create Server-Only Calculation Module
Create new file: `api/utils/serverCalculations.js`

```javascript
// api/utils/serverCalculations.js
// This file is ONLY used by server-side API endpoints
// It will NEVER be bundled into client-side code

// Import from the source files (we'll move these functions here)
import { getFunctionCovariates as getFunctionCovariatesSource } from '../../src/utils/calculations.js';
import { calculateImputedValue as calculateImputedValueSource } from '../../src/utils/fileParser.js';
import { imputeMissingGGItems as imputeMissingGGItemsSource } from '../../src/utils/imputationCalculations.js';

// Re-export with clear names
export { getFunctionCovariatesSource as getFunctionCovariates };
export { calculateImputedValueSource as calculateImputedValue };
export { imputeMissingGGItemsSource as imputeMissingGGItems };
```

**Better Approach**: Copy the actual function implementations here (not import from src) to ensure they're truly server-only.

#### Step 2.2: Create Server-Only Coefficient Loader
Create new file: `api/utils/serverCoefficientLoader.js`

```javascript
// api/utils/serverCoefficientLoader.js
// Server-only coefficient loading

import { getFunctionMultipliers as getFunctionMultipliersSource } from '../../src/utils/coefficientLoader.js';
import { getImputationMultipliers as getImputationMultipliersSource } from '../../src/utils/coefficientLoader.js';
import { getImputationMultipliersForItem as getImputationMultipliersForItemSource } from '../../src/utils/coefficientLoader.js';
import { getImputationThresholds as getImputationThresholdsSource } from '../../src/utils/coefficientLoader.js';

export { getFunctionMultipliersSource as getFunctionMultipliers };
export { getImputationMultipliersSource as getImputationMultipliers };
export { getImputationMultipliersForItemSource as getImputationMultipliersForItem };
export { getImputationThresholdsSource as getImputationThresholds };
```

#### Step 2.3: Update API Endpoints
Update `api/calculate/function-score.js`:
```javascript
// Change from:
const calculations = await import('../../src/utils/calculations.js');

// To:
import { getFunctionCovariates } from '../utils/serverCalculations.js';
import { getFunctionMultipliers } from '../utils/serverCoefficientLoader.js';
```

Update `api/calculate/imputation.js`:
```javascript
// Change from:
const { calculateImputedValue } = await import('../../src/utils/fileParser.js');
const { imputeMissingGGItems } = await import('../../src/utils/imputationCalculations.js');

// To:
import { calculateImputedValue } from '../utils/serverCalculations.js';
import { imputeMissingGGItems } from '../utils/serverCalculations.js';
```

#### Step 2.4: Remove/Stub Client-Side Functions
In `src/utils/calculations.js`, remove or stub `getFunctionCovariates()`:
```javascript
// Remove or replace with:
export function getFunctionCovariates() {
  throw new Error(
    'getFunctionCovariates() is server-only. Use calculateFunctionScore() from secureApiClient.js instead.'
  );
}
```

Do the same for:
- `src/utils/fileParser.js` - `calculateImputedValue()`
- `src/utils/imputationCalculations.js` - `imputeMissingGGItems()`

**Estimated Time**: 4-6 hours

---

### 3. Configure Token Retrieval (HIGH)

**File**: `src/utils/secureApiClient.js`

**Current Issue**: `getSSOToken()` function has placeholder logic (lines 55-58).

**Action Required**:
1. Determine how myCare provides tokens (localStorage, cookie, URL param, parent window, etc.)
2. Implement `getSSOToken()` accordingly
3. Test token retrieval

**Estimated Time**: 1-2 hours

---

### 4. Verify Client Migration (HIGH)

**Action Required**:
1. Search for any remaining imports of proprietary functions:
   ```bash
   grep -r "getFunctionCovariates" src/
   grep -r "calculateImputedValue" src/
   grep -r "imputeMissingGGItems" src/
   ```
2. Replace any remaining client-side usage with secure API calls
3. Remove unused imports

**Estimated Time**: 2-3 hours

---

## Before Production Deployment

### 5. Remove/Disable Development Bypass (MEDIUM)

**Files**:
- `api/auth/validate-token.js` (lines 26-32)
- `src/utils/secureApiClient.js` (lines 27-34)

**Action Required**:
1. Wrap dev bypass in strict environment checks:
   ```javascript
   const isDev = process.env.NODE_ENV === 'development' 
     && process.env.VERCEL_ENV !== 'production'
     && process.env.ALLOW_DEV_BYPASS === 'true';
   ```
2. Set `ALLOW_DEV_BYPASS=true` only in local development
3. Verify bypass is disabled in production builds

**Estimated Time**: 1 hour

---

### 6. Add Rate Limiting (MEDIUM)

**Action Required**:
1. Install rate limiting library (if not already):
   ```bash
   npm install express-rate-limit
   ```
2. Add rate limiting to calculation endpoints:
   ```javascript
   import rateLimit from 'express-rate-limit';

   const calculationLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // Limit each IP to 100 requests per windowMs
     message: 'Too many calculation requests, please try again later.'
   });

   // Apply to endpoints
   app.post('/api/calculate/function-score', calculationLimiter, protectExpressRoute(...));
   ```

**Estimated Time**: 1-2 hours

---

### 7. Security Audit Checklist

Before production, verify:

- [ ] Token validation rejects invalid tokens
- [ ] Token validation accepts valid tokens from myCare
- [ ] Protected endpoints return 401 without valid token
- [ ] Protected endpoints work with valid token
- [ ] Development bypass is disabled in production
- [ ] Client bundle does NOT contain proprietary calculation functions
  - Check: Build the app and search for function names in `dist/assets/*.js`
  - Verify `getFunctionCovariates`, `calculateImputedValue`, `imputeMissingGGItems` are NOT in client bundle
- [ ] All components use secure API client
- [ ] Error handling doesn't expose internal details
- [ ] HTTPS is enforced (check `vercel.json`)
- [ ] CORS is properly configured (only myCare domains allowed)

**Estimated Time**: 2-3 hours

---

## Testing Checklist

### Unit Tests
- [ ] Token validation with valid token → success
- [ ] Token validation with invalid token → 401
- [ ] Token validation with missing token → 401
- [ ] Calculation endpoint with valid token → returns results
- [ ] Calculation endpoint without token → 401
- [ ] Imputation endpoint with valid token → returns results
- [ ] Imputation endpoint without token → 401

### Integration Tests
- [ ] Client can retrieve SSO token from myCare
- [ ] Client can call calculation endpoint with token
- [ ] Client handles 401 errors gracefully
- [ ] Client handles network errors gracefully
- [ ] Rate limiting works correctly

### Security Tests
- [ ] Try to access endpoints without token → should fail
- [ ] Try to access endpoints with fake token → should fail
- [ ] Try to access endpoints with expired token → should fail
- [ ] Check client bundle for proprietary functions → should not exist
- [ ] Try to call protected endpoints from different origin → should fail (CORS)

---

## Questions You Need to Answer (SAML-Specific)

Before starting implementation, determine:

1. **SAML Flow Type**:
   - [ ] IdP-initiated (user clicks link in myCare → redirected to your app)?
   - [ ] SP-initiated (user accesses your app → redirected to myCare)?
   - [ ] Both?

2. **Session Token After SAML**:
   - [ ] Does myCare provide a session token after SAML authentication?
   - [ ] What's the token format? (JWT, custom string, etc.)
   - [ ] Where is it stored? (cookie name? localStorage key?)
   - [ ] Token expiration time?
   - [ ] Token refresh mechanism?

3. **Token Validation**:
   - [ ] Does myCare have a validation endpoint? (URL?)
   - [ ] Or is it a JWT that you validate with a public key?
   - [ ] What's the authentication method?
   - [ ] Request/response format?

4. **SAML Metadata** (if you need to handle SAML directly):
   - [ ] Do you have myCare's SAML metadata URL?
   - [ ] Or do you have their public certificate?
   - [ ] What's the Entity ID?
   - [ ] What's the Assertion Consumer Service (ACS) URL?

5. **User Attributes**:
   - [ ] What user attributes are in the SAML assertion/session token?
   - [ ] (email, name, user ID, roles, etc.)

6. **Deployment environment?**
   - [ ] Vercel?
   - [ ] Other?
   - [ ] How to set environment variables?

---

## Quick Start Guide

### Since myCare uses SAML:

**Most Likely Scenario**: myCare handles the SAML flow and provides a session token after authentication.

1. **Get from myCare**:
   - Session token format (JWT? custom string?)
   - Where it's stored (cookie? localStorage?)
   - Validation endpoint URL (if they provide one)
   - Or public key (if token is JWT)

2. **If Session Token is JWT**:
   ```bash
   npm install jsonwebtoken
   ```
   ```javascript
   import jwt from 'jsonwebtoken';
   
   async function validateSSOToken(token) {
     if (!token) return { valid: false, error: 'No token provided' };
     
     try {
       const decoded = jwt.verify(token, process.env.SESSION_PUBLIC_KEY, {
         algorithms: ['RS256']
       });
       return { valid: true, user: decoded };
     } catch (error) {
       return { valid: false, error: `Token validation failed: ${error.message}` };
     }
   }
   ```
   Set environment variable: `SESSION_PUBLIC_KEY`

3. **If Session Token Validated via API**:
   ```javascript
   async function validateSSOToken(token) {
     if (!token) return { valid: false, error: 'No token provided' };
     
     try {
       const response = await fetch(process.env.MYCARE_VALIDATE_SESSION_URL, {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${token}` },
         signal: AbortSignal.timeout(5000)
       });
       
       if (!response.ok) return { valid: false, error: 'Invalid session' };
       
       const user = await response.json();
       return { valid: true, user };
     } catch (error) {
       return { valid: false, error: `Token validation failed: ${error.message}` };
     }
   }
   ```
   Set environment variable: `MYCARE_VALIDATE_SESSION_URL`

**See**: `docs/SAML_IMPLEMENTATION_GUIDE.md` for full SAML implementation options.

### Alternative: If myCare uses API validation (non-SAML):

1. **Get myCare validation endpoint URL**
2. **Update `api/auth/validate-token.js`**:
   ```javascript
   async function validateSSOToken(token) {
     if (!token) {
       return { valid: false, error: 'No token provided' };
     }

     try {
       const response = await fetch(process.env.SSO_VALIDATION_URL, {
         method: 'POST',
         headers: { 
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         },
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
3. **Set environment variable**: `SSO_VALIDATION_URL`

---

## Timeline Estimate

| Phase | Tasks | Time | Priority |
|-------|-------|------|----------|
| **Phase 1: Critical Fixes** | Token validation + Server-only module | 6-10 hours | CRITICAL |
| **Phase 2: Configuration** | Token retrieval + Client migration verification | 3-5 hours | HIGH |
| **Phase 3: Hardening** | Remove bypass + Rate limiting + Security audit | 4-6 hours | MEDIUM |
| **Total** | | **13-21 hours** | |

**Recommendation**: Complete Phase 1 before any production deployment. Phase 2 and 3 can be done incrementally.

---

## Need Help?

If you're stuck on any step:
1. Check the detailed security assessment: `docs/SECURITY_ASSESSMENT.md`
2. Review the implementation guide: `docs/SECURITY_IMPLEMENTATION.md`
3. Check myCare documentation for SSO integration details
4. Test with development bypass token first to verify endpoints work

