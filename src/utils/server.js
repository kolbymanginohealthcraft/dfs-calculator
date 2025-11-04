import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import csvParser from "csv-parser";
import https from "https";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current file directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Handle text/plain content type as JSON fallback
app.use((req, res, next) => {
  if (req.headers['content-type'] === 'text/plain;charset=UTF-8' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        req.body = JSON.parse(body);
        next();
      } catch (error) {
        console.error('Failed to parse text/plain as JSON:', error);
        next();
      }
    });
  } else {
    next();
  }
});

// Test endpoints removed - no longer needed

// Import calculation utilities
// calculateTotalScore function moved to server-side utilities
const calculateTotalScore = (scores, mobilityType) => {
  // Simple fallback calculation for basic mode
  const selfCareTotal = Object.values(scores.selfCare || {}).reduce((sum, score) => sum + (score || 0), 0);
  const mobilityTotal = Object.values(scores.mobility || {}).reduce((sum, score) => sum + (score || 0), 0);
  return selfCareTotal + mobilityTotal;
};
import { convertBasicScoresToGG } from './itemAdapters.js';
import { calculateFunctionScore, getFunctionCovariates, extractPatientSummary, determineMobilityType } from './calculations.js';
import { getFunctionMultipliers, getImputationMultipliers } from './server/coefficientLoader.js';
import { parseXml } from './server/xmlParser.js';
import { imputeMissingGGItemsWithThresholds } from './imputationCalculations.js';
import { calculateEndScoreImputedValue, imputeMissingEndScoreGGItems } from './server/endScoreImputation.js';

// Load data files
import coefficientsAllVersions from '../../api/data/coefficients-all-versions.json' with { type: "json" };
import endScoreCoefficients from '../../api/data/end-score-coefficients.json' with { type: "json" };
import icdToHcc from '../../api/data/icdToHcc.json' with { type: "json" };
import mdsItemLookup from '../../api/data/mds_item_lookup.json' with { type: "json" };
import mdsSectionNames from '../../api/data/mds_section_names.json' with { type: "json" };

// Public token for Basic mode calculations
const PUBLIC_TOKEN = process.env.VITE_PUBLIC_TOKEN || 'dfs-public-token-2024';

// Rate limiting to prevent infinite loops
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 1000; // 1 second
const MAX_REQUESTS_PER_WINDOW = 5;

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

// Basic Score Calculation API
app.post("/api/calculate/basic-score", async (req, res) => {
  try {
    // Rate limiting removed - fixed infinite loop in frontend

    // Debug logging (simplified)
    console.log('Basic score request received');
    
    // Validate public token
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || token !== PUBLIC_TOKEN) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid public token required for basic calculations' 
      });
    }

    const { scores, mobilityType } = req.body;

    if (!scores || !scores.selfCare || !scores.mobility) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Scores must include selfCare and mobility categories' 
      });
    }

    // Convert basic scores to GG format for the core calculation logic
    const ggScores = convertBasicScoresToGG(scores);

    // Determine mobility type if not provided
    const actualMobilityType = mobilityType || 'Walk'; // Default to Walk for basic mode

    // Calculate total score using existing logic
    let functionScore;
    try {
      functionScore = calculateTotalScore(scores, actualMobilityType);
    } catch (calcError) {
      console.error('Calculation error, using fallback:', calcError);
      // Simple fallback calculation
      const selfCareTotal = Object.values(scores.selfCare).reduce((sum, score) => sum + (score || 0), 0);
      const mobilityTotal = Object.values(scores.mobility).reduce((sum, score) => sum + (score || 0), 0);
      functionScore = selfCareTotal + mobilityTotal;
    }

    return res.json({ result: { functionScore } });
  } catch (error) {
    console.error('Basic calculation error:', error);
    return res.status(500).json({ error: 'Basic calculation failed', detail: error.message });
  }
});

