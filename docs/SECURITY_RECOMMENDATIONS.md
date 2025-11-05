# Additional Security Recommendations for Protecting Sensitive Business Logic

## Executive Summary

You've already done excellent work moving proprietary logic to server-only files. Here are additional recommendations to further harden your security posture.

## ✅ What You've Already Done Well

1. ✅ Proprietary logic moved to `api/utils/` (server-only)
2. ✅ Client-side functions stubbed with error throwing
3. ✅ SAML token validation infrastructure in place
4. ✅ Protected API endpoints with authentication
5. ✅ Security headers configured in `vercel.json`
6. ✅ HTTPS enforced via redirects

## 🔒 Critical Recommendations (Do Before Production)

### 1. **Disable Source Maps in Production Build** ⚠️ CRITICAL

**Issue**: Source maps can reveal your code structure and make reverse engineering easier.

**Solution**: Ensure Vite doesn't generate source maps for production:

```javascript
// vite.config.js
export default defineConfig({
  build: {
    sourcemap: false, // Add this line
    // ... rest of config
  }
});
```

**Impact**: Prevents attackers from easily mapping minified code back to original source.

---

### 2. **Remove Console Statements from Production** ⚠️ HIGH

**Issue**: Console statements can leak information about your algorithm flow.

**Current**: Found console.error/console.warn in API files (acceptable for server-side logging).

**Recommendation**: 
- ✅ Keep console statements in API files (server-side is fine)
- ⚠️ Remove console.log from client-side code or use a logger that strips them in production
- Consider using a build-time plugin to strip console statements from production builds

**Implementation**: Add to `vite.config.js`:
```javascript
// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    // Remove console statements in production
    ...(process.env.NODE_ENV === 'production' ? [
      {
        name: 'remove-console',
        transform(code, id) {
          if (process.env.NODE_ENV === 'production') {
            return code.replace(/console\.(log|debug|info|warn)/g, '// console.$1');
          }
        }
      }
    ] : [])
  ],
  // ... rest of config
});
```

---

### 3. **Add Rate Limiting to API Endpoints** ⚠️ HIGH

**Issue**: Without rate limiting, attackers could:
- Make unlimited requests to probe your API
- Potentially discover patterns in your algorithm
- Cause DoS attacks

**Solution**: Implement rate limiting on calculation endpoints:

```javascript
// api/utils/rateLimiter.js
const rateLimitMap = new Map();

export function rateLimit(identifier, maxRequests = 100, windowMs = 60000) {
  const now = Date.now();
  const key = identifier;
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  const limit = rateLimitMap.get(key);
  
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + windowMs;
    return true;
  }
  
  if (limit.count >= maxRequests) {
    return false;
  }
  
  limit.count++;
  return true;
}
```

Then use in your API endpoints:
```javascript
// api/calculate/function-score.js
import { rateLimit } from '../utils/rateLimiter.js';

export default async function handler(req, res) {
  // ... existing code ...
  
  // Rate limiting
  const identifier = req.user?.id || req.headers['x-forwarded-for'] || 'unknown';
  if (!rateLimit(identifier, 100, 60000)) { // 100 requests per minute
    return res.status(429).json({ 
      error: 'Too many requests', 
      message: 'Rate limit exceeded. Please try again later.' 
    });
  }
  
  // ... rest of handler
}
```

---

### 4. **Harden Development Bypass Detection** ⚠️ HIGH

**Issue**: Current dev bypass checks could be bypassed if environment variables aren't set correctly.

**Current Code**:
```javascript
const isDev = process.env.NODE_ENV === 'development' || 
              process.env.VERCEL_ENV !== 'production' || 
              !process.env.VERCEL_ENV;
```

**Recommendation**: Make it more explicit and fail-safe:

