# SAML SSO Implementation Guide

## Overview

Since myCare uses SAML for SSO, the authentication flow is different from JWT tokens. This guide provides SAML-specific implementation guidance.

## SAML Authentication Flow

### Typical SAML Flow

1. **User accesses your app** → App checks for session
2. **No session found** → Redirect to myCare SAML IdP (Identity Provider)
3. **User authenticates with myCare** → myCare validates credentials
4. **myCare sends SAML Response** → POST to your Assertion Consumer Service (ACS) endpoint
5. **Your app validates SAML assertion** → Verifies signature, checks expiration
6. **Create session** → Store user info in session/cookie
7. **Subsequent requests** → Use session token/cookie for validation

### Key Differences from JWT

- **SAML uses XML assertions** (not JSON tokens)
- **Requires signature validation** using myCare's public certificate
- **Typically involves redirects** (IdP-initiated or SP-initiated)
- **Session-based** after initial SAML authentication
- **POST binding** - SAML responses come via HTTP POST

## Implementation Options

### Option 1: Full SAML SP (Service Provider) Implementation

**Use when**: You need full SAML 2.0 support with redirects, metadata, etc.

**Libraries**:
- `passport-saml` (popular, well-maintained)
- `saml2-js` (lightweight alternative)
- `node-saml` (newer, TypeScript-friendly)

**Pros**: Full SAML support, handles redirects, metadata
**Cons**: More complex, requires SAML metadata endpoint

### Option 2: SAML Assertion Validation Only

**Use when**: myCare handles the SAML flow and just sends you assertions to validate

**Libraries**:
- `xml-encryption` + `xml-crypto` for signature validation
- `xml2js` for parsing SAML XML

**Pros**: Simpler, focused on validation
**Cons**: You don't handle the full SAML flow

### Option 3: Session Token After SAML

**Use when**: SAML is used for initial login, then myCare provides a separate session token

**Implementation**: Validate SAML assertion once, then use session token for API calls

**Pros**: Simplest for API authentication
**Cons**: Requires myCare to provide session tokens

## Recommended Approach for Vercel Serverless

Given that you're using Vercel serverless functions, **Option 3 (Session Token After SAML)** is likely the best fit:

1. SAML flow happens in myCare portal (IdP-initiated)
2. After SAML authentication, myCare provides a session token
3. Your app validates that session token for API requests

This avoids the complexity of handling SAML redirects in serverless functions.

## Questions to Ask myCare

Before implementing, you need to know:

1. **SAML Flow Type**:
   - [ ] IdP-initiated (user clicks link in myCare → redirected to your app)
   - [ ] SP-initiated (user accesses your app → redirected to myCare)
   - [ ] Both?

2. **Session Token Format**:
   - [ ] Does myCare provide a session token/cookie after SAML?
   - [ ] What's the token format? (JWT, custom string, etc.)
   - [ ] Where is it stored? (cookie, localStorage, URL param?)

3. **SAML Metadata**:
   - [ ] Do you have myCare's SAML metadata URL?
   - [ ] Or do you have their public certificate?
   - [ ] What's the Entity ID?

4. **Assertion Consumer Service (ACS) URL**:
   - [ ] What URL should myCare POST SAML responses to?
   - [ ] (e.g., `https://your-app.vercel.app/api/auth/saml/acs`)

5. **User Attributes**:
   - [ ] What user attributes are in the SAML assertion?
   - [ ] (email, name, user ID, roles, etc.)

## Implementation Steps

### Step 1: Install SAML Library

**For Full SAML Support** (if needed):
```bash
npm install passport-saml
npm install passport  # peer dependency
```

**For Assertion Validation Only**:
```bash
npm install xml-crypto xml2js
```

**For Session Token Approach** (recommended):
```bash
# No SAML library needed if myCare handles the flow
# Just need to validate session tokens
```

### Step 2: Create SAML ACS Endpoint (if handling SAML directly)

