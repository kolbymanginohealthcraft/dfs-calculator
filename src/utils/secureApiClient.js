/**
 * Secure API Client
 * 
 * Handles authenticated API calls to protected calculation endpoints.
 * Uses session-based authentication with cookies (C# backend).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

/**
 * In development, silently re-establish a session via the dev-login endpoint.
 * Returns true if the session was restored successfully.
 */
async function tryDevReauth() {
  try {
    const res = await fetch('/account/dev-login', { credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Make an authenticated API request using session cookies.
 * In development, a 401 triggers an automatic dev-login + single retry
 * so the browser is never redirected to the external SAML IdP.
 */
function logTiming(entry) {
  if (!isDevelopment) return;
  const style = entry.duration > 500 ? 'color: red; font-weight: bold'
    : entry.duration > 200 ? 'color: orange'
    : 'color: green';
  console.log(
    `%c[API] ${entry.method} ${entry.endpoint} → ${entry.status} in ${entry.duration}ms`,
    style
  );
}

async function authenticatedFetch(endpoint, options = {}, _isRetry = false) {
  const fullUrl = endpoint.startsWith('http') 
    ? endpoint 
    : isDevelopment 
      ? endpoint
      : `${API_BASE_URL}${endpoint}`;

  const t0 = performance.now();
  const method = options.method || 'GET';

  const response = await fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const duration = Math.round(performance.now() - t0);

  if (!response.ok) {
    logTiming({ endpoint, method, status: response.status, duration, timestamp: Date.now() });

    if (response.status === 401) {
      if (isDevelopment && !_isRetry) {
        const restored = await tryDevReauth();
        if (restored) {
          return authenticatedFetch(endpoint, options, true);
        }
      }

      if (!isDevelopment) {
        const { login } = await import('./authService.js');
        login(window.location.href);
      }

      const error = new Error('Authentication required');
      error.status = 401;
      throw error;
    }

    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { error: 'Request failed', message: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const error = new Error(errorData.message || errorData.error || `API request failed: ${response.status}`);
    error.status = response.status;
    error.data = errorData;
    console.error(`API Error [${response.status}]:`, errorData);
    throw error;
  }

  logTiming({ endpoint, method, status: response.status, duration, timestamp: Date.now() });
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
 * Combined imputation + function score in a single round-trip (protected)
 * 
 * @param {Object} params
 * @param {Object} params.parsedValues - Parsed MDS data
 * @param {Object} params.summary - Patient summary data
 * @param {Array} params.icdList - List of ICD codes
 * @param {Object} params.startScores - Raw (pre-imputation) start scores
 * @param {string} params.ardDate - Assessment Reference Date
 * @param {Object} params.targetGGItems - GG items with raw values for imputation
 * 
 * @returns {Promise<{imputedValues: Object, covariates: Object, weightedScore: number, multipliers: Object}>}
 */
export async function processFileComplete(params) {
  const {
    parsedValues,
    summary,
    icdList,
    startScores,
    ardDate,
    targetGGItems
  } = params;

  return authenticatedFetch('/api/process-file', {
    method: 'POST',
    body: JSON.stringify({
      parsedValues,
      summary,
      icdList,
      startScores,
      ardDate,
      targetGGItems
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
export async function getImputationAnalysisData(params, { signal } = {}) {
  const {
    parsedValues,
    summary,
    icdList,
    startScores,
    ardDate,
    manualOverrides
  } = params;

  return authenticatedFetch('/api/imputation-analysis', {
    method: 'POST',
    body: JSON.stringify({
      parsedValues,
      summary,
      icdList,
      startScores,
      ardDate,
      manualOverrides
    }),
    signal
  });
}

