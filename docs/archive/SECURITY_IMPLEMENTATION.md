# Security Implementation Guide

## Overview

This document describes the security implementation that protects the proprietary calculation algorithm while maintaining HIPAA compliance, speed, and functionality.

## Architecture

### What's Protected (Server-Side)
- **Calculation Algorithm**: The `getFunctionCovariates()` function and how it combines multipliers
- **Imputation Logic**: The proprietary imputation algorithm
- **Multiplier Selection**: How version-specific multipliers are selected and applied

### What Stays Client-Side (For Speed)
- **File Parsing**: XML parsing happens immediately in the browser
- **Data Validation**: File validation provides instant feedback
- **UI Rendering**: All display logic remains client-side
- **Lookup Data**: Public CMS data (ICD codes, HCC mappings, etc.) remains accessible

## Components

### 1. SSO Token Validation (`api/auth/validate-token.js`)
- Validates SSO tokens from myCare portal
- Flexible design supports multiple token formats (JWT, session tokens, etc.)
- Currently uses placeholder validation - **MUST be customized before production**

### 2. Protected Calculation Endpoints

#### `/api/calculate/function-score`
- Calculates covariates and weighted scores
- Requires valid SSO token
- Accepts parsed MDS data (not raw files)

#### `/api/calculate/imputation`
- Handles imputation calculations
- Supports both single-item and batch imputation
- Requires valid SSO token

### 3. Client API Client (`src/utils/secureApiClient.js`)
- Handles SSO token retrieval
- Provides clean interfaces for API calls
- Manages authentication headers automatically

## Setup Instructions

### Step 1: Configure SSO Token Validation

Edit `api/auth/validate-token.js` and implement the `validateSSOToken()` function based on your myCare SSO format:

**Option A: JWT Tokens**
```javascript
const jwt = require('jsonwebtoken');
const decoded = jwt.verify(token, process.env.SSO_PUBLIC_KEY);
return { valid: true, user: decoded };
```

**Option B: API Validation**
```javascript
const response = await fetch('https://mycare.com/api/validate-token', {
  headers: { 'Authorization': `Bearer ${token}` }
});
if (!response.ok) return { valid: false, error: 'Invalid token' };
const user = await response.json();
return { valid: true, user };
```

### Step 2: Configure Token Retrieval

Edit `src/utils/secureApiClient.js` and implement `getSSOToken()` based on how myCare provides tokens:

**Option A: localStorage**
```javascript
return localStorage.getItem('mycare_sso_token');
```

**Option B: Cookie**
```javascript
const cookies = document.cookie.split(';');
const tokenCookie = cookies.find(c => c.trim().startsWith('mycare_token='));
return tokenCookie ? tokenCookie.split('=')[1] : null;
```

**Option C: URL Parameter**
```javascript
return new URLSearchParams(window.location.search).get('sso_token');
```

### Step 3: Development Mode

For local development, you can use the bypass token:

```javascript
// In browser console
localStorage.setItem('dev-sso-token', 'dev-bypass-token');
```

**⚠️ IMPORTANT**: Remove or secure the dev bypass before production!

## Migration Guide

### Current Code (Client-Side)
```javascript
import { getFunctionCovariates } from '../utils/calculations';

const result = getFunctionCovariates(
  parsedValues,
  summary,
  icdList,
  startScores,
  ardDate,
  manualOverrides
);
```

### New Code (Secure API)
```javascript
import { calculateFunctionScore } from '../utils/secureApiClient';

const result = await calculateFunctionScore({
  parsedValues,
  summary,
  icdList,
  startScores,
  ardDate,
  manualOverrides
});
```

### Example: Updating AdvancedAppDetail

**Before:**
```javascript
useEffect(() => {
  if (hasFile && Object.keys(parsedValues).length > 0) {
    const icdList = Object.entries(parsedValues)
      .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
      .map(([_, value]) => value)
      .filter(Boolean);

    const multipliers = getFunctionMultipliers(ardDate);
    setVersionMultipliers(multipliers);

    const result = getFunctionCovariates(
      parsedValues,
      extractPatientSummary(parsedValues, ardDate),
      icdList,
      startScores,
      ardDate,
      manualCovariateOverrides
    );

    if (result) {
      setCovariates(result.covariates || {});
      setWeightedScore(result.weightedScore || 0);
    }
  }
}, [hasFile, parsedValues, startScores, ardDate, manualCovariateOverrides]);
```