Create `api/auth/saml/acs.js`:

```javascript
import { protectRoute } from '../validate-token.js';
import saml2 from 'passport-saml';

// myCare SAML configuration
const samlConfig = {
  entryPoint: process.env.SAML_ENTRY_POINT, // myCare IdP URL
  issuer: process.env.SAML_ISSUER, // Your app's entity ID
  callbackUrl: process.env.SAML_CALLBACK_URL, // ACS URL
  cert: process.env.SAML_CERT, // myCare's public certificate
  identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
};

const samlStrategy = new saml2.Strategy(samlConfig, async (profile, done) => {
  // Profile contains user attributes from SAML assertion
  const user = {
    id: profile.nameID || profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
    email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
    name: profile.displayName || profile['http://schemas.microsoft.com/identity/claims/displayname'],
    // Add other attributes as needed
  };
  
  return done(null, user);
});

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate SAML assertion
    const samlResponse = req.body.SAMLResponse;
    const relayState = req.body.RelayState;
    
    // Decode and validate SAML response
    const validated = await samlStrategy.validate(samlResponse);
    
    // Create session token (JWT or session ID)
    const sessionToken = createSessionToken(validated);
    
    // Set session cookie or return token
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Redirect to app
    res.redirect(relayState || '/');
    
  } catch (error) {
    console.error('SAML validation error:', error);
    res.status(401).json({ error: 'SAML authentication failed' });
  }
}

export default handler;
```

### Step 3: Update Token Validation for Session Tokens

Update `api/auth/validate-token.js`:

```javascript
/**
 * Validates a session token (created after SAML authentication)
 * @param {string} token - The session token to validate
 * @returns {Promise<{valid: boolean, user?: object, error?: string}>}
 */
async function validateSSOToken(token) {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  // Development bypass
  const isDev = process.env.NODE_ENV === 'development' || 
                process.env.VERCEL_ENV !== 'production' ||
                !process.env.VERCEL_ENV;
  
  if (isDev && token === 'dev-bypass-token') {
    return { valid: true, user: { id: 'dev-user', source: 'development' } };
  }

  try {
    // Option A: Session token is JWT (if myCare issues JWT after SAML)
    if (process.env.SESSION_TOKEN_IS_JWT === 'true') {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.SESSION_PUBLIC_KEY, {
        algorithms: ['RS256']
      });
      
      // Check if token is expired
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        return { valid: false, error: 'Token expired' };
      }
      
      return { valid: true, user: decoded };
    }
    
    // Option B: Session token is stored in database/cache
    // Validate against stored session
    const session = await validateSessionInStore(token);
    if (!session) {
      return { valid: false, error: 'Invalid or expired session' };
    }
    
    return { valid: true, user: session.user };
    
    // Option C: Session token validated via myCare API
    // const response = await fetch(process.env.MYCARE_VALIDATE_SESSION_URL, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // if (!response.ok) {
    //   return { valid: false, error: 'Invalid session' };
    // }
    // const user = await response.json();
    // return { valid: true, user };
    
  } catch (error) {
    return { valid: false, error: `Token validation failed: ${error.message}` };
  }
}
```

### Step 4: Update Client Token Retrieval

Update `src/utils/secureApiClient.js`:

```javascript
/**
 * Get session token (provided by myCare after SAML authentication)
 * 
 * Since SAML flow happens in myCare portal, the token retrieval
 * depends on how myCare provides it after authentication.
 */
function getSSOToken() {
  // Note: In development, the C# backend provides /account/dev-login for session-based auth.
  // Production uses SAML/session cookies from the portal.

  // Option A: Token in cookie (set by SAML ACS endpoint)
  // This requires reading cookies (works in browser)
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => 
    c.trim().startsWith('session_token=')
  );
  if (tokenCookie) {
    return decodeURIComponent(tokenCookie.split('=')[1]);
  }

  // Option B: Token in localStorage (if myCare stores it there)
  const token = localStorage.getItem('mycare_session_token') 
    || localStorage.getItem('saml_session_token');
  if (token) {
    return token;
  }

  // Option C: Token passed via URL parameter (if redirected)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('session_token') || urlParams.get('token');
  if (token) {
    // Store for future use
    localStorage.setItem('mycare_session_token', token);
    return token;
  }

  // Option D: Token from parent window (if embedded in iframe)
  try {
    if (window.parent && window.parent !== window) {
      return window.parent.myCareSessionToken || null;
    }
  } catch (e) {
    // Cross-origin error - ignore
  }

  return null;
}
```

