#!/usr/bin/env node

/**
 * Test Data Transformations
 * 
 * This script runs all transformation scripts to generate test files
 * so you can verify the output before replacing existing files.
 * 
 * Usage: node scripts/test-transformations.cjs
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Testing Data Transformations');
console.log('================================\n');

const transformations = [
  'generateMdsLookup.cjs',
  'generateIcdToHcc.cjs',
  'generateIcd10Lookup.cjs',
  'generateAllCoefficients.cjs'
];

let successCount = 0;
let failureCount = 0;

for (const script of transformations) {
  console.log(`🔄 Testing ${script}...`);
  
  try {
    const scriptPath = path.join(__dirname, 'transformers', script);
    execSync(`node "${scriptPath}"`, { 
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(`✅ ${script} completed successfully`);
    successCount++;
  } catch (error) {
    console.log(`❌ ${script} failed:`);
    console.log(`   ${error.message}`);
    failureCount++;
  }
  
  console.log(''); // Empty line for readability
}

// Summary
console.log('📊 Test Summary');
console.log('===============');
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${failureCount}`);
console.log(`📁 Total: ${transformations.length}`);

if (failureCount > 0) {
  console.log('\n⚠️  Some transformations failed. Check the output above for details.');
  console.log('   Make sure all required source files are in scripts/data-sources/');
} else {
  console.log('\n🎉 All transformations completed successfully!');
  console.log('   Check the generated files with _generated suffix:');
  console.log('   - src/data/mds_item_lookup_generated.json');
  console.log('   - public/itm_val_generated.csv');
  console.log('   - src/utils/functionMultipliers_generated.js');
  console.log('   - src/utils/imputationMultipliers_generated.js');
  console.log('   - src/utils/icdToHcc_generated.js');
  console.log('   - public/icd10_lookup_2025_generated.json');
  console.log('\n   Compare these with your existing files before replacing them.');
}
