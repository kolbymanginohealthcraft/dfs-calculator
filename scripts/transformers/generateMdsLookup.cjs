#!/usr/bin/env node

/**
 * Generate MDS Item Lookup from itm_mstr.csv
 * 
 * This script transforms the MDS item master CSV file into a JSON lookup
 * structure that the app can use for item definitions and descriptions.
 * 
 * Usage: node scripts/transformers/generateMdsLookup.cjs
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Configuration
const DATA_SOURCE_DIR = path.join(__dirname, '..', 'data-sources');

// Find the MDS item master file
const availableFiles = fs.readdirSync(DATA_SOURCE_DIR)
  .filter(file => file.toLowerCase().includes('itm_mstr') && 
                  file.endsWith('.csv'))
  .sort()
  .reverse(); // Latest version first

if (availableFiles.length === 0) {
  console.error('❌ Error: No MDS item master file found in scripts/data-sources/');
  console.error('   Expected format: *itm_mstr*.csv');
  process.exit(1);
}

const CSV_SOURCE = path.join(DATA_SOURCE_DIR, availableFiles[0]);
console.log(`Using file: ${availableFiles[0]}`);
const JSON_OUTPUT = path.join(__dirname, '..', '..', 'src', 'data', 'mds_item_lookup_generated.json');

console.log('MDS Item Lookup Generator');
console.log('=========================\n');

console.log(`Reading CSV from: ${CSV_SOURCE}`);

const lookup = {};
let processedCount = 0;
let skippedCount = 0;

// Read and parse CSV file
fs.createReadStream(CSV_SOURCE)
  .pipe(csv())
  .on('data', (row) => {
    // Extract relevant fields from CSV
    const itemId = row['ITM_ID'] || row['item_id'] || row['Item ID'];
    const shortLabel = row['ITM_SHRT_LABEL'] || row['short_label'] || row['Short Label'];
    const sectionLabel = row['ITM_SECT_LABEL'] || row['section_label'] || row['Section Label'];
    const sectionName = row['SECT_NAME'] || row['section_name'] || row['Section Name'];
    
    if (itemId && shortLabel) {
      lookup[itemId] = {
        itm_shrt_label: shortLabel,
        itm_sect_label: sectionLabel || 'Unknown',
        sect_name: sectionName || 'Unknown Section'
      };
      processedCount++;
    } else {
      skippedCount++;
      if (skippedCount <= 5) {
        console.log(`  [DEBUG] Skipped row: ${JSON.stringify(row)}`);
      }
    }
  })
  .on('end', () => {
    console.log(`Processed ${processedCount} MDS items`);
    if (skippedCount > 0) {
      console.log(`Skipped ${skippedCount} invalid rows`);
    }
    
    // Sort the keys for consistent output
    const sortedLookup = {};
    Object.keys(lookup).sort().forEach(key => {
      sortedLookup[key] = lookup[key];
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
      JSON.stringify(sortedLookup, null, 2),
      'utf8'
    );
    
    console.log(`\n✅ Successfully generated mds_item_lookup_generated.json`);
    console.log(`   Total items in output: ${Object.keys(sortedLookup).length}`);
    console.log(`   ⚠️  This is a test file - verify before replacing the original`);
  })
  .on('error', (error) => {
    console.error('❌ Error reading CSV file:', error.message);
    process.exit(1);
  });