**After:**
```javascript
useEffect(() => {
  if (hasFile && Object.keys(parsedValues).length > 0) {
    const icdList = Object.entries(parsedValues)
      .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
      .map(([_, value]) => value)
      .filter(Boolean);

    const calculateScores = async () => {
      try {
        const result = await calculateFunctionScore({
          parsedValues,
          summary: extractPatientSummary(parsedValues, ardDate),
          icdList,
          startScores,
          ardDate,
          manualOverrides: manualCovariateOverrides
        });

        setVersionMultipliers(result.multipliers);
        setCovariates(result.covariates || {});
        setWeightedScore(result.weightedScore || 0);
      } catch (error) {
        console.error('Calculation failed:', error);
        // Handle error (show message to user, etc.)
      }
    };

    calculateScores();
  }
}, [hasFile, parsedValues, startScores, ardDate, manualCovariateOverrides]);
```

### Imputation Migration

**Before:**
```javascript
import { calculateImputedValue } from '../utils/fileParser';

const imputedValue = calculateImputedValue(
  ggItemId,
  parsedValues,
  summary,
  icdList,
  startScores
);
```

**After:**
```javascript
import { calculateImputedValue as calculateImputedValueSecure } from '../utils/secureApiClient';

const result = await calculateImputedValueSecure({
  ggItemId,
  parsedValues,
  summary,
  icdList,
  startScores,
  ardDate
});
const imputedValue = result.imputedValue;
```

## Error Handling

The secure API client throws errors for:
- Missing SSO token
- Authentication failures (401)
- API errors (400, 500, etc.)

Handle errors gracefully:
```javascript
try {
  const result = await calculateFunctionScore(params);
  // Use result
} catch (error) {
  if (error.message.includes('SSO token not found')) {
    // Redirect to login or show login message
  } else if (error.message.includes('Authentication failed')) {
    // Token expired, refresh page
  } else {
    // Other error, show user-friendly message
    console.error('Calculation error:', error);
  }
}
```

## Testing

### Test Protected Endpoints

```bash
# Without token (should fail)
curl -X POST http://localhost:3000/api/calculate/function-score \
  -H "Content-Type: application/json" \
  -d '{"parsedValues": {}, ...}'

# With token (should succeed)
curl -X POST http://localhost:3000/api/calculate/function-score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"parsedValues": {}, ...}'
```

### Development Bypass

For development, set the bypass token:
```javascript
localStorage.setItem('dev-sso-token', 'dev-bypass-token');
```

## Security Checklist

Before deploying to production:

- [ ] Implement real SSO token validation in `validateSSOToken()`
- [ ] Configure token retrieval in `getSSOToken()` based on myCare implementation
- [ ] Remove or secure development bypass tokens
- [ ] Test with real SSO tokens from myCare
- [ ] Verify all calculation endpoints require authentication
- [ ] Ensure error messages don't expose internal details
- [ ] Set appropriate cache headers (already done)
- [ ] Verify HTTPS is enforced (check vercel.json)

## Benefits

1. **Security**: Proprietary algorithm is protected on the server
2. **HIPAA Compliance**: Sensitive calculations happen server-side
3. **Speed**: File parsing and UI remain instant (client-side)
4. **Functionality**: No changes to user experience
5. **Maintainability**: Clear separation of concerns

## Performance Considerations

- API calls add minimal latency (~50-200ms depending on network)
- File parsing still happens instantly client-side
- Calculations are fast server-side
- Consider caching results for same inputs (future enhancement)

## Troubleshooting

### "SSO token not found" error
- Check `getSSOToken()` implementation
- Verify myCare is providing tokens
- Check browser console for token location

### 401 Unauthorized errors
- Verify token validation is working
- Check token format matches validator
- Ensure token hasn't expired

### Calculation fails
- Check server logs for detailed errors
- Verify request body matches expected format
- Ensure all required fields are provided