// Advanced Score Calculation API
app.post("/api/calculate/advanced-score", async (req, res) => {
  try {
    // SSO token validation (simplified for now)
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token || !token.startsWith('sso_')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid SSO token required for advanced calculations' 
      });
    }

    const { mdsXmlData } = req.body;

    if (!mdsXmlData) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'MDS XML data is required' 
      });
    }

    const parsedValues = parseXml(mdsXmlData);

    // Extract necessary data for calculations
    const ardDate = parsedValues["A2300"];
    const summary = extractPatientSummary(parsedValues, ardDate);
    const icdList = Object.entries(parsedValues)
      .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
      .map(([_, value]) => value)
      .filter(Boolean);

    const mobilityType = determineMobilityType(parsedValues);
    const startScores = parsedValues; // Assuming parsedValues can be directly used for start scores

    // Calculate function score
    const functionScore = calculateFunctionScore(startScores, mobilityType);

    // Get function multipliers
    const multipliers = getFunctionMultipliers(ardDate);
    
    // Get imputation multipliers
    const imputationMultipliers = getImputationMultipliers(ardDate);

    // Calculate covariates and weighted score
    const { covariates, weightedScore } = getFunctionCovariates(
      parsedValues,
      summary,
      icdList,
      startScores,
      ardDate
    );

    return res.json({
      result: {
        functionScore,
        weightedScore,
        covariates,
        summary,
        mobilityType,
        multipliers,
        imputationMultipliers,
      }
    });
  } catch (error) {
    console.error('Advanced calculation error:', error);
    return res.status(500).json({ error: 'Advanced calculation failed', detail: error.message });
  }
});

// Imputation Calculation API
app.post("/api/calculate/imputation", async (req, res) => {
  try {
    // SSO token validation (simplified for now)
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token || !token.startsWith('sso_')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid SSO token required for imputation calculations' 
      });
    }

    const { parsedValues, summary, icdList, startScores, targetGGItems } = req.body;

    if (!parsedValues || !summary || !icdList || !startScores || !targetGGItems) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Missing required imputation data' 
      });
    }

    const imputedValues = imputeMissingGGItemsWithThresholds(parsedValues, summary, icdList, startScores, targetGGItems);
    return res.json({ result: { imputedValues } });
  } catch (error) {
    console.error('Imputation calculation error:', error);
    return res.status(500).json({ error: 'Imputation failed', detail: error.message });
  }
});

