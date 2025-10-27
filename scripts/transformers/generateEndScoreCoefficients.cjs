#!/usr/bin/env node

/**
 * Generate End Score Imputation Coefficients
 * 
 * This script extracts end score imputation coefficients from the CMS
 * Excel files and generates a JSON file containing:
 * - End score imputation multipliers for all Update IDs
 * - End score thresholds for all Update IDs
 * 
 * Usage: node scripts/transformers/generateEndScoreCoefficients.cjs
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_SOURCE_DIR = path.join(__dirname, '..', 'data-sources');
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'src', 'data', 'end-score-coefficients.json');

console.log('┌────────────────────────────────────────────────┐');
console.log('│  End Score Coefficients Generator            │');
console.log('└────────────────────────────────────────────────┘\n');

// Find source files
console.log('📁 Locating source files...');
const files = fs.readdirSync(DATA_SOURCE_DIR);

const imputationFile = files
  .filter(f => f.toLowerCase().includes('imputation') && 
               f.toLowerCase().includes('appendix') && 
               f.endsWith('.xlsx'))
  .sort()
  .reverse()[0];

if (!imputationFile) {
  console.error('❌ Error: Could not find required Excel files');
  process.exit(1);
}

console.log(`   Imputation:      ${imputationFile}\n`);

// Parse Risk Adjustment Schedule to get update IDs
console.log('📅 Parsing schedule information...');
const raWb = XLSX.readFile(path.join(DATA_SOURCE_DIR, imputationFile));
const raScheduleSheet = raWb.Sheets['Schedule'];
const raScheduleData = XLSX.utils.sheet_to_json(raScheduleSheet, {header: 1});

// Find the Discharge Function Score section
const dfsStartRow = raScheduleData.findIndex(row => 
  row[0] && 
  row[0].toString().includes('Discharge Function Score') && 
  row[0].toString().includes('01/01/2023')
);

if (dfsStartRow === -1) {
  console.error('❌ Error: Could not find Discharge Function Score in schedule');
  process.exit(1);
}

// Extract schedule entries for Discharge Function Score only
const schedule = [];
for (let i = dfsStartRow; i < raScheduleData.length; i++) {
  const row = raScheduleData[i];
  
  // Stop at end markers
  if (row[0] && row[0].toString().includes('End of')) break;
  
  // Must have an Update ID (column 2) that is a number
  const updateIdValue = row[2];
  if (!updateIdValue || typeof updateIdValue !== 'number') continue;
  
  const updateId = String(updateIdValue);
  const startDate = excelDateToISO(row[5]);
  const endDate = row[6] === 'Present' ? null : excelDateToISO(row[6]);
  
  schedule.push({
    updateId,
    manualVersion: String(row[3]),
    manualPostDate: row[4],
    startDate,
    endDate,
    fiscalYear: `FY ${getFiscalYearFromDate(row[5])}`,
    comments: row[7] || ''
  });
}

console.log(`   Found ${schedule.length} update versions\n`);

// Helper function to convert Excel date serial to ISO date string
function excelDateToISO(excelDate) {
  if (!excelDate || excelDate === 'Present') return null;
  if (typeof excelDate === 'string') return excelDate;
  
  // Excel serial date starts from 1900-01-01
  const epoch = new Date(1899, 11, 30);
  const date = new Date(epoch.getTime() + excelDate * 86400000);
  return date.toISOString().split('T')[0];
}

// Helper function to determine fiscal year from date
function getFiscalYearFromDate(dateValue) {
  const isoDate = excelDateToISO(dateValue);
  if (!isoDate) return null;
  
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  
  // Fiscal year starts October 1st
  // If month >= 10 (Oct-Dec), FY is next calendar year
  // If month < 10 (Jan-Sep), FY is current calendar year
  return month >= 10 ? year + 1 : year;
}

// Helper function to normalize covariate names
function normalizeCovariateName(name) {
  return name
    .replace(/–/g, '-')  // Replace en-dash with regular hyphen
    .replace(/—/g, '-')  // Replace em-dash with regular hyphen  
    .replace(/'/g, "'")  // Replace smart apostrophe with regular apostrophe
    .replace(/'/g, "'")  // Replace another smart apostrophe variant
    .trim();
}

// Parse End Score Imputation Multipliers
console.log('\n📈 Parsing end score imputation multipliers...');
const impWb = XLSX.readFile(path.join(DATA_SOURCE_DIR, imputationFile));
const endScoreImputationMultipliers = {};
const endScoreThresholds = {};

schedule.forEach(({updateId}) => {
  const sheetName = `Coefficients - Discharge - ID ${updateId}`;
  console.log(`\n   Processing ${sheetName}...`);
  
  if (!impWb.SheetNames.includes(sheetName)) {
    console.warn(`   ⚠️  Sheet not found: ${sheetName}`);
    return;
  }
  
  const sheet = impWb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, {header: 1});
  
  // Data is transposed: GG items are in row 2 as column headers
  // Row 0: Title
  // Row 1: ['Covariate', 'Update ID X']
  // Row 2: ['', 'GG0130A3', 'GG0130B3', 'GG0130C3', ...]
  // Row 3: Filter row
  // Row 4+: ['Covariate Name', value1, value2, value3, ...]
  
  if (data.length < 4) {
    console.warn(`   ⚠️  Sheet has insufficient data rows`);
    return;
  }
  
  // Get GG item IDs from row 2 (index 2)
  const ggItemRow = data[2];
  const ggItems = [];
  for (let col = 1; col < ggItemRow.length; col++) {
    const cellValue = ggItemRow[col];
    if (cellValue && cellValue.toString().match(/^GG\d+[A-Z]3$/)) {
      ggItems.push({
        item: cellValue.toString().trim(),
        columnIndex: col
      });
    }
  }
  
  console.log(`   Found ${ggItems.length} GG items`);
  
  // Initialize structure
  endScoreImputationMultipliers[updateId] = {};
  endScoreThresholds[updateId] = {};
  ggItems.forEach(({item}) => {
    endScoreImputationMultipliers[updateId][item] = {};
    endScoreThresholds[updateId][item] = [];
  });
  
  // Parse coefficient rows (skip first 4 rows: title, headers, gg items, filter)
  let coeffCount = 0;
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;
    
    const rawCovariateName = row[0]?.toString().trim();
    if (!rawCovariateName || rawCovariateName === 'Reference' || rawCovariateName.includes('filter')) continue;
    
    // Check if this is a threshold row
    if (rawCovariateName.toLowerCase().includes('threshold')) {
      // Parse thresholds for each GG item
      ggItems.forEach(({item, columnIndex}) => {
        const value = row[columnIndex];
        if (value !== undefined && value !== null && value !== 'Reference') {
          const numValue = typeof value === 'number' ? value : parseFloat(value);
          if (!isNaN(numValue)) {
            endScoreThresholds[updateId][item].push(numValue);
          }
        }
      });
      continue;
    }
    
    // Normalize covariate name to match code expectations
    const covariateName = normalizeCovariateName(rawCovariateName);
    
    // Get value for each GG item
    ggItems.forEach(({item, columnIndex}) => {
      const value = row[columnIndex];
      if (value !== undefined && value !== null && value !== 'Reference') {
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (!isNaN(numValue)) {
          endScoreImputationMultipliers[updateId][item][covariateName] = numValue;
          coeffCount++;
        }
      }
    });
  }
  
  console.log(`   ✓ ${ggItems.length} GG items, ${coeffCount} coefficients`);
});

// Generate output structure
console.log('\n📝 Generating output file...');

const output = {
  metadata: {
    generated: new Date().toISOString(),
    imputationSource: imputationFile,
    updateCount: schedule.length
  },
  schedule,
  endScoreImputationMultipliers,
  endScoreThresholds
};

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, {recursive: true});
}

// Write output file
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

console.log(`\n✅ Success! Generated ${OUTPUT_FILE}`);
console.log('\n📊 Summary:');
console.log(`   - ${schedule.length} update versions`);
console.log(`   - ${Object.keys(endScoreImputationMultipliers).length} end score multiplier versions`);
console.log(`   - ${Object.keys(endScoreThresholds).length} end score threshold versions`);

// Calculate total size
const stats = fs.statSync(OUTPUT_FILE);
const sizeKB = (stats.size / 1024).toFixed(1);
console.log(`   - Output file size: ${sizeKB} KB`);

console.log('\n✨ Done!\n');