```javascript
// api/auth/validate-token.js
const isDev = process.env.NODE_ENV === 'development' 
  && process.env.VERCEL_ENV !== 'production'
  && process.env.ALLOW_DEV_BYPASS === 'true' // Require explicit flag
  && process.env.VERCEL === undefined; // Not running on Vercel

// In production, require explicit production flag
const isProduction = process.env.VERCEL_ENV === 'production' 
  || process.env.NODE_ENV === 'production'
  || (process.env.VERCEL && !process.env.VERCEL_ENV);
```

**Action**: Set `ALLOW_DEV_BYPASS=true` only in local `.env` file (never commit to git).

---

### 5. **Add Request Size Limits** ⚠️ MEDIUM

**Issue**: Large payloads could be used for DoS attacks or to probe for vulnerabilities.

**Solution**: Add size limits to API endpoints:

```javascript
// api/calculate/function-score.js
export default async function handler(req, res) {
  // Check request size (Vercel has a limit, but add explicit check)
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    return res.status(413).json({ 
      error: 'Payload too large',
      message: 'Request body exceeds maximum size limit' 
    });
  }
  
  // Validate request body exists and is reasonable
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ 
      error: 'Invalid request',
      message: 'Request body must be a valid JSON object' 
    });
  }
  
  // ... rest of handler
}
```

---

### 6. **Add Request Timeout Protection** ⚠️ MEDIUM

**Issue**: Complex calculations could be exploited to cause timeouts or resource exhaustion.

**Solution**: Add timeout handling:

```javascript
// api/utils/timeoutHandler.js
export function withTimeout(promise, timeoutMs = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}

// Usage in API endpoints:
const result = await withTimeout(
  performCalculation(params),
  30000 // 30 second timeout
);
```

---

### 7. **Remove Stub Functions from Client Bundle** ⚠️ MEDIUM

**Issue**: Stubbed functions are still in the client bundle, making it slightly larger and revealing function names.

**Current**: Stubs throw errors (secure) but still take up space.

**Solution**: Use build-time code elimination to remove unused exports:

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Tree-shake unused exports
        manualChunks: undefined, // Let Vite optimize
      },
      // Remove dead code
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    }
  }
});
```

**Note**: Since stubs are exported, they won't be removed automatically. Consider:
- Removing exports entirely if nothing imports them
- Or keeping them as stubs (they're small and provide clear error messages)

---

### 8. **Add Input Validation and Sanitization** ⚠️ MEDIUM

**Issue**: Malformed input could expose error messages or cause unexpected behavior.

**Solution**: Add strict validation:

```javascript
// api/utils/validation.js
export function validateCalculationRequest(body) {
  const errors = [];
  
  if (!body.parsedValues || typeof body.parsedValues !== 'object') {
    errors.push('parsedValues must be an object');
  }
  
  if (!body.summary || typeof body.summary !== 'object') {
    errors.push('summary must be an object');
  }
  
  if (!Array.isArray(body.icdList)) {
    errors.push('icdList must be an array');
  }
  
  if (!body.startScores || typeof body.startScores !== 'object') {
    errors.push('startScores must be an object');
  }
  
  // Validate ARD date format
  if (body.ardDate && !/^\d{4}-\d{2}-\d{2}$|^\d{8}$/.test(body.ardDate)) {
    errors.push('ardDate must be in YYYY-MM-DD or YYYYMMDD format');
  }
  
  // Limit array sizes to prevent DoS
  if (body.icdList && body.icdList.length > 100) {
    errors.push('icdList cannot exceed 100 items');
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return true;
}
```

---

### 9. **Add Audit Logging** ⚠️ MEDIUM

**Issue**: No visibility into who's accessing your proprietary endpoints.

**Solution**: Log authentication attempts and calculation requests:

```javascript
// api/utils/auditLogger.js
export function logCalculationRequest(userId, endpoint, success, error = null) {
  // In production, send to logging service (e.g., Vercel Analytics, LogRocket, etc.)
  if (process.env.NODE_ENV === 'production') {
    // Log to your logging service
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      userId,
      endpoint,
      success,
      error: error?.message,
      // Don't log sensitive data
    }));
  }
}
```

**Note**: Be careful not to log sensitive patient data or calculation inputs/outputs.

---

### 10. **Enhance CORS Configuration** ⚠️ MEDIUM

**Issue**: Current CSP allows `'unsafe-inline'` and `'unsafe-eval'` which could be security risks.

**Current**: `vercel.json` has good headers, but CSP could be stricter.

**Recommendation**: Tighten CSP if possible:
```json
{
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://data.cms.gov; frame-ancestors 'none';"
}
```

**Note**: Removing `'unsafe-inline'` and `'unsafe-eval'` may break some React functionality - test carefully.

---

### 11. **Add Request Idempotency** ⚠️ LOW (Optional)

**Issue**: Repeated identical requests could be used to probe your algorithm.

**Solution**: Cache identical requests for a short period:

```javascript
// api/utils/requestCache.js
const requestCache = new Map();