## Simplified Approach (Recommended)

If myCare handles the full SAML flow and just provides you with a session token, the implementation is much simpler:

### Step 1: Update Token Validation

```javascript
// api/auth/validate-token.js
async function validateSSOToken(token) {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  // Development bypass
  const isDev = process.env.NODE_ENV === 'development' || 
                process.env.VERCEL_ENV !== 'production';
  
  if (isDev && token === 'dev-bypass-token') {
    return { valid: true, user: { id: 'dev-user', source: 'development' } };
  }

  try {
    // Validate session token with myCare
    const response = await fetch(process.env.MYCARE_VALIDATE_SESSION_URL, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return { valid: false, error: 'Invalid or expired session' };
    }
    
    const user = await response.json();
    return { valid: true, user };
    
  } catch (error) {
    return { valid: false, error: `Token validation failed: ${error.message}` };
  }
}
```

### Step 2: Update Client Token Retrieval

```javascript
// src/utils/secureApiClient.js
function getSSOToken() {
  // Check where myCare stores the session token after SAML
  // Common locations:
  
  // 1. Cookie
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => 
    c.trim().startsWith('mycare_session_token=')
  );
  if (tokenCookie) {
    return decodeURIComponent(tokenCookie.split('=')[1]);
  }

  // 2. localStorage
  return localStorage.getItem('mycare_session_token') || null;
}
```

## Environment Variables Needed

Add to your Vercel environment variables:

```bash
# SAML Configuration (if handling SAML directly)
SAML_ENTRY_POINT=https://mycare.com/saml/idp
SAML_ISSUER=https://your-app.vercel.app
SAML_CALLBACK_URL=https://your-app.vercel.app/api/auth/saml/acs
SAML_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"

# OR Session Token Validation (if using session tokens)
MYCARE_VALIDATE_SESSION_URL=https://mycare.com/api/validate-session
SESSION_TOKEN_IS_JWT=true  # or false
SESSION_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Development
ALLOW_DEV_BYPASS=true  # Only in development
```

## Testing

### Test SAML Flow

1. **Access app without session** → Should redirect to myCare
2. **Authenticate with myCare** → Should POST SAML response to ACS
3. **ACS validates and creates session** → Should set cookie/token
4. **Subsequent API calls** → Should include session token
5. **Token validation** → Should validate successfully

### Test Token Validation

```bash
# Without token (should fail)
curl -X POST https://your-app.vercel.app/api/calculate/function-score \
  -H "Content-Type: application/json" \
  -d '{"parsedValues": {...}}'

# With valid session token (should succeed)
curl -X POST https://your-app.vercel.app/api/calculate/function-score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"parsedValues": {...}}'
```

## Next Steps

1. **Contact myCare** to get:
   - SAML metadata URL or public certificate
   - Session token format and location
   - Validation endpoint (if they provide one)
   - User attributes in SAML assertion

2. **Choose implementation approach**:
   - Full SAML SP (if you need to handle redirects)
   - Session token validation (if myCare handles SAML flow)

3. **Implement token validation** based on chosen approach

4. **Test thoroughly** with myCare's SAML setup

5. **Deploy and verify** in production

## Resources

- [SAML 2.0 Specification](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)
- [passport-saml Documentation](https://github.com/node-saml/passport-saml)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)

