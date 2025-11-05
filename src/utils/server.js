import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import csvParser from "csv-parser";
import https from "https";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json()); // Parse JSON request bodies

// CMS Provider Information dataset code
const CMS_DATASET_CODE = "4pq5-n9py";

// Function to dynamically get the current CMS CSV URL
async function getCurrentCMSUrl() {
  try {
    const apiUrl = `https://data.cms.gov/provider-data/api/1/metastore/schemas/dataset/items/${CMS_DATASET_CODE}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CMS API: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract the download URL from the distribution array
    if (data.distribution && data.distribution.length > 0) {
      const downloadUrl = data.distribution[0].downloadURL;
      console.log(`✅ Retrieved current CMS URL: ${downloadUrl}`);
      return downloadUrl;
    } else {
      throw new Error("No distribution URL found in CMS API response");
    }
  } catch (error) {
    console.error("❌ Error fetching CMS URL:", error);
    throw error;
  }
}

app.get("/api/facility-name/:ccn", async (req, res) => {
  const { ccn } = req.params;
  const results = [];

  try {
    // Get the current CMS URL dynamically
    const currentCMSUrl = await getCurrentCMSUrl();
    
    https
      .get(currentCMSUrl, (csvRes) => {
        csvRes
          .pipe(csvParser())
          .on("data", (row) => {
            if (row["CMS Certification Number (CCN)"] === ccn) {
              results.push({
                facility_name: row["Provider Name"],
                address: row["Provider Address"],
                city: row["City/Town"],
                state: row["State"],
                zip: row["ZIP Code"],
              });
            }
          })
          .on("end", () => {
            if (results.length > 0) {
              res.json(results[0]);
            } else {
              res.json({ facility_name: "Unknown Facility" });
            }
          });
      })
      .on("error", (err) => {
        console.error("Error fetching CMS CSV:", err);
        res.status(500).json({ error: "Failed to fetch CMS data" });
      });
  } catch (err) {
    console.error("Internal error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// Protected Calculation Endpoints
// ============================================================================

/**
 * SSO Token Validation Middleware for Express
 * Simplified version for Express server
 */
async function validateTokenForExpress(req) {
  // Extract token from headers
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  if (!token) {
    token = req.headers?.['x-sso-token'] || req.headers?.['x-mycare-token'];
  }
  
  if (!token && req.query?.token) {
    token = req.query.token;
  }

  // Validate token
  if (!token) {
    return { valid: false, error: 'No token provided', status: 401 };
  }

  // For development: Allow bypass with a special token
  const isDev = process.env.NODE_ENV === 'development' || 
                process.env.VERCEL_ENV !== 'production' ||
                !process.env.VERCEL_ENV;
  
  if (isDev && token === 'dev-bypass-token') {
    return { valid: true, user: { id: 'dev-user', source: 'development' }, token };
  }

  try {
    // TODO: Replace this with actual myCare SSO validation
    // For now, accept any non-empty token as placeholder
    if (token && token.length > 0) {
      return { valid: true, user: { id: 'placeholder', source: 'sso' }, token };
    }
    
    return { valid: false, error: 'Invalid token format', status: 401 };
  } catch (error) {
    return { valid: false, error: `Token validation failed: ${error.message}`, status: 401 };
  }
}

/**
 * Express middleware to protect routes
 */
function protectExpressRoute(handler) {
  return async (req, res, next) => {
    const validation = await validateTokenForExpress(req);
    
    if (!validation.valid) {
      return res.status(validation.status || 401).json({
        error: 'Unauthorized',
        message: validation.error || 'Invalid or missing SSO token'
      });
    }
    
    // Add user and token to request object
    req.user = validation.user;
    req.token = validation.token;
    
    // Call the handler
    return handler(req, res);
  };
}

// Import calculation functions from server-only modules
// These are the actual implementations, not the stubbed client-side versions
async function getCalculationFunctions() {
  // Use dynamic import to avoid bundling server-only code
  const { getFunctionCovariates, determineMobilityType } = await import('../../api/utils/serverCalculations.js');
  return { getFunctionCovariates, determineMobilityType };
}

async function getCoefficientLoader() {
  const coefficientLoader = await import('../../api/utils/serverCoefficientLoader.js');
  return coefficientLoader;
}

async function getImputationFunctions() {
  const { calculateImputedValue, imputeMissingGGItems, getImputationAnalysisData } = await import('../../api/utils/serverImputation.js');
  return { calculateImputedValue, imputeMissingGGItems, getImputationAnalysisData };
}

/**
 * POST /api/calculate/function-score
 * Protected endpoint for calculating function scores and covariates
 */
app.post('/api/calculate/function-score', protectExpressRoute(async (req, res) => {
  try {
    const { parsedValues, summary, icdList, startScores, ardDate, manualOverrides = {} } = req.body;

    // Validate required fields
    if (!parsedValues || !summary || !Array.isArray(icdList) || !startScores || !ardDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['parsedValues', 'summary', 'icdList', 'startScores', 'ardDate']
      });
    }

    // Load calculation functions
    const { getFunctionCovariates } = await getCalculationFunctions();
    const { getFunctionMultipliers } = await getCoefficientLoader();

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
      multipliers: multipliers
    });

  } catch (error) {
    console.error('Function score calculation error:', error);
    return res.status(500).json({
      error: 'Calculation failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during calculation'
    });
  }
}));

/**
 * POST /api/calculate/imputation
 * Protected endpoint for calculating imputed values
 */
app.post('/api/calculate/imputation', protectExpressRoute(async (req, res) => {
  try {
    const { 
      ggItemId, 
      targetGGItems, 
      parsedValues, 
      summary, 
      icdList, 
      startScores, 
      ardDate 
    } = req.body;

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

      const { calculateImputedValue } = await getImputationFunctions();
      
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

      const { imputeMissingGGItems } = await getImputationFunctions();
      
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
}));

/**
 * POST /api/calculate/imputation-analysis
 * Protected endpoint for imputation analysis data
 */
app.post('/api/calculate/imputation-analysis', protectExpressRoute(async (req, res) => {
  try {
    const { parsedValues, summary, icdList, startScores, ardDate } = req.body;

    // Validate required fields
    if (!parsedValues || !summary || !Array.isArray(icdList) || !startScores) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['parsedValues', 'summary', 'icdList', 'startScores']
      });
    }

    // Load imputation functions
    const { getImputationAnalysisData } = await getImputationFunctions();

    // Get imputation analysis data for all GG items
    const imputationData = getImputationAnalysisData(
      parsedValues,
      summary,
      icdList,
      startScores
    );

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return res.status(200).json({
      imputationData
    });

  } catch (error) {
    console.error('Imputation analysis error:', error);
    return res.status(500).json({
      error: 'Imputation analysis failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during imputation analysis'
    });
  }
}));

app.listen(PORT, () => {
  console.log(`✅ Express server running on http://localhost:${PORT}`);
});