// Imputation Details API - Returns detailed imputation analysis
app.post("/api/calculate/imputation-details", async (req, res) => {
  try {
    // SSO token validation
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token || !token.startsWith('sso_')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid SSO token required for imputation details' 
      });
    }

    const { mdsXmlData } = req.body;

    if (!mdsXmlData) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'MDS XML data is required' 
      });
    }

    const parsedValues = parseXml(mdsXmlData);
    const ardDate = parsedValues["A2300"];
    const summary = extractPatientSummary(parsedValues, ardDate);
    const icdList = Object.entries(parsedValues)
      .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
      .map(([_, value]) => value)
      .filter(Boolean);
    
    const mobilityType = determineMobilityType(parsedValues);
    
    // Get start scores (GG items with "1" suffix)
    const startScores = {};
    Object.keys(parsedValues).forEach(key => {
      if (key.endsWith('1') && key.startsWith('GG')) {
        const baseKey = key.slice(0, -1);
        startScores[baseKey] = parsedValues[key];
      }
    });

    // Get covariates
    const { covariates } = getFunctionCovariates(
      parsedValues,
      summary,
      icdList,
      startScores,
      ardDate
    );

    const usesWheelchair = covariates["Uses Wheelchair"] === 1;

    // Get imputation multipliers
    const imputationMultipliers = getImputationMultipliers(ardDate);
    const { getImputationThresholds, shouldExcludeGGItemCovariate } = await import('./imputationCalculations.js');

    // Define which items are walker-specific vs wheelchair-specific
    const walkerItems = new Set(['GG0170I1', 'GG0170J1', 'GG0170K1', 'GG0170L1', 'GG0170M1', 'GG0170N1', 'GG0170O1']);
    const wheelchairItems = new Set(['GG0170R1', 'GG0170S1']);

    const imputationData = {};

    // Process each GG item
    for (const ggItemId of Object.keys(imputationMultipliers)) {
      // Filter items based on mobility type
      if (walkerItems.has(ggItemId) && mobilityType !== 'Walk') {
        continue;
      }
      if (wheelchairItems.has(ggItemId) && mobilityType !== 'Wheel') {
        continue;
      }

      const multipliers = imputationMultipliers[ggItemId];
      const thresholds = getImputationThresholds(ggItemId, ardDate);

      // Calculate imputation score for this item
      const itemCovariates = {};
      let imputationScore = 0;

      for (const [covariateName, multiplier] of Object.entries(multipliers)) {
        // Check if this is a GG item-specific covariate that should be excluded
        if (covariateName.includes('(GG') && 
            (covariateName.includes('Valid Score') || 
             covariateName.includes('Not Attempted') || 
             covariateName.includes('Skipped'))) {
          
          if (shouldExcludeGGItemCovariate(covariateName, ggItemId, usesWheelchair)) {
            continue;
          }

          // Handle GG item-specific covariates
          const match = covariateName.match(/\(GG[0-9]+[A-Z][0-9]\)/);
          if (match) {
            const itemId = match[0].slice(1, -1);
            const rawValue = parsedValues[itemId];

            let covariateValue = 0;
            if (covariateName.includes(" - Valid Score")) {
              if (rawValue && ['01', '02', '03', '04', '05', '06'].includes(rawValue)) {
                covariateValue = parseInt(rawValue, 10);
              }
            } else if (covariateName.includes(" - Not Attempted")) {
              const hasSkippedCovariate = Object.keys(multipliers).some(key => 
                key.includes(itemId) && key.includes('Skipped')
              );
              if (hasSkippedCovariate) {
                covariateValue = ['07', '08', '09', '10', '88'].includes(rawValue) ? 1 : 0;
              } else {
                covariateValue = ['07', '08', '09', '10', '88', '^'].includes(rawValue) ? 1 : 0;
              }
            } else if (covariateName.includes(" - Skipped")) {
              covariateValue = rawValue === '^' ? 1 : 0;
            }

            if (covariateValue !== 0) {
              itemCovariates[covariateName] = covariateValue;
              imputationScore += covariateValue * multiplier;
            }
            continue;
          }
        }

        // Use main covariates for non-GG-item-specific covariates
        const covariateValue = covariates[covariateName] || 0;
        if (covariateValue !== 0) {
          itemCovariates[covariateName] = covariateValue;
          imputationScore += covariateValue * multiplier;
        }
      }

      // Determine which threshold range the score falls into
      let imputedValue = 1;
      for (let i = 0; i < thresholds.length; i++) {
        if (imputationScore > thresholds[i]) {
          imputedValue = i + 2;
        }
      }

      // Check raw MDS value to determine if imputation is needed
      const rawValue = parsedValues[ggItemId];
      const isValidValue = rawValue && ['01', '02', '03', '04', '05', '06'].includes(rawValue);
      const needsImputation = !rawValue || !isValidValue;

      imputationData[ggItemId] = {
        covariates: itemCovariates,
        multipliers,
        imputationScore,
        thresholds,
        imputedValue: needsImputation ? imputedValue : null,
        originalValue: rawValue || null,
        needsImputation
      };
    }

    return res.json({
      result: {
        imputationData,
        covariates,
        mobilityType
      }
    });
  } catch (error) {
    console.error('Imputation details error:', error);
    return res.status(500).json({ 
      error: 'Imputation details failed', 
      detail: error.message 
    });
  }
});

// End Score Calculation API removed - basic mode now uses /basic-score endpoint

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

app.listen(PORT, () => {
  console.log(`✅ Express server running on http://localhost:${PORT}`);
});
