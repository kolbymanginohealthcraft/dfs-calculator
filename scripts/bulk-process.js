#!/usr/bin/env node

/**
 * Bulk MDS File Processor
 * Processes multiple MDS XML files and outputs key metrics
 * Usage: node scripts/bulk-process.js [directory]
 * Output: CSV file with results
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import existing utilities
import { 
  calculateFunctionScore,
  determineMobilityType,
  extractPatientSummary,
  getFunctionCovariates,
  conditionMap,
  GG_ITEMS,
  formatDate
} from '../src/utils/calculations.js';

import { 
  calculateImputedValue
} from '../src/utils/fileParser.js';

// Validation config (adapted from fileValidation.js for Node.js)
const VALIDATION_CONFIG = {
  REQUIRED_MDS_ELEMENTS: ['A0100A', 'A0100B', 'A2300', 'I0020'],
  REQUIRED_GG_ELEMENTS: ['GG0130A1', 'GG0130B1', 'GG0130C1', 'GG0170A1', 'GG0170B1', 'GG0170C1'],
  VALID_GG_VALUES: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '88', '^', '-'],
  VALID_DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$|^\d{8}$/,
};

// Assessment type descriptions for A0310A (OBRA)
const assessmentTypeMapA0310A = {
  '01': '01 - Admission assessment (required by day 14)',
  '02': '02 - Quarterly review assessment',
  '03': '03 - Annual assessment',
  '04': '04 - Significant change in status assessment',
  '05': '05 - Significant correction to prior comprehensive assessment',
  '06': '06 - Significant correction to prior quarterly assessment',
  '99': '99 - None of the above'
};

// Assessment type descriptions for A0310B (PPS)
const assessmentTypeMapA0310B = {
  '01': '01 - 5-day scheduled assessment',
  '02': '02 - 14-day scheduled assessment',
  '03': '03 - 30-day scheduled assessment',
  '04': '04 - 60-day scheduled assessment',
  '05': '05 - 90-day scheduled assessment',
  '06': '06 - Readmission/return assessment',
  '07': '07 - Unscheduled assessment',
  '99': '99 - None of the above'
};

// Discharge type descriptions for A0310G
const dischargeTypeMap = {
  '1': '1 - Planned',
  '2': '2 - Unplanned'
};

// Discharge location descriptions for A2105
const dischargeLocationMap = {
  '01': '01 - Community',
  '02': '02 - Another nursing home',
  '03': '03 - Acute care hospital',
  '04': '04 - Psychiatric hospital',
  '05': '05 - Inpatient rehabilitation facility',
  '06': '06 - Hospice',
  '07': '07 - Long-term care hospital',
  '08': '08 - Other'
};

/**
 * Simple XML parser for MDS format (Node.js compatible)
 * Parses the simple <TAG>value</TAG> format used in MDS files
 */
function parseXmlNode(xmlString) {
  const result = {};
  // Match all tags with their content: <TAG>content</TAG>
  const tagRegex = /<([A-Z0-9]+)>([^<]*)<\/\1>/g;
  let match;
  
  while ((match = tagRegex.exec(xmlString)) !== null) {
    const [, tag, value] = match;
    // Only store non-empty values for leaf nodes
    if (value.trim()) {
      result[tag] = value.trim();
    }
  }
  
  return result;
}

/**
 * Build start scores object from parsed MDS data with proper imputation
 * Returns { scores, imputedCount }
 */
