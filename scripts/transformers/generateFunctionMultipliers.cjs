#!/usr/bin/env node

/**
 * Generate Function Multipliers from Risk Adjustment Appendix Excel
 * 
 * This script extracts function multipliers from the CMS risk adjustment
 * appendix Excel file and generates the functionMultipliers.js file.
 * 
 * Usage: node scripts/transformers/generateFunctionMultipliers.cjs
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Configuration
const DATA_SOURCE_DIR = path.join(__dirname, '..', 'data-sources');

// Find the risk adjustment appendix file
const availableFiles = fs.readdirSync(DATA_SOURCE_DIR)
  .filter(file => file.toLowerCase().includes('risk') && 
                  file.toLowerCase().includes('adjustment') && 
                  file.toLowerCase().includes('appendix') && 
                  file.toLowerCase().includes('snf') &&
                  file.endsWith('.xlsx'))
  .sort()
  .reverse(); // Latest version first

if (availableFiles.length === 0) {
  console.error('❌ Error: No risk adjustment appendix file found in scripts/data-sources/');
  console.error('   Expected format: *risk*adjustment*appendix*snf*.xlsx');
  process.exit(1);
}

const EXCEL_SOURCE = path.join(DATA_SOURCE_DIR, availableFiles[0]);
console.log(`Using file: ${availableFiles[0]}`);
const JS_OUTPUT = path.join(__dirname, '..', '..', 'src', 'utils', 'functionMultipliers_generated.js');

console.log('Function Multipliers Generator');
console.log('==============================\n');

console.log(`Reading Excel from: ${EXCEL_SOURCE}`);

try {
  // Read the Excel file
  const workbook = XLSX.readFile(EXCEL_SOURCE);
  
  // List available sheets
  console.log('Available sheets:', workbook.SheetNames);
  
  // Try to find the function multipliers sheet
  let sheetName = null;
  const possibleNames = [
    'Function Multipliers',
    'Function_Multipliers', 
    'function_multipliers',
    'Sheet1',
    workbook.SheetNames[0] // Fallback to first sheet
  ];
  
  for (const name of possibleNames) {
    if (workbook.SheetNames.includes(name)) {
      sheetName = name;
      break;
    }
  }
  
  if (!sheetName) {
    console.error('❌ Could not find function multipliers sheet');
    console.error('   Available sheets:', workbook.SheetNames);
    process.exit(1);
  }
  
  console.log(`Using sheet: ${sheetName}`);
  
  // Convert sheet to JSON
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Found ${data.length} rows in sheet`);
  
  // Process the data to extract multipliers
  const multipliers = {};
  let processedCount = 0;
  let skippedCount = 0;
  
  // Skip header row and process data
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    if (row.length >= 2 && row[0] && row[1] !== undefined) {
      const covariateName = row[0].toString().trim();
      const multiplierValue = parseFloat(row[1]);
      
      if (covariateName && !isNaN(multiplierValue)) {
        multipliers[covariateName] = multiplierValue;
        processedCount++;
      } else {
        skippedCount++;
        if (skippedCount <= 5) {
          console.log(`  [DEBUG] Skipped row ${i}: "${covariateName}" = ${row[1]}`);
        }
      }
    } else {
      skippedCount++;
    }
  }
  
  console.log(`Processed ${processedCount} multipliers`);
  if (skippedCount > 0) {
    console.log(`Skipped ${skippedCount} invalid rows`);
  }
  
  // Generate the JavaScript file content
  const jsContent = `// Function multipliers for discharge function score
// Generated from ${availableFiles[0]}
// Generated on: ${new Date().toISOString()}

export const functionMultipliers = {
${Object.entries(multipliers)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, value]) => `  "${name}": ${value}`)
  .join(',\n')}
};
`;
  
  // Ensure output directory exists
  const outputDir = path.dirname(JS_OUTPUT);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write to JavaScript file
  console.log(`\nWriting JS to: ${JS_OUTPUT}`);
  fs.writeFileSync(JS_OUTPUT, jsContent, 'utf8');
  
  console.log(`\n✅ Successfully generated functionMultipliers_generated.js`);
  console.log(`   Total multipliers in output: ${Object.keys(multipliers).length}`);
  console.log(`   ⚠️  This is a test file - verify before replacing the original`);
  
} catch (error) {
  console.error('❌ Error processing Excel file:', error.message);
  process.exit(1);
}
