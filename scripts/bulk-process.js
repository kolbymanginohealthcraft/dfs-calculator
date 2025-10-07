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
 */
function buildStartScores(parsed, summary, icdList, ardDate) {
  const validValues = ['01', '02', '03', '04', '05', '06'];
  
  // First pass: collect raw values
  const tempStartScores = {};
  GG_ITEMS.forEach((item) => {
    const sourceId = item.id + "1";
    const rawVal = parsed[sourceId] || "01";
    tempStartScores[item.id] = rawVal;
  });
  
  // Second pass: apply imputation where needed
  const finalStartScores = {};
  GG_ITEMS.forEach((item) => {
    const sourceId = item.id + "1";
    const rawVal = parsed[sourceId];
    const isValidValue = rawVal && validValues.includes(rawVal);
    
    let finalValue;
    if (isValidValue) {
      finalValue = rawVal;
    } else {
      // Apply imputation if invalid/missing
      // calculateImputedValue gets ardDate from parsed internally
      finalValue = calculateImputedValue(sourceId, parsed, summary, icdList, tempStartScores);
    }
    
    finalStartScores[item.id] = finalValue;
  });
  
  return finalStartScores;
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
    
    // Extract basic patient info
    const ardDate = parsed['A2300'];
    const summary = extractPatientSummary(parsed, ardDate);
    
    // Get ICD codes for covariate calculation
    const icdList = getIcdList(parsed);
    
    // Build start scores with proper imputation
    const startScores = buildStartScores(parsed, summary, icdList, ardDate);
    
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
    
    // Get assessment type
    const assessmentType = parsed['A0310F'];
    
    return {
      fileName: path.basename(filePath),
      patientFirstName: summary.firstName || '',
      patientLastName: summary.lastName || '',
      facilityName: facilityCCN, // CCN number (name lookup would require API call)
      ard: formatDate(ardDate),
      admitDate: formatDate(summary.admitDate),
      primaryCondition: primaryCondition,
      mobilityType: mobilityType,
      startScore: startScore,
      expectedScore: expectedScore,
      scoreDifference: (expectedScore - startScore).toFixed(1),
      age: summary.age || '',
      assessmentType: assessmentType || '',
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
      admitDate: '',
      primaryCondition: '',
      mobilityType: '',
      startScore: '',
      expectedScore: '',
      scoreDifference: '',
      age: '',
      assessmentType: '',
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
    'Admit Date',
    'Age',
    'Primary Medical Condition',
    'Mobility Type',
    'Start Score',
    'Expected Score',
    'Score Difference',
    'Assessment Type',
    'Status',
    'Error'
  ];
  
  const rows = results.map(r => [
    r.fileName,
    r.patientFirstName,
    r.patientLastName,
    r.facilityName,
    r.ard,
    r.admitDate,
    r.age,
    r.primaryCondition,
    r.mobilityType,
    r.startScore,
    r.expectedScore,
    r.scoreDifference,
    r.assessmentType,
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
  
  files.forEach((file, index) => {
    const fileName = path.basename(file);
    process.stdout.write(`Processing ${index + 1}/${files.length}: ${fileName}... `);
    
    const result = processFile(file);
    results.push(result);
    
    if (result.success) {
      successCount++;
      console.log(`✅ (Start: ${result.startScore}, Expected: ${result.expectedScore})`);
    } else {
      errorCount++;
      console.log(`❌ ${result.error}`);
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
  console.log(`❌ Errors: ${errorCount}`);
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
}

// Run the script
main();
