#!/usr/bin/env node

/**
 * Generate Imputation Multipliers from Imputation Appendix Excel
 * 
 * This script extracts imputation multipliers from the CMS imputation
 * appendix Excel file and generates the imputationMultipliers.js file.
 * 
 * Usage: node scripts/transformers/generateImputationMultipliers.cjs
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Configuration
const DATA_SOURCE_DIR = path.join(__dirname, '..', 'data-sources');

// Find the imputation appendix file
const availableFiles = fs.readdirSync(DATA_SOURCE_DIR)
  .filter(file => file.toLowerCase().includes('imputation') && 
                  file.toLowerCase().includes('appendix') && 
                  file.toLowerCase().includes('snf') &&
                  file.endsWith('.xlsx'))
  .sort()
  .reverse(); // Latest version first

if (availableFiles.length === 0) {
  console.error('❌ Error: No imputation appendix file found in scripts/data-sources/');
  console.error('   Expected format: *imputation*appendix*snf*.xlsx');
  process.exit(1);
}

const EXCEL_SOURCE = path.join(DATA_SOURCE_DIR, availableFiles[0]);
console.log(`Using file: ${availableFiles[0]}`);
const JS_OUTPUT = path.join(__dirname, '..', '..', 'src', 'utils', 'imputationMultipliers_generated.js');

console.log('Imputation Multipliers Generator');
console.log('================================\n');

console.log(`Reading Excel from: ${EXCEL_SOURCE}`);

try {
  // Read the Excel file
  const workbook = XLSX.readFile(EXCEL_SOURCE);
  
  // List available sheets
  console.log('Available sheets:', workbook.SheetNames);
  
  // Try to find the coefficients sheet
  let sheetName = null;
  const possibleNames = [
    'Coefficients - Admission - ID 2',
    'Coefficients_Admission_ID_2',
    'coefficients_admission_id_2',
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
    console.error('❌ Could not find coefficients sheet');
    console.error('   Available sheets:', workbook.SheetNames);
    process.exit(1);
  }
  
  console.log(`Using sheet: ${sheetName}`);
  
  // Convert sheet to JSON
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Found ${data.length} rows in sheet`);
  
  // Process the data to extract multipliers by GG item
  const multipliers = {};
  let processedCount = 0;
  let skippedCount = 0;
  
  // Find the header row to identify columns
  let headerRow = -1;
  let itemColumn = -1;
  let covariateColumn = -1;
  let multiplierColumn = -1;
  
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && row.length > 0) {
      // Look for GG item identifier in first column
      const firstCell = row[0]?.toString().trim();
      if (firstCell && firstCell.match(/^GG\d+[A-Z]\d+$/)) {
        headerRow = i;
        itemColumn = 0;
        covariateColumn = 1; // Assume second column is covariate name
        multiplierColumn = 2; // Assume third column is multiplier value
        break;
      }
    }
  }
  
  if (headerRow === -1) {
    console.error('❌ Could not identify data structure in Excel sheet');
    console.error('   Expected format: GG item | Covariate | Multiplier');
    process.exit(1);
  }
  
  console.log(`Found data starting at row ${headerRow + 1}`);
  console.log(`Columns: Item=${itemColumn}, Covariate=${covariateColumn}, Multiplier=${multiplierColumn}`);
  
  // Process the data rows
  for (let i = headerRow; i < data.length; i++) {
    const row = data[i];
    
    if (row && row.length > Math.max(itemColumn, covariateColumn, multiplierColumn)) {
      const itemId = row[itemColumn]?.toString().trim();
      const covariateName = row[covariateColumn]?.toString().trim();
      const multiplierValue = parseFloat(row[multiplierColumn]);
      
      if (itemId && itemId.match(/^GG\d+[A-Z]\d+$/) && covariateName && !isNaN(multiplierValue)) {
        if (!multipliers[itemId]) {
          multipliers[itemId] = {};
        }
        multipliers[itemId][covariateName] = multiplierValue;
        processedCount++;
      } else {
        skippedCount++;
        if (skippedCount <= 10) {
          console.log(`  [DEBUG] Skipped row ${i + 1}: Item="${itemId}", Covariate="${covariateName}", Value="${row[multiplierColumn]}"`);
        }
      }
    } else {
      skippedCount++;
    }
  }
  
  console.log(`Processed ${processedCount} multiplier entries`);
  if (skippedCount > 0) {
    console.log(`Skipped ${skippedCount} invalid rows`);
  }
  
  // Generate the JavaScript file content
  const jsContent = `// Imputation multipliers for GG items
// Generated from ${availableFiles[0]}
// Sheet: ${sheetName}
// Generated on: ${new Date().toISOString()}

export const imputationMultipliers = {
${Object.entries(multipliers)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([itemId, covariates]) => {
    const covariateEntries = Object.entries(covariates)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => `    "${name}": ${value}`)
      .join(',\n');
    return `  "${itemId}": {\n${covariateEntries}\n  }`;
  })
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
  
  console.log(`\n✅ Successfully generated imputationMultipliers_generated.js`);
  console.log(`   Total GG items: ${Object.keys(multipliers).length}`);
  console.log(`   Total multiplier entries: ${processedCount}`);
  console.log(`   ⚠️  This is a test file - verify before replacing the original`);
  
} catch (error) {
  console.error('❌ Error processing Excel file:', error.message);
  process.exit(1);
}
