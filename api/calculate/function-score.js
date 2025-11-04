// api/calculate/function-score.js
import { protectRoute } from '../auth/validate-token.js';
import { getFunctionCovariates } from '../utils/serverCalculations.js';
import { getFunctionMultipliers } from '../utils/serverCoefficientLoader.js';

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

  try {
    // Parse request body - Vercel automatically parses JSON for Express-style handlers
    // But handle cases where body might not be parsed yet
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        error: 'Invalid request body',
        message: 'Request body must be valid JSON'
      });
    }
    
    const { parsedValues, summary, icdList, startScores, ardDate, manualOverrides = {} } = body;

    // Validate required fields
    if (!parsedValues || !summary || !Array.isArray(icdList) || !startScores || !ardDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['parsedValues', 'summary', 'icdList', 'startScores', 'ardDate']
      });
    }

    // Get version-specific multipliers (protected logic)
    const multipliers = getFunctionMultipliers(ardDate);
    
    // Calculate covariates and weighted score (protected algorithm)
    const result = getFunctionCovariates(
      parsedValues,
      summary,
      icdList,
      startScores,
      ardDate,
      manualOverrides
    );

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
    return res.status(500).json({
      error: 'Calculation failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during calculation'
    });
  }
}

// Export protected route
export default protectRoute(handler);
