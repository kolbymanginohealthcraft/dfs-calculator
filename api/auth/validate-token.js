/**
 * Authentication Middleware for DFS Calculator API
 * 
 * Handles validation of both public tokens (Basic mode) and SSO tokens (Advanced mode)
 */

// Public token for Basic mode calculations
const PUBLIC_TOKEN = process.env.VITE_PUBLIC_TOKEN || 'dfs-public-token-2024';

/**
 * Validate public token for Basic mode access
 * @param {string} token - Token from Authorization header
 * @returns {Object} Validation result
 */
export function validatePublicToken(token) {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  if (token === PUBLIC_TOKEN) {
    return { valid: true, mode: 'basic' };
  }

  return { valid: false, error: 'Invalid public token' };
}

/**
 * Validate SSO token for Advanced mode access
 * @param {string} token - Token from Authorization header
 * @returns {Object} Validation result
 */
export async function validateSSOToken(token) {
  if (!token) {
    return { valid: false, error: 'No SSO token provided' };
  }

  // TODO: Integrate with IT team's SSO system
  // For now, we'll implement a placeholder validation
  // In production, this should validate against the actual SSO system
  
  try {
    // Placeholder: Check if token looks like a valid JWT or SSO token
    if (token.length > 20 && token.includes('.')) {
      // This is a placeholder - replace with actual SSO validation
      return { valid: true, mode: 'advanced' };
    }
    
    return { valid: false, error: 'Invalid SSO token format' };
  } catch (error) {
    return { valid: false, error: 'SSO validation failed' };
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
export function extractToken(authHeader) {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Middleware function for public token validation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export function requirePublicToken(req, res, next) {
  const token = extractToken(req.headers.authorization);
  const validation = validatePublicToken(token);
  
  if (!validation.valid) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: validation.error 
    });
  }
  
  req.auth = validation;
  next();
}

/**
 * Middleware function for SSO token validation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export async function requireSSOToken(req, res, next) {
  const token = extractToken(req.headers.authorization);
  const validation = await validateSSOToken(token);
  
  if (!validation.valid) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: validation.error 
    });
  }
  
  req.auth = validation;
  next();
}