function buildStartScores(parsed, summary, icdList, ardDate) {
  const validValues = ['01', '02', '03', '04', '05', '06'];
  
  // First pass: collect raw values for ALL GG items
  const tempStartScores = {};
  GG_ITEMS.forEach((item) => {
    const sourceId = item.id + "1";
    const rawVal = parsed[sourceId] || "01";
    tempStartScores[item.id] = rawVal;
  });
  
  // Determine mobility type to know which items are used in scoring
  const mobilityType = determineMobilityType(parsed);
  
  // Define which items are used in scoring based on mobility type
  // This follows the logic in calculateFunctionScore
  const scoringItemIds = [
    'GG0130A', 'GG0130B', 'GG0130C',  // Self-care (always used)
    'GG0170A', 'GG0170C', 'GG0170D', 'GG0170E', 'GG0170F',  // Mobility (always used)
  ];
  
  // Add mobility-type-specific items
  if (mobilityType === 'Wheel') {
    scoringItemIds.push('GG0170R');  // Wheel uses R (counted twice in score)
  } else {
    scoringItemIds.push('GG0170I', 'GG0170J');  // Walk uses I and J
  }
  
  // Second pass: apply imputation where needed and count only scoring items
  const finalStartScores = {};
  let imputedCount = 0;
  
  GG_ITEMS.forEach((item) => {
    const sourceId = item.id + "1";
    const rawVal = parsed[sourceId];
    const isValidValue = rawVal && validValues.includes(rawVal);
    const isUsedInScoring = scoringItemIds.includes(item.id);
    
    let finalValue;
    if (isValidValue) {
      finalValue = rawVal;
    } else {
      // Apply imputation if invalid/missing
      // calculateImputedValue gets ardDate from parsed internally
      finalValue = calculateImputedValue(sourceId, parsed, summary, icdList, tempStartScores);
      
      // Only count imputation for items actually used in scoring
      if (isUsedInScoring) {
        imputedCount++;
      }
    }
    
    finalStartScores[item.id] = finalValue;
  });
  
  return { scores: finalStartScores, imputedCount };
}

/**
 * Validate MDS content (adapted from fileValidation.js)
 */
function validateMdsContent(parsed, xmlString) {
  const errors = [];
  
  // Check item set code for assessment type
  const itemSetCode = parsed['ITM_SBST_CD'];
  if (itemSetCode && itemSetCode !== 'NC' && itemSetCode !== 'NP') {
    const assessmentTypeDescriptions = {
      'NQ': 'Nursing home quarterly assessment',
      'ND': 'Nursing home discharge assessment', 
      'NT': 'Nursing home tracking record',
      'SP': 'Swing bed PPS assessment',
      'SD': 'Swing bed discharge assessment',
      'NPE': 'Nursing home PPS Part A Discharge',
    };
    const desc = assessmentTypeDescriptions[itemSetCode] || 'unknown type';
    errors.push(`Invalid assessment type: ${itemSetCode} (${desc}). Only NC/NP accepted.`);
  }
  
  // Check for PDF conversion indicators
  const pdfPatterns = [
    /iText.*xml/i,
    /Created from PDF via Acrobat/i,
    /<TaggedPDF-doc>/i,
    /MINIMUM DATA SET.*Version.*RESIDENT ASSESSMENT/i,
    /Type of Assessment Enter Code/m,
    /____|□|Enter Code.*01\. Admission assessment/m,
  ];
  
  if (pdfPatterns.some(pattern => pattern.test(xmlString))) {
    errors.push('PDF conversion detected. This is not a valid MDS data file.');
  }
  
  // Check for missing required MDS elements
  const missingRequired = VALIDATION_CONFIG.REQUIRED_MDS_ELEMENTS.filter(
    element => !parsed[element] || parsed[element].trim() === ''
  );
  if (missingRequired.length > 0) {
    errors.push(`Missing required elements: ${missingRequired.join(', ')}`);
  }
  
  // Check for required GG elements
  const missingGG = VALIDATION_CONFIG.REQUIRED_GG_ELEMENTS.filter(element => !parsed[element]);
  if (missingGG.length > 0) {
    // Check if this is a discharge assessment
    const dischargeElements = Object.keys(parsed).filter(key => 
      (key.startsWith('GG0130') || key.startsWith('GG0170')) && key.endsWith('3')
    );
    if (dischargeElements.length > 0) {
      errors.push('Discharge assessment detected. Not accepted for function score calculations.');
    } else {
      errors.push(`Missing GG elements: ${missingGG.join(', ')}`);
    }
  }
  
  // Validate GG values
  const invalidGGValues = [];
  VALIDATION_CONFIG.REQUIRED_GG_ELEMENTS.forEach(element => {
    const value = parsed[element];
    if (value && !VALIDATION_CONFIG.VALID_GG_VALUES.includes(value)) {
      invalidGGValues.push(`${element}=${value}`);
    }
  });
  if (invalidGGValues.length > 0) {
    errors.push(`Invalid GG values: ${invalidGGValues.join(', ')}`);
  }
  
  // Validate date format
  const ardDate = parsed['A2300'];
  if (ardDate && !VALIDATION_CONFIG.VALID_DATE_PATTERN.test(ardDate)) {
    errors.push(`Invalid date format: A2300='${ardDate}'`);
  }
  
  // Validate A0310A (Type of Assessment)
  const assessmentType = parsed['A0310A'];
  if (assessmentType && assessmentType !== '01' && assessmentType !== '99') {
    const types = {
      '02': 'Quarterly review', '03': 'Annual', '04': 'Significant change',
      '05': 'Correction to comprehensive', '06': 'Correction to quarterly'
    };
    const desc = types[assessmentType] || 'unknown';
    errors.push(`Invalid A0310A: ${assessmentType} (${desc}). Only 01 or 99 accepted.`);
  }
  
  // Check for invalid root element
  if (!xmlString.includes('<ASSESSMENT>') && !xmlString.includes('<MDS>')) {
    errors.push('Invalid root element. Must be ASSESSMENT or MDS.');
  }
  
  return errors;
}

