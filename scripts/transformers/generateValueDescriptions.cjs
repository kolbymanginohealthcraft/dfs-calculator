#!/usr/bin/env node

/**
 * Generate Value Descriptions from itm_val.csv
 * 
 * This script transforms the MDS value descriptions CSV file into the format
 * used by the app's useValueDescriptions hook.
 * 
 * Usage: node scripts/transformers/generateValueDescriptions.cjs
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Configuration
const DATA_SOURCE_DIR = path.join(__dirname, '..', 'data-sources');

// Find the MDS value descriptions file
const availableFiles = fs.readdirSync(DATA_SOURCE_DIR)
  .filter(file => file.toLowerCase().includes('itm_val') && 
                  file.endsWith('.csv'))
  .sort()
  .reverse(); // Latest version first

if (availableFiles.length === 0) {
  console.error('❌ Error: No MDS value descriptions file found in scripts/data-sources/');
  console.error('   Expected format: *itm_val*.csv');
  process.exit(1);
}

const CSV_SOURCE = path.join(DATA_SOURCE_DIR, availableFiles[0]);
console.log(`Using file: ${availableFiles[0]}`);
const CSV_OUTPUT = path.join(__dirname, '..', '..', 'public', 'itm_val_generated.csv');

console.log('Value Descriptions Generator');
console.log('============================\n');

console.log(`Reading CSV from: ${CSV_SOURCE}`);

const rows = [];
let processedCount = 0;
let skippedCount = 0;

// Read and parse CSV file
fs.createReadStream(CSV_SOURCE)
  .pipe(csv())
  .on('data', (row) => {
    // Keep the row as-is, just validate required fields
    const itemId = row['ITM_ID'] || row['item_id'] || row['Item ID'];
    const valId = row['VAL_ID'] || row['val_id'] || row['Value ID'];
    const valText = row['VAL_TXT'] || row['val_txt'] || row['Value Text'];
    
    if (itemId && valId && valText) {
      rows.push(row);
      processedCount++;
    } else {
      skippedCount++;
      if (skippedCount <= 5) {
        console.log(`  [DEBUG] Skipped row: ${JSON.stringify(row)}`);
      }
    }
  })
  .on('end', () => {
    console.log(`Processed ${processedCount} value descriptions`);
    if (skippedCount > 0) {
      console.log(`Skipped ${skippedCount} invalid rows`);
    }
    
    // Ensure output directory exists
    const outputDir = path.dirname(CSV_OUTPUT);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Convert rows back to CSV format
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      const csvContent = [
        headers.join(','),
        ...rows.map(row => headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      // Write to CSV file
      console.log(`\nWriting CSV to: ${CSV_OUTPUT}`);
      fs.writeFileSync(CSV_OUTPUT, csvContent, 'utf8');
      
      console.log(`\n✅ Successfully generated itm_val_generated.csv`);
      console.log(`   Total descriptions in output: ${rows.length}`);
      console.log(`   ⚠️  This is a test file - verify before replacing the original`);
    } else {
      console.log(`\n❌ No valid rows found to process`);
    }
  })
  .on('error', (error) => {
    console.error('❌ Error reading CSV file:', error.message);
    process.exit(1);
  });
