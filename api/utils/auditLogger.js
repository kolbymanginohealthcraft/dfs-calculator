/**
 * Audit Logging Utility
 * 
 * Logs API access for security monitoring
 */

/**
 * Log a calculation request
 * @param {string} userId - User identifier
 * @param {string} endpoint - API endpoint
 * @param {boolean} success - Whether request succeeded
 * @param {Error|null} error - Error if request failed
 */
export function logCalculationRequest(userId, endpoint, success, error = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId: userId || 'unknown',
    endpoint,
    success,
    error: error?.message || null,
    // Don't log sensitive data like parsedValues, summary, etc.
  };
  
  // In production, log to console (Vercel will capture this)
  // In a real system, you might want to send to a logging service
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({
      type: 'audit',
      ...logEntry
    }));
  } else {
    // In development, log with more detail
    console.log(`[AUDIT] ${endpoint} - User: ${userId} - ${success ? 'SUCCESS' : 'FAILED'}`);
    if (error) {
      console.error(`[AUDIT] Error: ${error.message}`);
    }
  }
}

/**
 * Log authentication attempt
 * @param {string} identifier - User/IP identifier
 * @param {boolean} success - Whether authentication succeeded
 * @param {string} reason - Reason for failure (if applicable)
 */
export function logAuthAttempt(identifier, success, reason = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    identifier,
    success,
    reason,
  };
  
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({
      type: 'auth_audit',
      ...logEntry
    }));
  } else {
    console.log(`[AUTH] ${identifier} - ${success ? 'SUCCESS' : 'FAILED'}${reason ? ` - ${reason}` : ''}`);
  }
}

/**
 * Log rate limit hit
 * @param {string} identifier - User/IP identifier
 * @param {string} endpoint - API endpoint
 */
export function logRateLimit(identifier, endpoint) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    identifier,
    endpoint,
    type: 'rate_limit'
  };
  
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({
      type: 'rate_limit',
      ...logEntry
    }));
  } else {
    console.warn(`[RATE_LIMIT] ${identifier} - ${endpoint}`);
  }
}

