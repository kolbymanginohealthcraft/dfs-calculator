/**
 * Rate Limiting Utility
 * 
 * Prevents abuse of API endpoints by limiting requests per identifier
 */

const rateLimitMap = new Map();

/**
 * Check if a request should be rate limited
 * @param {string} identifier - Unique identifier (user ID, IP address, etc.)
 * @param {number} maxRequests - Maximum requests allowed in the time window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - true if request is allowed, false if rate limited
 */
export function rateLimit(identifier, maxRequests = 500, windowMs = 60000) {
  const now = Date.now();
  const key = identifier;
  
  // Clean up old entries periodically (every 1000 checks)
  if (rateLimitMap.size > 1000) {
    const cutoff = now - windowMs;
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < cutoff) {
        rateLimitMap.delete(k);
      }
    }
  }
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  const limit = rateLimitMap.get(key);
  
  // Reset if window has expired
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + windowMs;
    return true;
  }
  
  // Check if limit exceeded
  if (limit.count >= maxRequests) {
    return false;
  }
  
  limit.count++;
  return true;
}

/**
 * Get rate limit info for an identifier
 * @param {string} identifier - Unique identifier
 * @returns {object|null} - Rate limit info or null if not found
 */
export function getRateLimitInfo(identifier) {
  const limit = rateLimitMap.get(identifier);
  if (!limit) return null;
  
  const now = Date.now();
  if (now > limit.resetTime) return null;
  
  return {
    remaining: Math.max(0, 100 - limit.count),
    resetTime: limit.resetTime,
    resetIn: Math.max(0, limit.resetTime - now)
  };
}

