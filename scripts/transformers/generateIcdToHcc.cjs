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
const JSON_OUTPUT = path.join(__dirname, '..', '..', 'Aegis.DfsCalculator', 'DFSCalculator.Server', 'Data', 'icdToHcc.json');

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
  let hccColumn = -1;
  let icdColumn = -1;
  
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && row.length > 1) {
      // Look for header row with "HCC" and "ICD-10 Code"
      const firstCell = row[0]?.toString().trim();
      const secondCell = row[1]?.toString().trim();
      if (firstCell && firstCell.match(/HCC/i) && secondCell && secondCell.match(/ICD.*10.*Code/i)) {
        headerRow = i + 2; // Skip header and filter row
        hccColumn = 0;
        icdColumn = 1;
        break;
      }
      // Alternative: Look for ICD code pattern in second column
      if (secondCell && secondCell.match(/^[A-Z]\d{2,3}(\.\d+)?/)) {
        headerRow = i;
        hccColumn = 0;
        icdColumn = 1;
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
      
      // Validate ICD code format - more permissive to catch all ICD-10 formats
      // ICD-10 can be: A01, A012, A0123, A01.2, A012.3, etc.
      if (icdCode && icdCode.match(/^[A-Z][0-9A-Z]+(\.[0-9A-Z]+)?/) && hccCode && !isNaN(hccCode)) {
        // Remove any spaces, decimal points, and extra characters for consistency
        const cleanIcdCode = icdCode.replace(/[.\s]/g, '').trim();
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
  
  // Sort mappings for consistent output
  const sortedMappings = {};
  Object.keys(mappings)
    .sort((a, b) => a.localeCompare(b))
    .forEach(key => {
      sortedMappings[key] = mappings[key];
    });
  
  // Ensure output directory exists
  const outputDir = path.dirname(JSON_OUTPUT);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write to JSON file
  console.log(`\nWriting JSON to: ${JSON_OUTPUT}`);
  fs.writeFileSync(
    JSON_OUTPUT,
    JSON.stringify(sortedMappings, null, 2),
    'utf8'
  );
  
  console.log(`\n✅ Successfully generated icdToHcc.json`);
  console.log(`   Total mappings: ${Object.keys(mappings).length}`);
  console.log(`   Source: ${availableFiles[0]}`);
  console.log(`   Sheet: ${sheetName}`);
  
} catch (error) {
  console.error('❌ Error processing Excel file:', error.message);
  process.exit(1);
}
