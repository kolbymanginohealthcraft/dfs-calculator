/**
 * Timeout Handler Utility
 * 
 * Adds timeout protection to async operations
 */

/**
 * Wrap a promise with a timeout
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30 seconds)
 * @returns {Promise} - Promise that rejects on timeout
 */
export function withTimeout(promise, timeoutMs = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}

