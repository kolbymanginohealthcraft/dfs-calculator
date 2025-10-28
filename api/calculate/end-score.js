/**
 * End Score Calculation API Endpoint
 * 
 * Handles end score calculations and imputation
 * Requires SSO token authentication
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Validate SSO token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'SSO token required for end score calculations' 
      });
    }

    // TODO: Implement actual SSO validation with IT team's system
    if (token.length < 10) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid SSO token' 
      });
    }

    // Extract request data
    const { endScores, mobilityType, parsedValues, summary, icdList, startScores } = req.body;

    // Validate required data
    if (!endScores || !mobilityType) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'End scores and mobility type are required' 
      });
    }

    // Import existing calculation functions
    const { calculateEndTotal } = await import('../../src/utils/scoreCalculations.js');
    const { imputeMissingEndScoreGGItems } = await import('../../src/utils/endScoreImputation.js');
    const { getVersionFromArdDate } = await import('../../src/utils/coefficientLoader.js');

    // Calculate end total using existing logic
    const endTotal = calculateEndTotal(endScores, mobilityType);

    // Get ARD date for version info
    const ardDate = parsedValues?.['A2300'];

    // If we have parsed values, we can do end score imputation
    let imputationResults = {};
    let version = null;

    if (parsedValues && summary && icdList && startScores) {
      // Use existing end score imputation logic
      imputationResults = await imputeMissingEndScoreGGItems(
        parsedValues,
        summary,
        icdList,
        startScores,
        endScores
      );

      // Get version information
      version = getVersionFromArdDate(ardDate);
    }

    // Return results
    return res.status(200).json({
      success: true,
      result: {
        endTotal,
        mobilityType,
        imputationResults,
        ardDate,
        version
      }
    });

  } catch (error) {
    console.error('End score calculation error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'End score calculation failed' 
    });
  }
}
