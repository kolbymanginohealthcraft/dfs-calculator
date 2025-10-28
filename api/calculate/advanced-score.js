/**
 * Advanced Score Calculation API Endpoint
 * 
 * Handles advanced DFS score calculations for MDS XML data
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
        message: 'SSO token required for advanced calculations' 
      });
    }

    // TODO: Implement actual SSO validation with IT team's system
    // For now, accept any token for development
    if (token.length < 10) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid SSO token' 
      });
    }

    // Extract request data
    const { mdsXmlData, manualOverrides = {} } = req.body;

    // Validate required data
    if (!mdsXmlData) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'MDS XML data is required' 
      });
    }

    // Import existing calculation functions
    const { parseXml } = await import('../../src/utils/xmlParser.js');
    const { 
      calculateFunctionScore, 
      determineMobilityType,
      getFunctionCovariates,
      extractPatientSummary
    } = await import('../../src/utils/calculations.js');

    // Parse XML data using existing logic
    const parsedValues = parseXml(mdsXmlData);
    if (!parsedValues || Object.keys(parsedValues).length === 0) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Invalid MDS XML data' 
      });
    }

    // Extract patient summary using existing logic
    const ardDate = parsedValues['A2300'];
    const summary = extractPatientSummary(parsedValues, ardDate);

    // Determine mobility type using existing logic
    const mobilityType = determineMobilityType(parsedValues);

    // Calculate function scores using existing logic
    const startScores = calculateFunctionScores(parsedValues, mobilityType);
    const functionScore = calculateFunctionScore(startScores, mobilityType);

    // Extract ICD codes for HCC processing using existing logic
    const icdList = extractICDCodes(parsedValues);

    // Get function covariates using existing logic
    const { covariates, weightedScore } = getFunctionCovariates(
      parsedValues,
      summary,
      icdList,
      startScores,
      ardDate,
      manualOverrides
    );

    // Calculate contributing items using existing logic
    const contributingItems = getContributingItemIds(startScores, mobilityType);

    // Return results
    return res.status(200).json({
      success: true,
      result: {
        functionScore,
        weightedScore,
        mobilityType,
        summary,
        covariates,
        contributingItems,
        startScores,
        icdList
      }
    });

  } catch (error) {
    console.error('Advanced score calculation error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Advanced calculation failed' 
    });
  }
}

/**
 * Calculate function scores from parsed MDS values using existing logic
 * @param {Object} parsedValues - Parsed MDS values
 * @param {string} mobilityType - Mobility type
 * @returns {Object} Function scores
 */
function calculateFunctionScores(parsedValues, mobilityType) {
  const scores = {};
  
  // Self-care items
  const selfCareItems = [
    'GG0130A', 'GG0130B', 'GG0130C', 'GG0130E', 
    'GG0130F', 'GG0130G', 'GG0130H'
  ];
  
  // Mobility items
  const mobilityItems = [
    'GG0170A', 'GG0170C', 'GG0170D', 'GG0170E', 'GG0170F'
  ];
  
  if (mobilityType === 'Wheel') {
    mobilityItems.push('GG0170R');
  } else {
    mobilityItems.push('GG0170I', 'GG0170J');
  }
  
  // Extract scores
  [...selfCareItems, ...mobilityItems].forEach(item => {
    const value = parsedValues[item];
    if (value && value !== '^' && value !== '88') {
      scores[item] = value;
    }
  });
  
  return scores;
}

/**
 * Extract ICD codes from parsed MDS values using existing logic
 * @param {Object} parsedValues - Parsed MDS values
 * @returns {Array} ICD codes
 */
function extractICDCodes(parsedValues) {
  const icdFields = [
    'I0020B', 'I8000A', 'I8000B', 'I8000C', 'I8000D',
    'I8000E', 'I8000F', 'I8000G', 'I8000H', 'I8000I', 'I8000J'
  ];
  
  return icdFields
    .map(field => parsedValues[field])
    .filter(Boolean)
    .map(code => code.replace(/\^|\./g, '').toUpperCase());
}

/**
 * Get contributing item IDs for display using existing logic
 * @param {Object} scores - Function scores
 * @param {string} mobilityType - Mobility type
 * @returns {Array} Contributing item IDs
 */
function getContributingItemIds(scores, mobilityType) {
  const contributing = [];
  
  // Self-care items
  const selfCareItems = ['GG0130A', 'GG0130B', 'GG0130C'];
  contributing.push(...selfCareItems);
  
  // Mobility items
  const mobilityItems = ['GG0170A', 'GG0170C', 'GG0170D', 'GG0170E', 'GG0170F'];
  contributing.push(...mobilityItems);
  
  if (mobilityType === 'Wheel') {
    contributing.push('GG0170R');
  } else {
    contributing.push('GG0170I', 'GG0170J');
  }
  
  return contributing;
}