export function getCachedResult(key, ttl = 60000) {
  const cached = requestCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.result;
  }
  requestCache.delete(key);
  return null;
}

export function setCachedResult(key, result, ttl = 60000) {
  requestCache.set(key, {
    result,
    expires: Date.now() + ttl
  });
}
```

---

### 12. **Obfuscate Error Messages** ⚠️ LOW

**Issue**: Error messages could reveal information about your algorithm.

**Current**: You already check `NODE_ENV` for detailed errors (good!).

**Enhancement**: Make generic errors even more generic:

```javascript
// Instead of:
throw new Error('Invalid ARD date format');

// Use:
throw new Error('Invalid request parameters'); // Generic
```

---

## 📋 Implementation Priority

### Before Production (Must Do)
1. ✅ Disable source maps in production
2. ✅ Remove console.log from client builds
3. ✅ Add rate limiting
4. ✅ Harden dev bypass detection
5. ✅ Configure SAML certificate (already documented)

### Short Term (Within 1-2 Weeks)
6. Add request size limits
7. Add input validation
8. Add audit logging
9. Review and tighten CSP

### Long Term (Optional Enhancements)
10. Add request timeouts
11. Remove stubs from bundle (if possible)
12. Add request caching/idempotency
13. Further obfuscate error messages

---

## Testing Checklist

Before production, verify:
- [ ] Source maps are disabled in production build
- [ ] Console statements removed from client bundle
- [ ] Rate limiting works (test with multiple rapid requests)
- [ ] Dev bypass is disabled in production
- [ ] Request size limits enforced
- [ ] Input validation rejects malformed requests
- [ ] Error messages don't leak algorithm details
- [ ] Audit logging captures authentication attempts
- [ ] HTTPS is enforced (already configured ✅)
- [ ] CORS is properly configured (already configured ✅)

---

## Additional Considerations

### 1. **Code Comments**
Remove or minimize comments that explain proprietary logic:
- ✅ Server-side comments are fine (server code isn't exposed)
- ⚠️ Client-side comments should avoid explaining algorithm details

### 2. **Variable Names**
Consider using less descriptive variable names in proprietary functions:
- Server-side: Can use descriptive names (they're protected)
- Client-side stubs: Names are already generic (good)

### 3. **Build Verification**
Regularly verify your production build:
```bash
# Check bundle contents
npm run build
# Inspect dist/assets/*.js files
# Search for proprietary function names
grep -r "getFunctionCovariates" dist/
# Should return empty (or only in error messages)
```

### 4. **Monitor for Unauthorized Access**
Set up alerts for:
- Repeated authentication failures
- Unusual request patterns
- High API usage from single users
- Requests from unexpected IP ranges

---

## Summary

Your security foundation is solid! The main gaps are:
1. **Source maps** - Disable them in production
2. **Rate limiting** - Prevent abuse and probing
3. **Dev bypass hardening** - Make it more explicit
4. **Input validation** - Prevent malformed requests

These will significantly harden your security posture without major architectural changes.