/**
 * Get ICD code list from parsed data
 */
function getIcdList(parsed) {
  const icdFields = ['I0020B', 'I8000A', 'I8000B', 'I8000C', 'I8000D', 
                     'I8000E', 'I8000F', 'I8000G', 'I8000H', 'I8000I', 'I8000J'];
  return icdFields
    .map(field => parsed[field])
    .filter(val => val && val !== '^');
}

/**
 * Process a single MDS file
 */
function processFile(filePath) {
  try {
    const xmlContent = fs.readFileSync(filePath, 'utf8');
    const parsed = parseXmlNode(xmlContent);
    
    // Validate MDS content first
    const validationErrors = validateMdsContent(parsed, xmlContent);
    if (validationErrors.length > 0) {
      // Get assessment types with descriptions for error case
      const a0310aCode = parsed['A0310A'];
      const a0310bCode = parsed['A0310B'];
      const assessmentTypeOBRA = assessmentTypeMapA0310A[a0310aCode] || a0310aCode || '';
      const assessmentTypePPS = assessmentTypeMapA0310B[a0310bCode] || a0310bCode || '';
      
      // Get discharge type and location with descriptions
      const a0310gCode = parsed['A0310G'];
      const a2105Code = parsed['A2105'];
      const dischargeType = dischargeTypeMap[a0310gCode] || a0310gCode || '';
      const dischargeLocation = dischargeLocationMap[a2105Code] || a2105Code || '';
      
      // Return validation error result
      return {
        fileName: path.basename(filePath),
        patientFirstName: parsed['A0500A'] || '',
        patientLastName: parsed['A0500C'] || '',
        facilityName: parsed['A0100B'] || parsed['FAC_ID'] || '',
        ard: parsed['A2300'] ? formatDate(parsed['A2300']) : '',
        primaryCondition: '',
        mobilityType: '',
        startScore: '',
        expectedScore: '',
        scoreDifference: '',
        age: '',
        imputedCount: '',
        assessmentTypeOBRA: assessmentTypeOBRA,
        assessmentTypePPS: assessmentTypePPS,
        dischargeType: dischargeType,
        dischargeLocation: dischargeLocation,
        success: false,
        error: validationErrors[0] // Show first validation error
      };
    }
    
    // Extract basic patient info
    const ardDate = parsed['A2300'];
    const summary = extractPatientSummary(parsed, ardDate);
    
    // Get ICD codes for covariate calculation
    const icdList = getIcdList(parsed);
    
    // Build start scores with proper imputation and track imputed count
    const { scores: startScores, imputedCount } = buildStartScores(parsed, summary, icdList, ardDate);
    
    // Calculate start score
    const mobilityType = determineMobilityType(parsed);
    const startScore = calculateFunctionScore(startScores, mobilityType);
    
    // Calculate expected score (weighted score from covariates)
    const { weightedScore } = getFunctionCovariates(
      parsed,
      summary,
      icdList,
      startScores,
      ardDate
    );
    const expectedScore = Math.round(weightedScore * 100) / 100;
    
    // Get primary medical condition
    const conditionCode = parsed['I0020'];
    const primaryCondition = conditionMap[conditionCode] || 'Unknown';
    
    // Get facility CCN
    const facilityCCN = parsed['A0100B'] || parsed['FAC_ID'] || 'Unknown';
    
    // Get assessment types with descriptions
    const a0310aCode = parsed['A0310A'];
    const a0310bCode = parsed['A0310B'];
    const assessmentTypeOBRA = assessmentTypeMapA0310A[a0310aCode] || a0310aCode || '';
    const assessmentTypePPS = assessmentTypeMapA0310B[a0310bCode] || a0310bCode || '';
    
    // Get discharge type and location with descriptions
    const a0310gCode = parsed['A0310G'];
    const a2105Code = parsed['A2105'];
    const dischargeType = dischargeTypeMap[a0310gCode] || a0310gCode || '';
    const dischargeLocation = dischargeLocationMap[a2105Code] || a2105Code || '';
    
    return {
      fileName: path.basename(filePath),
      patientFirstName: summary.firstName || '',
      patientLastName: summary.lastName || '',
      facilityName: facilityCCN, // CCN number (name lookup would require API call)
      ard: formatDate(ardDate),
      primaryCondition: primaryCondition,
      mobilityType: mobilityType,
      startScore: startScore,
      expectedScore: expectedScore,
      scoreDifference: (expectedScore - startScore).toFixed(2),
      age: summary.age || '',
      imputedCount: imputedCount,
      assessmentTypeOBRA: assessmentTypeOBRA,
      assessmentTypePPS: assessmentTypePPS,
      dischargeType: dischargeType,
      dischargeLocation: dischargeLocation,
      success: true,
      error: null
    };
  } catch (error) {
    return {
      fileName: path.basename(filePath),
      patientFirstName: '',
      patientLastName: '',
      facilityName: '',
      ard: '',
      primaryCondition: '',
      mobilityType: '',
      startScore: '',
      expectedScore: '',
      scoreDifference: '',
      age: '',
      imputedCount: '',
      assessmentTypeOBRA: '',
      assessmentTypePPS: '',
      dischargeType: '',
      dischargeLocation: '',
      success: false,
      error: error.message
    };
  }
}

