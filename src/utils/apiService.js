/**
 * API Service Layer for DFS Calculator
 * 
 * Handles all API communication between frontend and backend
 * Supports both Basic mode (public token) and Advanced mode (SSO token)
 */

// Public token for Basic mode (from environment or fallback)
const PUBLIC_TOKEN = import.meta.env?.VITE_PUBLIC_TOKEN || 'dfs-public-token-2024';

/**
 * Base API service class
 */
class BaseAPIService {
  constructor() {
    this.baseURL = '/api/calculate';
  }

  /**
   * Make API request with error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} API response
   */
  async makeRequest(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log('makeRequest: Making request to:', url);
      console.log('makeRequest: Options:', options);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json'
        }
      });

      console.log('makeRequest: Response status:', response.status);
      console.log('makeRequest: Response headers:', response.headers);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('makeRequest: Error response:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('makeRequest: Success response:', result);
      return result;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }
}

/**
 * Basic API Service for public calculations
 */
export class BasicAPIService extends BaseAPIService {
  constructor() {
    super();
    this.token = PUBLIC_TOKEN;
  }

  /**
   * Calculate DFS score total (works for start, expected, or end scores)
   * @param {Object} scores - Scores object with selfCare and mobility
   * @param {string} mobilityType - 'Walk' or 'Wheel'
   * @returns {Promise<Object>} Calculation results
   */
  async calculateScore(scores, mobilityType = 'Walk') {
    console.log('BasicAPIService: Making request with data:', { scores, mobilityType });
    console.log('BasicAPIService: Token:', this.token);
    console.log('BasicAPIService: Base URL:', this.baseURL);
    
    return this.makeRequest('/basic-score', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ scores, mobilityType })
    });
  }

  // Legacy method name for backward compatibility
  async calculateBasicScore(scores, mobilityType = 'Walk') {
    return this.calculateScore(scores, mobilityType);
  }
}

/**
 * Advanced API Service for SSO-protected calculations
 */
export class AdvancedAPIService extends BaseAPIService {
  constructor(authToken) {
    super();
    this.token = authToken;
  }

  /**
   * Calculate advanced DFS score from MDS XML
   * @param {string} mdsXmlData - MDS XML data
   * @param {Object} manualOverrides - Manual covariate overrides
   * @returns {Promise<Object>} Calculation results
   */
  async calculateAdvancedScore(mdsXmlData, manualOverrides = {}) {
    return this.makeRequest('/advanced-score', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ mdsXmlData, manualOverrides })
    });
  }

  /**
   * Calculate imputation for missing GG items
   * @param {Object} parsedValues - Parsed MDS values
   * @param {Object} summary - Patient summary
   * @param {Array} icdList - ICD codes list
   * @param {Object} startScores - Start scores
   * @param {Object} targetGGItems - Target GG items
   * @returns {Promise<Object>} Imputation results
   */
  async calculateImputation(parsedValues, summary, icdList, startScores, targetGGItems) {
    return this.makeRequest('/imputation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        parsedValues,
        summary,
        icdList,
        startScores,
        targetGGItems
      })
    });
  }

  /**
   * Calculate end score with imputation
   * @param {Object} endScores - End scores object
   * @param {string} mobilityType - 'Walk' or 'Wheel'
   * @param {Object} parsedValues - Parsed MDS values (optional)
   * @param {Object} summary - Patient summary (optional)
   * @param {Array} icdList - ICD codes list (optional)
   * @param {Object} startScores - Start scores (optional)
   * @returns {Promise<Object>} Calculation results
   */
  async calculateEndScore(endScores, mobilityType, parsedValues = null, summary = null, icdList = null, startScores = null) {
    return this.makeRequest('/end-score', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        endScores,
        mobilityType,
        parsedValues,
        summary,
        icdList,
        startScores
      })
    });
  }
}

/**
 * Factory function to create appropriate API service
 * @param {string} mode - 'basic' or 'advanced'
 * @param {string} authToken - SSO token for advanced mode
 * @returns {BasicAPIService|AdvancedAPIService} API service instance
 */
export function createAPIService(mode, authToken = null) {
  if (mode === 'basic') {
    return new BasicAPIService();
  } else if (mode === 'advanced') {
    if (!authToken) {
      throw new Error('SSO token required for advanced mode');
    }
    return new AdvancedAPIService(authToken);
  } else {
    throw new Error(`Invalid mode: ${mode}. Must be 'basic' or 'advanced'`);
  }
}

/**
 * Utility function to check if we're in a portal context
 * @returns {boolean} True if in portal context
 */
export function isPortalContext() {
  // Check if we're in an iframe or have portal referrer
  return window.self !== window.top || 
         document.referrer.includes('mycare') ||
         window.location.search.includes('portal=true');
}

/**
 * Get authentication token based on context
 * @returns {string|null} Authentication token
 */
export function getAuthToken() {
  // For now, return null - this will be implemented when SSO is integrated
  // In production, this would get the token from the portal or SSO system
  return null;
}

/**
 * Check if user is authenticated for advanced mode
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated() {
  const token = getAuthToken();
  return token && token.length > 10;
}

// Export default factory function
export default createAPIService;
