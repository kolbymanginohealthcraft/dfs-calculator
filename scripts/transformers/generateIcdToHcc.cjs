#!/usr/bin/env node

/**
 * Generate ICD-to-HCC Mapping from Crosswalk Excel
 * 
 * This script extracts ICD-10 to HCC mappings from the CMS crosswalk
 * Excel file and generates the icdToHcc.js file.
 * 
 * Usage: node scripts/transformers/generateIcdToHcc.cjs
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Configuration
const DATA_SOURCE_DIR = path.join(__dirname, '..', 'data-sources');

// Find the ICD-to-HCC crosswalk file
const availableFiles = fs.readdirSync(DATA_SOURCE_DIR)
  .filter(file => file.toLowerCase().includes('snf') && 
                  file.toLowerCase().includes('discharge') && 
                  file.toLowerCase().includes('function') && 
                  file.toLowerCase().includes('icd10') &&
                  file.toLowerCase().includes('hcc') &&
                  file.toLowerCase().includes('crosswalk') &&
                  file.endsWith('.xlsx'))
  .sort()
  .reverse(); // Latest version first

if (availableFiles.length === 0) {
  console.error('❌ Error: No SNF discharge function ICD10-HCC crosswalk file found in scripts/data-sources/');
  console.error('   Expected format: *snf*discharge*function*icd10*hcc*crosswalk*.xlsx');
  process.exit(1);
}

const EXCEL_SOURCE = path.join(DATA_SOURCE_DIR, availableFiles[0]);
console.log(`Using file: ${availableFiles[0]}`);
const JS_OUTPUT = path.join(__dirname, '..', '..', 'src', 'utils', 'icdToHcc_generated.js');

console.log('ICD-to-HCC Mapping Generator');
console.log('============================\n');

console.log(`Reading Excel from: ${EXCEL_SOURCE}`);

try {
  // Read the Excel file
  const workbook = XLSX.readFile(EXCEL_SOURCE);
  
  // List available sheets
  console.log('Available sheets:', workbook.SheetNames);
  
  // Try to find the crosswalk sheet
  let sheetName = null;
  const possibleNames = [
    'ICD10-HCC Crosswalk',
    'ICD10_HCC_Crosswalk',
    'icd10_hcc_crosswalk',
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
    console.error('❌ Could not find crosswalk sheet');
    console.error('   Available sheets:', workbook.SheetNames);
    process.exit(1);
  }
  
  console.log(`Using sheet: ${sheetName}`);
  
  // Convert sheet to JSON
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Found ${data.length} rows in sheet`);
  
  // Process the data to extract ICD-to-HCC mappings
  const mappings = {};
  let processedCount = 0;
  let skippedCount = 0;
  
  // Find the header row to identify columns
  let headerRow = -1;
  let icdColumn = -1;
  let hccColumn = -1;
  
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && row.length > 1) {
      // Look for ICD code pattern in first column
      const firstCell = row[0]?.toString().trim();
      if (firstCell && firstCell.match(/^[A-Z]\d{2,3}(\.\d+)?$/)) {
        headerRow = i;
        icdColumn = 0;
        hccColumn = 1; // Assume second column is HCC
        break;
      }
    }
  }
  
  if (headerRow === -1) {
    console.error('❌ Could not identify data structure in Excel sheet');
    console.error('   Expected format: ICD Code | HCC Code');
    process.exit(1);
  }
  
  console.log(`Found data starting at row ${headerRow + 1}`);
  console.log(`Columns: ICD=${icdColumn}, HCC=${hccColumn}`);
  
  // Process the data rows
  for (let i = headerRow; i < data.length; i++) {
    const row = data[i];
    
    if (row && row.length > Math.max(icdColumn, hccColumn)) {
      const icdCode = row[icdColumn]?.toString().trim();
      const hccCode = row[hccColumn]?.toString().trim();
      
      // Validate ICD code format (e.g., A021, A021.1)
      if (icdCode && icdCode.match(/^[A-Z]\d{2,3}(\.\d+)?$/) && hccCode && hccCode.match(/^\d+$/)) {
        // Remove any decimal points from ICD code for consistency
        const cleanIcdCode = icdCode.replace('.', '');
        mappings[cleanIcdCode] = parseInt(hccCode, 10);
        processedCount++;
      } else {
        skippedCount++;
        if (skippedCount <= 10) {
          console.log(`  [DEBUG] Skipped row ${i + 1}: ICD="${icdCode}", HCC="${hccCode}"`);
        }
      }
    } else {
      skippedCount++;
    }
  }
  
  console.log(`Processed ${processedCount} ICD-to-HCC mappings`);
  if (skippedCount > 0) {
    console.log(`Skipped ${skippedCount} invalid rows`);
  }
  
  // Generate the JavaScript file content
  const jsContent = `// ICD-10 to HCC mapping for discharge function score
// Generated from ${availableFiles[0]}
// Sheet: ${sheetName}
// Generated on: ${new Date().toISOString()}

const icdToHcc = {
${Object.entries(mappings)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([icd, hcc]) => `  ${icd}: ${hcc}`)
  .join(',\n')}
};

export { icdToHcc };
`;
  
  // Ensure output directory exists
  const outputDir = path.dirname(JS_OUTPUT);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write to JavaScript file
  console.log(`\nWriting JS to: ${JS_OUTPUT}`);
  fs.writeFileSync(JS_OUTPUT, jsContent, 'utf8');
  
  console.log(`\n✅ Successfully generated icdToHcc_generated.js`);
  console.log(`   Total mappings: ${Object.keys(mappings).length}`);
  console.log(`   ⚠️  This is a test file - verify before replacing the original`);
  
} catch (error) {
  console.error('❌ Error processing Excel file:', error.message);
  process.exit(1);
}
