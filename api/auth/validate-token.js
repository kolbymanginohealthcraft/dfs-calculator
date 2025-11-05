/**
 * SSO Token Validation Middleware
 * 
 * Validates SSO tokens from myCare portal.
 * This is a flexible validator that can be customized based on your actual SSO token format.
 */

import { logAuthAttempt } from '../utils/auditLogger.js';

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
  // HARDENED: Require explicit flag and multiple checks to prevent production bypass
  const isProduction = process.env.VERCEL_ENV === 'production' || 
                       (process.env.NODE_ENV === 'production' && process.env.VERCEL);
  
  // Only allow dev bypass if:
  // 1. Not in production
  // 2. Explicit ALLOW_DEV_BYPASS flag is set
  // 3. Not running on Vercel (or explicitly dev environment)
  const isDev = !isProduction &&
                process.env.ALLOW_DEV_BYPASS === 'true' &&
                (process.env.NODE_ENV === 'development' || !process.env.VERCEL);
  
  if (isDev && token === 'dev-bypass-token') {
    return { valid: true, user: { id: 'dev-user', source: 'development' } };
  }

  try {
    // SAML Assertion Validation (Primary Method)
    // myCare stores the SAML XML assertion in the UPN cookie after authentication
    // The token is the actual SAML XML assertion (may be base64 encoded)
    // Requires: npm install xml-crypto xml2js (already installed)
    
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
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
      
      if (!cert) {
        if (isProduction) {
          // In production, certificate is required for security
          console.error('❌ SAML_CERT not set in production - signature validation cannot proceed');
          return { 
            valid: false, 
            error: 'SAML certificate not configured. Please contact administrator.' 
          };
        } else {
          // In development, allow without certificate for testing
          console.warn('⚠️ SAML_CERT not set - signature validation skipped (development mode)');
        }
      } else {
        // Validate signature if certificate is provided
        const sig = new SignedXml();
        sig.keyInfoProvider = { getKey: () => cert };
        
        // Check if assertion has a signature
        if (assertion.Signature) {
          const isValid = sig.checkSignature(samlXml);
          if (!isValid) {
            return { valid: false, error: 'Invalid SAML signature' };
          }
        } else {
          // In production, require signed assertions
          if (isProduction) {
            return { 
              valid: false, 
              error: 'SAML assertion is not signed' 
            };
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
      // Handle different SAML NameID formats
      let userId = null;
      if (nameId) {
        // NameID can be a string or object with _ property
        userId = typeof nameId === 'string' ? nameId : nameId._ || nameId;
      }
      
      // Also check in subject if not found in nameId
      if (!userId && subject?.NameID) {
        const subjNameId = Array.isArray(subject.NameID) ? subject.NameID[0] : subject.NameID;
        userId = typeof subjNameId === 'string' ? subjNameId : subjNameId?._ || subjNameId;
      }
      
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
  
  // Log authentication attempt
  const identifier = token ? (token.substring(0, 20) + '...') : 'no-token';
  logAuthAttempt(identifier, validation.valid, validation.error || null);
  
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
