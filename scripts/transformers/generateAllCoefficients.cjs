#!/usr/bin/env node

/**
 * Generate All Historical Coefficient Versions
 * 
 * This script extracts ALL historical versions of coefficients from the CMS
 * Excel files and generates a single unified JSON file containing:
 * - Schedule/version information
 * - Function multipliers (risk adjustment) for all Update IDs
 * - Imputation multipliers for all Update IDs
 * 
 * Usage: node scripts/transformers/generateAllCoefficients.cjs
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_SOURCE_DIR = path.join(__dirname, '..', 'data-sources');
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'src', 'data', 'coefficients-all-versions.json');

console.log('┌────────────────────────────────────────────────┐');
console.log('│  Historical Coefficients Generator            │');
console.log('└────────────────────────────────────────────────┘\n');

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

// Find source files
console.log('📁 Locating source files...');
const files = fs.readdirSync(DATA_SOURCE_DIR);

const riskAdjustmentFile = files
  .filter(f => f.toLowerCase().includes('risk') && 
               f.toLowerCase().includes('adjustment') && 
               f.toLowerCase().includes('appendix') && 
               f.endsWith('.xlsx'))
  .sort()
  .reverse()[0];

const imputationFile = files
  .filter(f => f.toLowerCase().includes('imputation') && 
               f.toLowerCase().includes('appendix') && 
               f.endsWith('.xlsx'))
  .sort()
  .reverse()[0];

if (!riskAdjustmentFile || !imputationFile) {
  console.error('❌ Error: Could not find required Excel files');
  process.exit(1);
}

console.log(`   Risk Adjustment: ${riskAdjustmentFile}`);
console.log(`   Imputation:      ${imputationFile}\n`);

// Parse Risk Adjustment Schedule
console.log('📅 Parsing schedule information...');
const raWb = XLSX.readFile(path.join(DATA_SOURCE_DIR, riskAdjustmentFile));
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
schedule.forEach(s => {
  console.log(`   ID ${s.updateId}: ${s.startDate} to ${s.endDate || 'Present'} (${s.fiscalYear})`);
});

// Parse Function Multipliers (Risk Adjustment Coefficients)
console.log('\n📊 Parsing function multipliers (risk adjustment)...');
const raCoeffSheet = raWb.Sheets['Discharge Function - Coeff'];
if (!raCoeffSheet) {
  console.error('❌ Error: Could not find "Discharge Function - Coeff" sheet');
  process.exit(1);
}

const raCoeffData = XLSX.utils.sheet_to_json(raCoeffSheet, {header: 1});

// Row 1 is header: ['Covariate', 'Update ID 1', 'Update ID 2', 'Update ID 3']
const headerRow = raCoeffData[1];
const updateIdColumns = [];

for (let i = 1; i < headerRow.length; i++) {
  const colName = headerRow[i];
  if (colName && colName.toString().includes('Update ID')) {
    const match = colName.toString().match(/Update ID (\d+)/);
    if (match) {
      updateIdColumns.push({
        updateId: match[1],
        columnIndex: i
      });
    }
  }
}

console.log(`   Found ${updateIdColumns.length} update ID columns`);

// Initialize function multipliers object
const functionMultipliers = {};
updateIdColumns.forEach(({updateId}) => {
  functionMultipliers[updateId] = {};
});

// Parse coefficients (starting from row 2)
let processedCount = 0;
for (let i = 2; i < raCoeffData.length; i++) {
  const row = raCoeffData[i];
  if (!row[0]) continue;
  
  const covariateName = row[0].toString().trim();
  
  updateIdColumns.forEach(({updateId, columnIndex}) => {
    const value = row[columnIndex];
    if (value !== undefined && value !== null && value !== 'Reference') {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (!isNaN(numValue)) {
        functionMultipliers[updateId][covariateName] = numValue;
        processedCount++;
      }
    }
  });
}

console.log(`   Processed ${processedCount} coefficient entries`);
Object.entries(functionMultipliers).forEach(([id, coeffs]) => {
  console.log(`   Update ID ${id}: ${Object.keys(coeffs).length} covariates`);
});

// Parse Imputation Multipliers
console.log('\n📈 Parsing imputation multipliers...');
const impWb = XLSX.readFile(path.join(DATA_SOURCE_DIR, imputationFile));
const imputationMultipliers = {};

schedule.forEach(({updateId}) => {
  const sheetName = `Coefficients - Admission - ID ${updateId}`;
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
  // Row 2: ['', 'GG0130A1', 'GG0130B1', 'GG0130C1', ...]
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
    if (cellValue && cellValue.toString().match(/^GG\d+[A-Z]\d+$/)) {
      ggItems.push({
        item: cellValue.toString().trim(),
        columnIndex: col
      });
    }
  }
  
  console.log(`   Found ${ggItems.length} GG items`);
  
  // Initialize structure
  imputationMultipliers[updateId] = {};
  ggItems.forEach(({item}) => {
    imputationMultipliers[updateId][item] = {};
  });
  
  // Parse coefficient rows (skip first 4 rows: title, headers, gg items, filter)
  let coeffCount = 0;
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;
    
    const covariateName = row[0]?.toString().trim();
    if (!covariateName || covariateName === 'Reference' || covariateName.includes('filter')) continue;
    
    // Get value for each GG item
    ggItems.forEach(({item, columnIndex}) => {
      const value = row[columnIndex];
      if (value !== undefined && value !== null && value !== 'Reference') {
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (!isNaN(numValue)) {
          imputationMultipliers[updateId][item][covariateName] = numValue;
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
    riskAdjustmentSource: riskAdjustmentFile,
    imputationSource: imputationFile,
    updateCount: schedule.length
  },
  schedule,
  functionMultipliers,
  imputationMultipliers
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
console.log(`   - ${Object.keys(functionMultipliers).length} function multiplier versions`);
console.log(`   - ${Object.keys(imputationMultipliers).length} imputation multiplier versions`);

// Calculate total size
const stats = fs.statSync(OUTPUT_FILE);
const sizeKB = (stats.size / 1024).toFixed(1);
console.log(`   - Output file size: ${sizeKB} KB`);

console.log('\n✨ Done!\n');
