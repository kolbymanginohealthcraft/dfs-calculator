#!/usr/bin/env node

/**
 * Generate Value Descriptions JSON from CSV
 * 
 * This script transforms the MDS item value CSV file into a JSON lookup
 * for faster parsing and smaller bundle size.
 * 
 * Usage: node scripts/transformers/generateValueDescriptions.cjs
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Configuration
const DATA_SOURCE_DIR = path.join(__dirname, '..', 'data-sources');

// Find the item value file
const availableFiles = fs.readdirSync(DATA_SOURCE_DIR)
  .filter(file => file.toLowerCase().includes('itm_val') && 
                  file.endsWith('.csv'))
  .sort()
  .reverse(); // Latest version first

if (availableFiles.length === 0) {
  console.error('❌ Error: No item value file found in scripts/data-sources/');
  console.error('   Expected format: *itm_val*.csv');
  process.exit(1);
}

const CSV_SOURCE = path.join(DATA_SOURCE_DIR, availableFiles[0]);
console.log(`Using file: ${availableFiles[0]}`);
const JSON_OUTPUT = path.join(__dirname, '..', '..', 'public', 'itm_val.json');

console.log('MDS Value Descriptions Generator');
console.log('================================\n');

console.log(`Reading CSV from: ${CSV_SOURCE}`);

const lookup = {};
let processedCount = 0;
let skippedCount = 0;

// Read and parse CSV file
fs.createReadStream(CSV_SOURCE)
  .pipe(csv())
  .on('data', (row) => {
    // Extract relevant fields from CSV
    const itemId = row['itm_id'] || row['ITM_ID'] || row['Item ID'];
    const valueId = row['val_id'] || row['VAL_ID'] || row['Value ID'];
    const valueText = row['val_txt'] || row['VAL_TXT'] || row['Value Text'];
    
    if (itemId && valueId && valueText) {
      // Use same key format as the React hook: "itemId|valueId"
      const key = `${itemId}|${valueId}`;
      lookup[key] = valueText;
      processedCount++;
    } else {
      skippedCount++;
    }
  })
  .on('end', () => {
    console.log(`Processed ${processedCount} value descriptions`);
    if (skippedCount > 0) {
      console.log(`Skipped ${skippedCount} invalid rows`);
    }
    
    // Write to JSON file
    console.log(`\nWriting JSON to: ${JSON_OUTPUT}`);
    fs.writeFileSync(
      JSON_OUTPUT,
      JSON.stringify(lookup, null, 2),
      'utf8'
    );
    
    // Get file sizes for comparison
    const csvSize = fs.statSync(CSV_SOURCE).size;
    const jsonSize = fs.statSync(JSON_OUTPUT).size;
    
    console.log(`\n✅ Successfully generated itm_val.json`);
    console.log(`   Total entries: ${Object.keys(lookup).length}`);
    console.log(`   CSV size: ${(csvSize / 1024).toFixed(1)} KB`);
    console.log(`   JSON size: ${(jsonSize / 1024).toFixed(1)} KB`);
    console.log(`   Size difference: ${((jsonSize - csvSize) / csvSize * 100).toFixed(1)}%`);
    console.log(`\n💡 Benefits:`);
    console.log(`   - No CSV parsing at runtime (faster)`);
    console.log(`   - Can be imported at build time (smaller bundle)`);
    console.log(`   - Direct key-value lookup (no iteration)`);
  })
  .on('error', (error) => {
    console.error('❌ Error reading CSV file:', error.message);
    process.exit(1);
  });
