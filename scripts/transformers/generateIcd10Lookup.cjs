/**
 * Generate ICD-10 Lookup JSON from TXT Source
 * 
 * This script parses the ICD-10-CM codes TXT file and generates
 * a JSON lookup file mapping ICD codes to descriptions.
 * 
 * Usage: 
 *   node scripts/generateICD10Lookup.cjs                  # Uses latest year available
 *   node scripts/generateICD10Lookup.cjs 2026             # Specific year
 *   node scripts/generateICD10Lookup.cjs 2026 --compare   # Compare mode (creates separate file)
 */

const fs = require('fs');
const path = require('path');

console.log('ICD-10 Lookup Generator');
console.log('=======================\n');

// Parse command line arguments
const args = process.argv.slice(2);
const isCompareMode = args.includes('--compare');
let specifiedYear = args.find(arg => /^\d{4}$/.test(arg));

// Configuration
const DATA_SOURCE_DIR = path.join(__dirname, 'data-sources');

// Find available ICD-10 files
const availableFiles = fs.readdirSync(DATA_SOURCE_DIR)
  .filter(file => /^icd10cm_codes_\d{4}\.txt$/.test(file))
  .sort()
  .reverse(); // Latest year first

if (availableFiles.length === 0) {
  console.error('❌ Error: No ICD-10 code files found in scripts/data-sources/');
  console.error('   Expected format: icd10cm_codes_YYYY.txt');
  process.exit(1);
}

// Determine which file to use
let sourceFile;
let year;

if (specifiedYear) {
  sourceFile = `icd10cm_codes_${specifiedYear}.txt`;
  if (!availableFiles.includes(sourceFile)) {
    console.error(`❌ Error: File not found: ${sourceFile}`);
    console.error(`   Available years: ${availableFiles.map(f => f.match(/\d{4}/)[0]).join(', ')}`);
    process.exit(1);
  }
  year = specifiedYear;
} else {
  sourceFile = availableFiles[0];
  year = sourceFile.match(/\d{4}/)[0];
  console.log(`No year specified, using latest: ${year}`);
}

const TXT_SOURCE = path.join(DATA_SOURCE_DIR, sourceFile);
const JSON_OUTPUT = path.join(__dirname, '..', 'public', `icd10_lookup_${year}.json`);
const JSON_OUTPUT_COMPARE = path.join(__dirname, '..', `icd10_lookup_${year}_generated.json`);

console.log(`Source: ${sourceFile}`);
console.log(`Year: ${year}\n`);

// Read the TXT file
console.log(`Reading TXT from: ${TXT_SOURCE}`);
const txtContent = fs.readFileSync(TXT_SOURCE, 'utf8');

// Parse the file (handle both \r\n and \n line endings)
console.log('Parsing TXT file...');
const lines = txtContent.split(/\r?\n/);
const lookup = {};
let processedCount = 0;
let skippedCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Skip empty lines
  if (!line.trim()) {
    skippedCount++;
    continue;
  }
  
  // Match: code (alphanumeric, no spaces) followed by whitespace and description
  const match = line.match(/^([A-Z0-9]+)\s+(.+)$/);
  
  if (match) {
    const code = match[1];
    const description = match[2].trim();
    
    if (code && description) {
      lookup[code] = description;
      processedCount++;
    } else {
      skippedCount++;
    }
  } else {
    skippedCount++;
  }
}

console.log(`Processed ${processedCount} ICD-10 codes`);
if (skippedCount > 0) {
  console.log(`Skipped ${skippedCount} empty/invalid lines`);
}

// Sort the keys for consistent output
const sortedLookup = {};
Object.keys(lookup).sort().forEach(key => {
  sortedLookup[key] = lookup[key];
});

// Determine output file
const outputFile = isCompareMode ? JSON_OUTPUT_COMPARE : JSON_OUTPUT;
const outputFilename = path.basename(outputFile);

// Write to JSON file
console.log(`\nWriting JSON to: ${outputFile}`);
fs.writeFileSync(
  outputFile,
  JSON.stringify(sortedLookup, null, 2),
  'utf8'
);

console.log(`\n✓ Successfully generated ${outputFilename}`);
console.log(`  Total codes in output: ${Object.keys(sortedLookup).length}`);

if (!isCompareMode) {
  console.log(`\n💡 Tip: Use --compare flag to generate a comparison file first`);
  console.log(`   Example: node scripts/generateICD10Lookup.cjs ${year} --compare`);
}
