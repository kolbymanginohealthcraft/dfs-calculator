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
let fillerTransformCount = 0;
let duplicateSkipCount = 0;

// Read and parse CSV file
fs.createReadStream(CSV_SOURCE)
  .pipe(csv())
  .on('data', (row) => {
    // Extract relevant fields from CSV (using actual column names from CSV)
    let itemId = row['itm_id'] || row['ITM_ID'] || row['Item ID'];
    let shortLabel = row['itm_shrt_label'] || row['ITM_SHRT_LABEL'] || row['Short Label'];
    let sectionLabel = row['itm_sect_label'] || row['ITM_SECT_LABEL'] || row['Section Label'];
    const dbId = row['itm_db_id'] || row['ITM_DB_ID'] || row['DB ID'];
    let itemType = row['itm_type_cd'] || row['ITM_TYPE_CD'] || row['Type'];
    
    // Handle filler items - extract the actual old item code
    if (sectionLabel === 'Filler' && shortLabel && shortLabel.includes('replaces old ')) {
      const match = shortLabel.match(/replaces old (\w+)/);
      if (match && match[1]) {
        const oldItemCode = match[1];
        
        // Check if this code would create a duplicate
        if (lookup[oldItemCode]) {
          // Skip this entry - the real item already exists
          duplicateSkipCount++;
          return;
        }
        
        itemId = oldItemCode;
        // Extract section label from the code (letters before first digit)
        const sectionMatch = oldItemCode.match(/^([A-Z]+)/);
        sectionLabel = sectionMatch ? sectionMatch[1] : 'Unknown';
        
        // Replace the label with a cleaner format using the database ID
        if (dbId) {
          shortLabel = `Deprecated: ${dbId}`;
          
          // Extract type from database ID suffix
          if (dbId.endsWith('_NUM')) {
            itemType = 'Number';
          } else if (dbId.endsWith('_DT')) {
            itemType = 'Date';
          } else if (dbId.endsWith('_CD')) {
            itemType = 'Code';
          } else if (dbId.endsWith('_TXT')) {
            itemType = 'Text';
          }
        } else {
          shortLabel = `Deprecated: ${oldItemCode}`;
        }
        
        fillerTransformCount++;
      }
    }
    
    if (itemId && shortLabel) {
      const entry = {
        itm_shrt_label: shortLabel,
        itm_sect_label: sectionLabel || 'Unknown'
      };
      
      // Add type field if available
      if (itemType) {
        entry.itm_type_cd = itemType;
      }
      
      lookup[itemId] = entry;
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
    if (fillerTransformCount > 0) {
      console.log(`Transformed ${fillerTransformCount} filler items to old item codes`);
    }
    if (duplicateSkipCount > 0) {
      console.log(`Skipped ${duplicateSkipCount} filler items (duplicates of existing codes)`);
    }
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
