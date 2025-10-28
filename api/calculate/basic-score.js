/**
 * Basic Score Calculation API Endpoint
 * 
 * Handles basic DFS score calculations for public access
 * Requires public token authentication
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
    // Validate public token
    const token = req.headers.authorization?.replace('Bearer ', '');
    const publicToken = process.env.VITE_PUBLIC_TOKEN || 'dfs-public-token-2024';
    
    if (!token || token !== publicToken) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid public token required for basic calculations' 
      });
    }

    // Extract request data
    const { scores, mobilityType } = req.body;

    // Validate required data
    if (!scores) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Scores data is required' 
      });
    }

    // Validate scores structure
    if (!scores.selfCare || !scores.mobility) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Scores must include selfCare and mobility categories' 
      });
    }

    // Import calculation functions (server-side data access)
    const { calculateTotalScore } = await import('../../src/utils/scoreCalculations.js');
    const { convertBasicScoresToGG, getContributingGGItems } = await import('../../src/utils/itemAdapters.js');

    // Determine mobility type if not provided
    const actualMobilityType = mobilityType || 'Walk'; // Default to Walk for basic mode

    // Calculate total score using existing logic
    const functionScore = calculateTotalScore(scores, actualMobilityType);

    // Calculate category totals using existing logic
    const { calculateCategoryTotal } = await import('../../src/utils/scoreCalculations.js');
    const { getContributingKeys } = await import('../../src/utils/itemDefinitions.js');
    
    const selfCareKeys = getContributingKeys('selfCare');
    const mobilityKeys = getContributingKeys('mobility', actualMobilityType);
    
    const selfCareTotal = calculateCategoryTotal(scores.selfCare, selfCareKeys);
    const mobilityTotal = calculateCategoryTotal(scores.mobility, mobilityKeys);

    // Get contributing items for display
    const ggScores = convertBasicScoresToGG(scores);
    const contributingItems = getContributingGGItems(ggScores, actualMobilityType);

    // Return results
    return res.status(200).json({
      success: true,
      result: {
        functionScore,
        selfCareTotal,
        mobilityTotal,
        mobilityType: actualMobilityType,
        contributingItems
      }
    });

  } catch (error) {
    console.error('Basic score calculation error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Calculation failed' 
    });
  }
}
