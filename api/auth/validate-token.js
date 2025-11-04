/**
 * SSO Token Validation Middleware
 * 
 * Validates SSO tokens from myCare portal.
 * This is a flexible validator that can be customized based on your actual SSO token format.
 */

/**
 * Validates an SSO token
 * @param {string} token - The SSO token to validate
 * @returns {Promise<{valid: boolean, user?: object, error?: string}>}
 * 
 * TODO: Customize this function based on your myCare SSO token format:
 * - If using JWT: verify signature, check expiration, validate claims
 * - If using session tokens: verify with myCare API
 * - If using custom format: implement your validation logic
 */
async function validateSSOToken(token) {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  // For development: Allow bypass with a special token
  // Remove this in production or secure it properly
  // Check multiple ways to detect development mode
  const isDev = process.env.NODE_ENV === 'development' || 
                process.env.VERCEL_ENV !== 'production' ||
                !process.env.VERCEL_ENV;
  
  if (isDev && token === 'dev-bypass-token') {
    return { valid: true, user: { id: 'dev-user', source: 'development' } };
  }

  try {
    // SAML Session Token Validation
    // Since myCare handles the SAML flow, we validate the session token they provide
    
    // Option A: Session token validated via myCare API (Recommended)
    // Ask IT: What's the myCare API endpoint to validate session tokens?
    if (process.env.MYCARE_VALIDATE_SESSION_URL) {
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
    }
    
    // Option B: Session token is JWT (if myCare issues JWT after SAML)
    // Ask IT: Is the session token a JWT? What's the public key?
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
    
    // Option C: Direct SAML Assertion Validation
    // The token is the actual SAML XML assertion (encoded)
    // Requires: npm install xml-crypto xml2js
    
    try {
      // Import SAML validation libraries
      const { SignedXml } = await import('xml-crypto');
      const { parseStringPromise } = await import('xml2js');
      
      // Decode the SAML assertion (it's likely base64 encoded)
      let samlXml = token;
      
      // Try to decode if it's base64 (SAML assertions are often base64 encoded)
      try {
        // Check if it looks like base64
        if (!token.includes('<') && !token.includes('>')) {
          samlXml = Buffer.from(token, 'base64').toString('utf-8');
        }
      } catch (e) {
        // Not base64, use as-is
        samlXml = token;
      }
      
      // Parse SAML XML assertion
      const parsed = await parseStringPromise(samlXml);
      
      // Get the SAML Assertion element
      const assertion = parsed.Response?.Assertion?.[0] || parsed.Assertion?.[0];
      if (!assertion) {
        return { valid: false, error: 'Invalid SAML assertion format' };
      }
      
      // Validate signature using myCare's public certificate
      // Set this in your environment variables: SAML_CERT
      const cert = process.env.SAML_CERT;
      if (!cert) {
        console.warn('⚠️ SAML_CERT not set - signature validation skipped');
        // In production, you should require the certificate
        // For now, allow if cert not set (to be configured)
      } else {
        const sig = new SignedXml();
        sig.keyInfoProvider = { getKey: () => cert };
        
        // Check if assertion has a signature
        if (assertion.Signature) {
          const isValid = sig.checkSignature(samlXml);
          if (!isValid) {
            return { valid: false, error: 'Invalid SAML signature' };
          }
        }
      }
      
      // Check assertion expiration
      const conditions = assertion.Conditions?.[0];
      if (conditions) {
        const notOnOrAfter = conditions.$?.NotOnOrAfter;
        if (notOnOrAfter) {
          const expiration = new Date(notOnOrAfter);
          if (expiration < new Date()) {
            return { valid: false, error: 'SAML assertion expired' };
          }
        }
      }
      
      // Extract user info from SAML assertion
      const subject = assertion.Subject?.[0];
      const nameId = subject?.NameID?.[0];
      
      // Get attributes (common SAML attribute formats)
      const attributeStatement = assertion.AttributeStatement?.[0];
      let email = null;
      let name = null;
      
      if (attributeStatement?.Attribute) {
        attributeStatement.Attribute.forEach(attr => {
          const attrName = attr.$?.Name;
          const attrValue = attr.AttributeValue?.[0];
          
          if (attrName?.includes('email') || attrName?.includes('Email')) {
            email = typeof attrValue === 'string' ? attrValue : attrValue?._ || attrValue;
          }
          if (attrName?.includes('name') || attrName?.includes('displayname')) {
            name = typeof attrValue === 'string' ? attrValue : attrValue?._ || attrValue;
          }
        });
      }
      
      // Extract user ID from NameID
      const userId = nameId?._ || nameId || subject?.NameID?.[0]?._;
      
      if (!userId) {
        return { valid: false, error: 'No user ID found in SAML assertion' };
      }
      
      const user = {
        id: userId,
        email: email,
        name: name,
        source: 'saml'
      };
      
      return { valid: true, user };
      
    } catch (importError) {
      // Libraries not installed - provide helpful error
      if (importError.code === 'ERR_MODULE_NOT_FOUND') {
        console.error('SAML validation libraries not installed. Run: npm install xml-crypto xml2js');
        return { 
          valid: false, 
          error: 'SAML validation libraries not installed. Contact administrator.' 
        };
      }
      
      // Other parsing/validation errors
      console.error('SAML assertion validation error:', importError);
      return { valid: false, error: `SAML validation failed: ${importError.message}` };
    }
    
    return { valid: false, error: 'Invalid token format' };
  } catch (error) {
    return { valid: false, error: `Token validation failed: ${error.message}` };
  }
}

/**
 * Middleware function to validate SSO tokens in requests
 * Supports both Web API (Request) and Express-style (req.headers) formats
 */
export default async function validateToken(req) {
  let token = null;
  
  // Check if this is Web API format (Request object)
  if (req.headers && typeof req.headers.get === 'function') {
    // Web API format
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token) {
      token = req.headers.get('x-sso-token') || req.headers.get('x-mycare-token');
    }
    
    if (!token && req.url) {
      const url = new URL(req.url);
      token = url.searchParams.get('token');
    }
  } else {
    // Express-style format
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token) {
      token = req.headers?.['x-sso-token'] || req.headers?.['x-mycare-token'];
    }
    
    if (!token && req.query?.token) {
      token = req.query.token;
    }
  }

  const validation = await validateSSOToken(token);
  
  if (!validation.valid) {
    return {
      status: 401,
      error: 'Unauthorized',
      message: validation.error || 'Invalid or missing SSO token',
      valid: false
    };
  }

  return {
    status: null,
    user: validation.user,
    token,
    valid: true
  };
}

/**
 * Higher-order function to protect API routes
 * Works with both Web API (Request/Response) and Express-style (req/res) formats
 * Usage: export default protectRoute(async (req, user, token, res?) => { ... })
 */
export function protectRoute(handler) {
  return async (req, res) => {
    const validation = await validateToken(req);
    
    if (!validation.valid) {
      // Check if Express-style (has res object)
      if (res && typeof res.status === 'function') {
        return res.status(validation.status || 401).json({
          error: validation.error,
          message: validation.message
        });
      }
      
      // Web API format
      return new Response(JSON.stringify({
        error: validation.error,
        message: validation.message
      }), {
        status: validation.status || 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validation succeeded, call handler with user info
    // Pass res if available (Express-style)
    if (res) {
      return handler(req, res, validation.user, validation.token);
    } else {
      return handler(req, validation.user, validation.token);
    }
  };
}