/**
 * Convert results array to CSV format
 */
function resultsToCSV(results) {
  const headers = [
    'File Name',
    'Patient First Name',
    'Patient Last Name',
    'Facility CCN',
    'ARD Date',
    'Age',
    'Primary Medical Condition',
    'Mobility Type',
    'Start Score',
    'Expected Score',
    'Score Difference',
    'Imputed Count',
    'Assessment Type OBRA (A0310A)',
    'Assessment Type PPS (A0310B)',
    'Discharge Type (A0310G)',
    'Discharge Location (A2105)',
    'Status',
    'Error'
  ];
  
  const rows = results.map(r => [
    r.fileName,
    r.patientFirstName,
    r.patientLastName,
    r.facilityName,
    r.ard,
    r.age,
    r.primaryCondition,
    r.mobilityType,
    r.startScore,
    r.expectedScore,
    r.scoreDifference,
    r.imputedCount,
    r.assessmentTypeOBRA,
    r.assessmentTypePPS,
    r.dischargeType,
    r.dischargeLocation,
    r.success ? 'Success' : 'Error',
    r.error || ''
  ]);
  
  // Escape CSV fields (handle commas and quotes)
  const escapeCSV = (field) => {
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const csvRows = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ];
  
  return csvRows.join('\n');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const inputDir = args[0] || 'test-data/examples';
  const outputFile = args[1] || 'bulk-results.csv';
  
  const resolvedDir = path.resolve(process.cwd(), inputDir);
  
  console.log('🔍 Bulk MDS File Processor');
  console.log('==========================');
  console.log(`Input Directory: ${resolvedDir}`);
  console.log(`Output File: ${outputFile}`);
  console.log('');
  
  // Check if directory exists
  if (!fs.existsSync(resolvedDir)) {
    console.error(`❌ Error: Directory not found: ${resolvedDir}`);
    process.exit(1);
  }
  
  // Get all XML files
  const files = fs.readdirSync(resolvedDir)
    .filter(f => f.toLowerCase().endsWith('.xml'))
    .map(f => path.join(resolvedDir, f));
  
  if (files.length === 0) {
    console.error(`❌ Error: No XML files found in ${resolvedDir}`);
    process.exit(1);
  }
  
  console.log(`📁 Found ${files.length} XML file(s)\n`);
  
  // Process all files
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  let validationErrorCount = 0;
  
  files.forEach((file, index) => {
    const fileName = path.basename(file);
    process.stdout.write(`Processing ${index + 1}/${files.length}: ${fileName}... `);
    
    const result = processFile(file);
    results.push(result);
    
    if (result.success) {
      successCount++;
      console.log(`✅ (Start: ${result.startScore}, Expected: ${result.expectedScore})`);
    } else {
      // Check if it's a validation error (vs processing error)
      if (result.error && typeof result.error === 'string' && 
          (result.error.includes('Invalid') || result.error.includes('Missing') || 
           result.error.includes('detected') || result.error.includes('PDF'))) {
        validationErrorCount++;
        console.log(`⚠️  VALIDATION ERROR: ${result.error}`);
      } else {
        errorCount++;
        console.log(`❌ ${result.error}`);
      }
    }
  });
  
  // Write results to CSV
  const csv = resultsToCSV(results);
  fs.writeFileSync(outputFile, csv, 'utf8');
  
  console.log('\n==========================');
  console.log('📊 Summary');
  console.log('==========================');
  console.log(`Total Files: ${files.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`⚠️  Validation Errors: ${validationErrorCount}`);
  console.log(`❌ Processing Errors: ${errorCount}`);
  console.log(`\n📄 Results saved to: ${outputFile}`);
  
  // Display sample results
  if (successCount > 0) {
    console.log('\n📋 Sample Results (first 5):');
    console.log('----------------------------');
    const samples = results.filter(r => r.success).slice(0, 5);
    samples.forEach(r => {
      console.log(`${r.fileName}:`);
      console.log(`  Patient: ${r.patientFirstName} ${r.patientLastName}`);
      console.log(`  Facility: ${r.facilityName}`);
      console.log(`  ARD: ${r.ard}`);
      console.log(`  Condition: ${r.primaryCondition}`);
      console.log(`  Mobility: ${r.mobilityType}`);
      console.log(`  Start Score: ${r.startScore} → Expected: ${r.expectedScore} (Δ ${r.scoreDifference})`);
      console.log('');
    });
  }
  
  // Display validation errors
  if (validationErrorCount > 0) {
    console.log('\n⚠️  Validation Errors:');
    console.log('----------------------------');
    const errors = results.filter(r => !r.success && r.error && 
      (r.error.includes('Invalid') || r.error.includes('Missing') || 
       r.error.includes('detected') || r.error.includes('PDF')));
    errors.forEach(r => {
      console.log(`${r.fileName}:`);
      console.log(`  ERROR: ${r.error}`);
      if (r.patientFirstName || r.patientLastName) {
        console.log(`  Patient: ${r.patientFirstName} ${r.patientLastName}`);
      }
      if (r.facilityName) {
        console.log(`  Facility: ${r.facilityName}`);
      }
      console.log('');
    });
  }
}

// Run the script
main();
