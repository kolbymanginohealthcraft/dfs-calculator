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
    // TODO: Replace this with actual myCare SSO validation
    // Examples of common approaches:
    
    // Option 1: JWT Token Validation
    // const jwt = require('jsonwebtoken');
    // const decoded = jwt.verify(token, process.env.SSO_PUBLIC_KEY);
    // return { valid: true, user: decoded };
    
    // Option 2: API Validation with myCare
    // const response = await fetch('https://mycare.com/api/validate-token', {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // if (!response.ok) return { valid: false, error: 'Invalid token' };
    // const user = await response.json();
    // return { valid: true, user };
    
    // Option 3: Session-based validation
    // const session = await validateSession(token);
    // if (!session) return { valid: false, error: 'Invalid session' };
    // return { valid: true, user: session.user };
    
    // TEMPORARY: Placeholder that accepts any non-empty token
    // REMOVE THIS and implement real validation before production
    if (token && token.length > 0) {
      return { valid: true, user: { id: 'placeholder', source: 'sso' } };
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
