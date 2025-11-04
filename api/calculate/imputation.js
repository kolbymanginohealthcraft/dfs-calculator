// api/calculate/imputation.js
import { protectRoute } from '../auth/validate-token.js';

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
    
    const { 
      ggItemId, 
      targetGGItems, 
      parsedValues, 
      summary, 
      icdList, 
      startScores, 
      ardDate 
    } = body;

    // Validate required fields
    if (!parsedValues || !summary || !Array.isArray(icdList) || !startScores || !ardDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['parsedValues', 'summary', 'icdList', 'startScores', 'ardDate']
      });
    }

    // Check if single item or batch imputation
    if (ggItemId) {
      // Single item imputation
      if (!ggItemId || typeof ggItemId !== 'string') {
        return res.status(400).json({
          error: 'Invalid ggItemId',
          required: 'ggItemId must be a string (e.g., "GG0130A1")'
        });
      }

      const { calculateImputedValue } = await import('../utils/serverImputation.js');
      
      const imputedValue = calculateImputedValue(
        ggItemId,
        parsedValues,
        summary,
        icdList,
        startScores
      );

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      return res.status(200).json({
        imputedValue
      });

    } else if (targetGGItems) {
      // Batch imputation
      if (!targetGGItems || typeof targetGGItems !== 'object') {
        return res.status(400).json({
          error: 'Invalid targetGGItems',
          required: 'targetGGItems must be an object with GG item IDs as keys'
        });
      }

      const { imputeMissingGGItems } = await import('../utils/serverImputation.js');
      
      const imputedValues = imputeMissingGGItems(
        parsedValues,
        summary,
        icdList,
        startScores,
        targetGGItems
      );

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
    return res.status(500).json({
      error: 'Imputation calculation failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during imputation'
    });
  }
}

export default protectRoute(handler);
