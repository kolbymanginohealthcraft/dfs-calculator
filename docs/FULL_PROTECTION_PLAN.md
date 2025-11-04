# Full IP Protection Plan

**Goal:** Complete protection against reverse engineering - 100% server-side calculations with zero sensitive data exposed to client.

## Current Status: ~75% Protected

### ✅ What's Already Protected
- Main calculation APIs exist (`/api/calculate/basic-score`, `/api/calculate/advanced-score`)
- Client-side fallbacks removed
- Authentication framework in place

### ❌ Critical Gaps (25% Remaining)

## Gap 1: Data Files Exposed via HTTP Endpoint

**Problem:** `api/data/[filename].js` serves all coefficient data via HTTP without authentication:
- `coefficients-all-versions.json` (~300KB) - **ALL CMS coefficients**
- `icdToHcc.json` - ICD to HCC mapping
- `end-score-coefficients.json` - End score coefficients

**Impact:** Anyone can download complete coefficient data and reverse engineer the models.

**Fix Required:**
1. Remove or password-protect `/api/data/[filename]` endpoint
2. Move all data file access to server-side only (in `src/utils/server.js`)

## Gap 2: Coefficient Data Bundled into Client JavaScript

**Problem:** Multiple files import coefficient data directly:
- `src/utils/coefficientLoader.js` - Imports `coefficients-all-versions.json`
- `src/utils/calculations.js` - Imports `coefficientLoader.js` (brings coefficients into bundle)
- `src/utils/imputationCalculations.js` - Imports `coefficientLoader.js`
- `src/utils/hccMapping.js` - Imports `icdToHcc.json`
- `src/utils/endScoreImputation.js` - Imports `end-score-coefficients.json`

**Impact:** All coefficient data (~400KB) is bundled into the client JavaScript bundle. Anyone can:
1. Download the bundle
2. Extract the JSON data
3. See all coefficients, multipliers, and thresholds

**Fix Required:**
1. Create separate server-only versions of these utilities
2. Remove all data imports from client-side code
3. Create API endpoints for any client needs (thresholds, etc.)

## Gap 3: Client-Side Imputation Calculations

**Problem:** `src/components/ImputationTab.jsx` performs imputation calculations client-side:
- Uses multipliers from `results` (which may come from server)
- Calculates `imputationScore` in browser
- Uses `getImputationThresholds()` which accesses multipliers

**Impact:** Imputation algorithm is visible and can be reverse engineered.

**Fix Required:**
1. Create `/api/calculate/imputation-details` endpoint
2. Move all imputation calculation logic to server
3. Make `ImputationTab` a pure display component that calls API

## Gap 4: Calculation Logic Still in Client Bundle

**Problem:** Even though calculations are server-side, the logic files are still in the bundle:
- `src/utils/calculations.js` - Contains `getFunctionCovariates()` logic
- `src/utils/imputationCalculations.js` - Contains imputation algorithms
- These files are imported by client code (even if not executed)

**Impact:** Algorithm structure is visible in source code.

**Fix Required:**
1. Split client and server utilities completely
2. Create `src/utils/server/` directory for server-only code
3. Ensure no server code is imported by client components

## Gap 5: Missing API Endpoints

**Problem:** Some functionality lacks proper API endpoints:
- Imputation details for `ImputationTab`
- End score calculations with imputation
- Threshold lookups

**Fix Required:**
1. Create all missing API endpoints
2. Ensure all calculations go through APIs

---

## Implementation Plan

### Phase 1: Secure Data Files (HIGH PRIORITY)

**Step 1.1:** Remove public data file endpoint
```javascript
// DELETE or secure: api/data/[filename].js
// Or add authentication middleware
```

**Step 1.2:** Move all data access to server-side only
- Keep data files in `api/data/`
- Only access them from `src/utils/server.js` and API routes
- Never import them in client-side code

**Step 1.3:** Create API endpoint for any client needs
```javascript
// api/calculate/imputation-thresholds.js
// Returns thresholds for a specific item (no multipliers)
// Requires SSO token for advanced mode
```

### Phase 2: Remove Client-Side Data Imports (CRITICAL)

**Step 2.1:** Create server-only utility directory
```
src/utils/server/
├── coefficientLoader.js (server-only)
├── calculations.js (server-only)
├── imputationCalculations.js (server-only)
├── hccMapping.js (server-only)
└── endScoreImputation.js (server-only)
```

**Step 2.2:** Update server.js to use server-only utilities
```javascript
// src/utils/server.js
import { getFunctionMultipliers } from './server/coefficientLoader.js';
import { getFunctionCovariates } from './server/calculations.js';
// etc.
```

**Step 2.3:** Remove all data imports from client-side files
- Remove `coefficientLoader.js` import from client code
- Remove `hccMapping.js` from client bundle
- Keep only simple utilities in client (e.g., `clientCalculations.js`)

**Step 2.4:** Update build configuration
```javascript
// vite.config.js - ensure server utils are excluded
build: {
  rollupOptions: {
    external: ['../server/*'] // Exclude server utilities
  }
}
```

### Phase 3: Move Imputation to Server (HIGH PRIORITY)

**Step 3.1:** Create `/api/calculate/imputation-details` endpoint
```javascript
// api/calculate/imputation-details.js
POST /api/calculate/imputation-details
Body: { mdsXmlData, targetGGItems? }
Response: {
  imputationData: {
    [ggItemId]: {
      covariates,
      multipliers,
      imputationScore,
      thresholds,
      imputedValue,
      originalValue,
      needsImputation
    }
  }
}
```

**Step 3.2:** Update `ImputationTab.jsx`
- Remove all calculation logic
- Call API for all imputation data
- Display results only

