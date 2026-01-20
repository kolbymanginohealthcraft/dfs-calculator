/**
 * Secure API Client
 * 
 * Handles authenticated API calls to protected calculation endpoints.
 * Uses session-based authentication with cookies (C# backend).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Make an authenticated API request using session cookies
 */
async function authenticatedFetch(endpoint, options = {}) {
  // In development, always use relative URLs to go through Vite proxy (avoids CORS)
  // In production, use full URLs from environment variable
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const fullUrl = endpoint.startsWith('http') 
    ? endpoint 
    : isDevelopment 
      ? endpoint  // Always use relative URL in dev (goes through Vite proxy)
      : `${API_BASE_URL}${endpoint}`; // Use full URL in production

  const response = await fetch(fullUrl, {
    ...options,
    credentials: 'include', // CRITICAL: Include cookies for session authentication
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { error: 'Request failed', message: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    if (response.status === 401) {
      // Redirect to login on 401
      const { login } = await import('./authService.js');
      login(window.location.href); // Redirect to login, then back here
      const error = new Error(errorData.message || errorData.error || 'Authentication required. Redirecting to login...');
      error.status = 401;
      throw error;
    }
    
    const error = new Error(errorData.message || errorData.error || `API request failed: ${response.status}`);
    error.status = response.status;
    error.data = errorData;
    console.error(`API Error [${response.status}]:`, errorData);
    throw error;
  }

  return response.json();
}

/**
 * Calculate function score and covariates (protected)
 * 
 * @param {Object} params
 * @param {Object} params.parsedValues - Parsed MDS data
 * @param {Object} params.summary - Patient summary data
 * @param {Array} params.icdList - List of ICD codes
 * @param {Object} params.startScores - Start scores for GG items
 * @param {string} params.ardDate - Assessment Reference Date
 * @param {Object} params.manualOverrides - Optional manual covariate overrides
 * 
 * @returns {Promise<{covariates: Object, weightedScore: number, multipliers: Object}>}
 */
export async function calculateFunctionScore(params) {
  const {
    parsedValues,
    summary,
    icdList,
    startScores,
    ardDate,
    manualOverrides = {}
  } = params;

  return authenticatedFetch('/api/function-score', {
    method: 'POST',
    body: JSON.stringify({
      parsedValues,
      summary,
      icdList,
      startScores,
      ardDate,
      manualOverrides
    })
  });
}

/**
 * Calculate imputed value for a single GG item (protected)
 * 
 * @param {Object} params
 * @param {string} params.ggItemId - GG item ID (e.g., 'GG0130A1')
 * @param {Object} params.parsedValues - Parsed MDS data
 * @param {Object} params.summary - Patient summary data
 * @param {Array} params.icdList - List of ICD codes
 * @param {Object} params.startScores - Start scores for GG items
 * @param {string} params.ardDate - Assessment Reference Date
 * 
 * @returns {Promise<{imputedValue: string}>}
 */
export async function calculateImputedValue(params) {
  const {
    ggItemId,
    parsedValues,
    summary,
    icdList,
    startScores,
    ardDate
  } = params;

  return authenticatedFetch('/api/imputation', {
    method: 'POST',
    body: JSON.stringify({
      ggItemId,
      parsedValues,
      summary,
      icdList,
      startScores,
      ardDate
    })
  });
}

/**
 * Batch impute missing GG items (protected)
 * 
 * @param {Object} params
 * @param {Object} params.targetGGItems - Object with GG item IDs as keys and current values
 * @param {Object} params.parsedValues - Parsed MDS data
 * @param {Object} params.summary - Patient summary data
 * @param {Array} params.icdList - List of ICD codes
 * @param {Object} params.startScores - Start scores for GG items
 * @param {string} params.ardDate - Assessment Reference Date
 * 
 * @returns {Promise<{imputedValues: Object}>}
 */
export async function batchImputeValues(params) {
  const {
    targetGGItems,
    parsedValues,
    summary,
    icdList,
    startScores,
    ardDate
  } = params;

  return authenticatedFetch('/api/imputation', {
    method: 'POST',
    body: JSON.stringify({
      targetGGItems,
      parsedValues,
      summary,
      icdList,
      startScores,
      ardDate
    })
  });
}

/**
 * Get imputation analysis data for display (protected)
 * This returns pre-calculated imputation data for UI display without exposing the algorithm
 * 
 * @param {Object} params
 * @param {Object} params.parsedValues - Parsed MDS data
 * @param {Object} params.summary - Patient summary data
 * @param {Array} params.icdList - List of ICD codes
 * @param {Object} params.startScores - Start scores for GG items
 * @param {string} params.ardDate - Assessment Reference Date (optional)
 * 
 * @returns {Promise<{imputationData: Object}>}
 */
export async function getImputationAnalysisData(params) {
  const {
    parsedValues,
    summary,
    icdList,
    startScores,
    ardDate
  } = params;

  return authenticatedFetch('/api/imputation-analysis', {
    method: 'POST',
    body: JSON.stringify({
      parsedValues,
      summary,
      icdList,
      startScores,
      ardDate
    })
  });
}

/**
 * Check if user is authenticated
 * Uses the auth service to check session status
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  try {
    const { getCurrentUser } = await import('./authService.js');
    const { loggedIn } = await getCurrentUser();
    return loggedIn;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * @deprecated Use isAuthenticated() instead
 * Kept for backward compatibility with PortalContext
 */
export function hasSSOToken() {
  // For backward compatibility, check localStorage flag
  // This will be set by PortalContext after checking auth
  return localStorage.getItem('user-authenticated') === 'true';
}
