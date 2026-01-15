/**
 * Secure API Client
 * 
 * Handles authenticated API calls to protected calculation endpoints.
 * Manages SSO token retrieval and provides clean interfaces for calculations.
 */

/**
 * Get SSO token from myCare portal
 * 
 * This function needs to be customized based on how myCare provides the token.
 * Common approaches:
 * - Token in localStorage: localStorage.getItem('mycare_sso_token')
 * - Token in cookie: document.cookie
 * - Token passed via URL parameter or window.postMessage from portal
 * - Token in meta tag: document.querySelector('meta[name="sso-token"]')?.content
 * 
 * TODO: Implement based on your myCare SSO integration
 */
function getSSOToken() {
  // For development: Allow bypass token
  // HARDENED: Only allow in localhost/development with explicit flag
  const isProduction = import.meta.env.PROD || 
                       (window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1');
  
  // Check for VITE_ prefixed environment variable (Vite requirement)
  const allowDevBypass = import.meta.env.VITE_ALLOW_DEV_BYPASS === 'true' ||
                          import.meta.env.MODE === 'development';
  
  const isDev = !isProduction && allowDevBypass;
  
  if (isDev) {
    // In development, automatically set and use dev token if not already set
    let devToken = localStorage.getItem('dev-sso-token');
    if (!devToken) {
      devToken = 'dev-bypass-token';
      localStorage.setItem('dev-sso-token', devToken);
    }
    return devToken;
  }

  // SAML assertion token retrieval from cookie
  // myCare stores the SAML XML assertion in the UPN cookie after authentication
  const cookieName = import.meta.env.VITE_SAML_SESSION_COOKIE || 'UPN';
  
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => {
    const trimmed = c.trim();
    return trimmed.startsWith(`${cookieName}=`);
  });
  
  if (tokenCookie) {
    // Extract and decode the cookie value
    // SAML assertions may be base64 encoded or plain XML
    const tokenValue = decodeURIComponent(tokenCookie.split('=').slice(1).join('='));
    return tokenValue;
  }
  
  return null;
}

/**
 * Make an authenticated API request
 */
async function authenticatedFetch(endpoint, options = {}) {
  const token = getSSOToken();
  
  if (!token) {
    throw new Error('SSO token not found. Please ensure you are logged in through myCare portal.');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add token to Authorization header (Bearer token)
  headers['Authorization'] = `Bearer ${token}`;
  
  // Also add as custom header (if myCare uses different format)
  headers['X-SSO-Token'] = token;

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { error: 'Request failed', message: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    if (response.status === 401) {
      const error = new Error(errorData.message || errorData.error || 'Authentication failed. Please refresh and try again.');
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

  return authenticatedFetch('/function-score', {
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

  return authenticatedFetch('/imputation', {
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

  return authenticatedFetch('/imputation', {
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

  return authenticatedFetch('/imputation-analysis', {
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
 * Check if SSO token is available
 * Useful for showing appropriate UI states
 */
export function hasSSOToken() {
  return getSSOToken() !== null;
}
