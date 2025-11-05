// api/calculate/function-score.js
import { protectRoute } from '../auth/validate-token.js';
import { getFunctionCovariates } from '../utils/serverCalculations.js';
import { getFunctionMultipliers } from '../utils/serverCoefficientLoader.js';
import { rateLimit } from '../utils/rateLimiter.js';
import { validateCalculationRequest, validateRequestSize } from '../utils/validation.js';
import { logCalculationRequest, logRateLimit } from '../utils/auditLogger.js';
import { withTimeout } from '../utils/timeoutHandler.js';

/**
 * Protected endpoint for calculating function scores and covariates
 * This protects the proprietary calculation algorithm
 * 
 * Request body:
 * {
 *   parsedValues: Object,      // Parsed MDS data
 *   summary: Object,           // Patient summary data
 *   icdList: Array,            // List of ICD codes
 *   startScores: Object,       // Start scores for GG items
 *   ardDate: string,           // Assessment Reference Date
 *   manualOverrides: Object    // Optional manual covariate overrides
 * }
 * 
 * Response:
 * {
 *   covariates: Object,        // Calculated covariates
 *   weightedScore: number,     // Final weighted score
 *   multipliers: Object        // Version-specific multipliers used
 * }
 */
async function handler(req, res, user, token) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed: ['POST']
    });
  }

  const userId = user?.id || 'unknown';
  const endpoint = '/api/calculate/function-score';
  const identifier = userId || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

  try {
    // Rate limiting: 500 requests per minute per user/IP (higher limit for bulk operations)
    if (!rateLimit(identifier, 500, 60000)) {
      logRateLimit(identifier, endpoint);
      return res.status(429).json({ 
        error: 'Too many requests', 
        message: 'Rate limit exceeded. Please try again later.' 
      });
    }

    // Request size validation (10MB limit)
    const contentLength = req.headers['content-length'];
    try {
      validateRequestSize(contentLength, 10 * 1024 * 1024);
    } catch (sizeError) {
      return res.status(413).json({ 
        error: 'Payload too large',
        message: sizeError.message 
      });
    }

    // Parse request body - Vercel automatically parses JSON for Express-style handlers
    // But handle cases where body might not be parsed yet
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    // Input validation
    try {
      validateCalculationRequest(body);
    } catch (validationError) {
      return res.status(400).json({
        error: 'Validation failed',
        message: validationError.message
      });
    }
    
    const { parsedValues, summary, icdList, startScores, ardDate, manualOverrides = {} } = body;

    // Get version-specific multipliers (protected logic)
    const multipliers = getFunctionMultipliers(ardDate);
    
    // Calculate covariates and weighted score (protected algorithm) with timeout protection
    const result = await withTimeout(
      Promise.resolve(getFunctionCovariates(
        parsedValues,
        summary,
        icdList,
        startScores,
        ardDate,
        manualOverrides
      )),
      30000 // 30 second timeout
    );

    // Log successful request
    logCalculationRequest(userId, endpoint, true);

    // Return results
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return res.status(200).json({
      covariates: result.covariates,
      weightedScore: result.weightedScore,
      multipliers: multipliers // Return multipliers for reference (they're public data anyway)
    });

  } catch (error) {
    // Error handling - don't expose internal details
    console.error('Function score calculation error:', error);
    
    // Log failed request
    logCalculationRequest(userId, endpoint, false, error);
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message === 'Request timeout') {
      statusCode = 504;
    } else if (error.message.includes('Validation failed')) {
      statusCode = 400;
    }
    
    return res.status(statusCode).json({
      error: 'Calculation failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during calculation'
    });
  }
}

// Export protected route
export default protectRoute(handler);