**Step 3.3:** Remove `getImputationThresholds` from client
- Move to server-only utility
- Return via API if needed

### Phase 4: Complete API Coverage

**Step 4.1:** Create missing endpoints
```javascript
// api/calculate/end-score.js (if not exists)
// api/calculate/imputation-details.js
// api/calculate/imputation-thresholds.js (optional)
```

**Step 4.2:** Update all client components
- Ensure no direct calculation calls
- All calculations go through API

### Phase 5: Code Organization

**Step 5.1:** Final code split
```
Client-side (bundled):
├── src/utils/clientCalculations.js (simple arithmetic only)
├── src/utils/clientFileParser.js (XML parsing)
└── src/utils/apiService.js (API calls only)

Server-side (NOT bundled):
├── src/utils/server/
│   ├── coefficientLoader.js
│   ├── calculations.js
│   ├── imputationCalculations.js
│   ├── hccMapping.js
│   └── endScoreImputation.js
└── src/utils/server.js (Express server)
```

**Step 5.2:** Verify bundle
- Build production bundle
- Check bundle size (should be ~300KB smaller)
- Verify no coefficient data in bundle
- Use browser DevTools to inspect bundle contents

---

## Authentication Requirements

### SSO Token Integration
Since IT handles SSO, you only need to:
1. Accept token from IT's SSO system
2. Validate token in API middleware
3. Pass token to API service

**Current Status:** `getAuthToken()` returns `null` - needs integration point.

**Required Changes:**
```javascript
// src/utils/apiService.js
export function getAuthToken() {
  // Integration point for IT's SSO token
  // Options:
  // 1. From URL parameter: ?token=...
  // 2. From localStorage: localStorage.getItem('sso_token')
  // 3. From parent window: window.parent.postMessage/getMessage
  // 4. From cookie: document.cookie
  // Whatever IT provides, use it here
  return window.portalToken || 
         localStorage.getItem('sso_token') || 
         new URLSearchParams(window.location.search).get('token') ||
         null;
}
```

**Server Validation:**
```javascript
// src/utils/server.js or middleware
function validateSSOToken(token) {
  // Option 1: Simple validation (if IT provides simple token)
  if (token && token.startsWith('sso_')) return true;
  
  // Option 2: JWT validation (if IT provides JWT)
  // Use jwt.verify() with IT's public key
  
  // Option 3: API call to IT's validation service
  // Call IT's token validation endpoint
  
  // Whatever IT requires, implement here
  return false;
}
```

---

## Testing Checklist

### Security Tests
- [ ] Build production bundle
- [ ] Inspect bundle for coefficient data (should be 0 bytes)
- [ ] Try accessing `/api/data/coefficients-all-versions.json` (should fail or require auth)
- [ ] Check browser DevTools - no coefficient data in Network tab
- [ ] Verify all calculations go through API
- [ ] Test with invalid/no token - should fail gracefully

### Functionality Tests
- [ ] Basic mode calculations work
- [ ] Advanced mode calculations work (with SSO token)
- [ ] Imputation tab shows correct data
- [ ] End score calculations work
- [ ] All features function as before

### Performance Tests
- [ ] Bundle size reduced by ~300-400KB
- [ ] Initial load time improved
- [ ] API response times acceptable (<200ms)

---

## Expected Results

### Before (Current)
- Bundle size: ~1,500 KB (includes 300KB coefficients)
- Data exposed: ✅ Coefficients, thresholds, multipliers
- Calculations: ⚠️ Some client-side, some server-side
- Protection: ~75%

### After (Full Protection)
- Bundle size: ~1,200 KB (no coefficients)
- Data exposed: ❌ None (all server-side)
- Calculations: ✅ 100% server-side
- Protection: ~100%

### What's Protected
- ✅ All coefficient data (function, imputation, end-score)
- ✅ All calculation algorithms
- ✅ All business logic
- ✅ ICD to HCC mapping
- ✅ Threshold values
- ✅ Multiplier application logic

### What Remains Client-Side (Safe)
- ✅ UI components (React)
- ✅ XML parsing (no sensitive data)
- ✅ Simple arithmetic (function score - just addition)
- ✅ Data display (results only)

---

## Deployment Notes

1. **Environment Variables:**
   - `VITE_PUBLIC_TOKEN` - Public token for basic mode
   - `SSO_VALIDATION_SECRET` - Secret for SSO validation (if needed)

2. **Server Configuration:**
   - Ensure `src/utils/server/` directory is NOT included in client bundle
   - Verify Vercel/serverless functions have access to `api/data/` files

3. **SSO Integration:**
   - Coordinate with IT on token format
   - Implement token validation based on IT's requirements
   - Test SSO flow end-to-end

---

## Timeline Estimate

- **Phase 1 (Secure Data Files):** 2-4 hours
- **Phase 2 (Remove Client Imports):** 4-6 hours
- **Phase 3 (Move Imputation):** 3-4 hours
- **Phase 4 (Complete APIs):** 2-3 hours
- **Phase 5 (Code Organization):** 2-3 hours
- **Testing & Bug Fixes:** 4-6 hours

**Total:** ~17-26 hours of focused work

---

## Risk Assessment

### Low Risk
- Removing client-side imports (straightforward refactor)
- Creating API endpoints (pattern already established)

### Medium Risk
- ImputationTab refactor (ensure UI still works correctly)
- SSO token integration (depends on IT's implementation)

### High Risk
- Build configuration changes (ensure server code isn't bundled)
- Breaking changes if not tested thoroughly

### Mitigation
- Test each phase independently
- Keep old code commented until verified
- Test in staging before production
- Have rollback plan ready

