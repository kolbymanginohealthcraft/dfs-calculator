// api/calculate/imputation-analysis.js
import { protectRoute } from '../auth/validate-token.js';
import { rateLimit } from '../utils/rateLimiter.js';
import { validateCalculationRequest, validateRequestSize } from '../utils/validation.js';
import { logCalculationRequest, logRateLimit } from '../utils/auditLogger.js';
import { withTimeout } from '../utils/timeoutHandler.js';

/**
 * Protected endpoint for imputation analysis data
 * This protects the proprietary imputation algorithm while providing
 * analysis data for UI display purposes.
 * 
 * Request body:
 * {
 *   parsedValues: Object,      // Parsed MDS data
 *   summary: Object,           // Patient summary data
 *   icdList: Array,            // List of ICD codes
 *   startScores: Object,       // Start scores for GG items
 *   ardDate: string            // Assessment Reference Date (optional, extracted from parsedValues if not provided)
 * }
 * 
 * Response:
 * {
 *   imputationData: Object     // Analysis data for all GG items
 *                              // Structure: { [ggItemId]: { covariates, multipliers, imputationScore, thresholds, imputedValue, originalValue, needsImputation } }
 * }
 */
async function handler(req, res, user, token) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed: ['POST']
    });
  }

  const userId = user?.id || 'unknown';
  const endpoint = '/api/calculate/imputation-analysis';
  const identifier = userId || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

  try {
    // Rate limiting: 200 requests per minute per user/IP (analysis is heavier operation)
    if (!rateLimit(identifier, 200, 60000)) {
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

    // Parse request body
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

    const { parsedValues, summary, icdList, startScores, ardDate } = body;

    // Validate required fields
    if (!parsedValues || !summary || !Array.isArray(icdList) || !startScores) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['parsedValues', 'summary', 'icdList', 'startScores']
      });
    }

    // Import and call the server-side function (reuses existing logic)
    const { getImputationAnalysisData } = await import('../utils/serverImputation.js');
    
    const imputationData = await withTimeout(
      Promise.resolve(getImputationAnalysisData(
        parsedValues,
        summary,
        icdList,
        startScores
      )),
      60000 // 60 second timeout for analysis operations
    );

    // Log successful request
    logCalculationRequest(userId, endpoint, true);

    // Return results
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return res.status(200).json({
      imputationData
    });

  } catch (error) {
    console.error('Imputation analysis error:', error);
    
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
      error: 'Imputation analysis failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during imputation analysis'
    });
  }
}

export default protectRoute(handler);
