// api/calculate/imputation.js
import { protectRoute } from '../auth/validate-token.js';
import { rateLimit } from '../utils/rateLimiter.js';
import { validateImputationRequest, validateRequestSize } from '../utils/validation.js';
import { logCalculationRequest, logRateLimit } from '../utils/auditLogger.js';
import { withTimeout } from '../utils/timeoutHandler.js';

/**
 * Protected endpoint for calculating imputed values
 * This protects the proprietary imputation algorithm
 * 
 * Request body:
 * {
 *   ggItemId: string,          // GG item ID to impute (e.g., 'GG0130A1')
 *   parsedValues: Object,      // Parsed MDS data
 *   summary: Object,           // Patient summary data
 *   icdList: Array,            // List of ICD codes
 *   startScores: Object,       // Start scores for GG items
 *   ardDate: string            // Assessment Reference Date
 * }
 * 
 * Response:
 * {
 *   imputedValue: string       // Imputed value in GG format (01-06)
 * }
 * 
 * OR for batch imputation:
 * 
 * Request body:
 * {
 *   targetGGItems: Object,     // Object with GG item IDs as keys and current values
 *   parsedValues: Object,
 *   summary: Object,
 *   icdList: Array,
 *   startScores: Object,
 *   ardDate: string
 * }
 * 
 * Response:
 * {
 *   imputedValues: Object      // Object with GG item IDs as keys and imputed values
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
  const endpoint = '/api/calculate/imputation';
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
      validateImputationRequest(body);
    } catch (validationError) {
      return res.status(400).json({
        error: 'Validation failed',
        message: validationError.message
      });
    }
    
    const { 
      ggItemId, 
      targetGGItems, 
      parsedValues, 
      summary, 
      icdList, 
      startScores, 
      ardDate 
    } = body;

    // Check if single item or batch imputation
    if (ggItemId) {
      // Single item imputation
      const { calculateImputedValue } = await import('../utils/serverImputation.js');
      
      const imputedValue = await withTimeout(
        Promise.resolve(calculateImputedValue(
          ggItemId,
          parsedValues,
          summary,
          icdList,
          startScores
        )),
        30000 // 30 second timeout
      );

      logCalculationRequest(userId, endpoint, true);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      return res.status(200).json({
        imputedValue
      });

    } else if (targetGGItems) {
      // Batch imputation
      const { imputeMissingGGItems } = await import('../utils/serverImputation.js');
      
      const imputedValues = await withTimeout(
        Promise.resolve(imputeMissingGGItems(
          parsedValues,
          summary,
          icdList,
          startScores,
          targetGGItems
        )),
        60000 // 60 second timeout for batch operations
      );

      logCalculationRequest(userId, endpoint, true);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      return res.status(200).json({
        imputedValues
      });

    } else {
      return res.status(400).json({
        error: 'Missing imputation target',
        required: 'Either "ggItemId" (single) or "targetGGItems" (batch) must be provided'
      });
    }

  } catch (error) {
    console.error('Imputation calculation error:', error);
    
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
      error: 'Imputation calculation failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during imputation'
    });
  }
}

export default protectRoute(handler);
