#!/usr/bin/env node

/**
 * Master Build Script
 * 
 * This script runs all data transformation scripts to generate
 * app-ready data files from raw regulatory sources.
 * 
 * Usage:
 *   node scripts/build-all.cjs                    # Build all with current year
 *   node scripts/build-all.cjs --year 2026        # Build for specific year
 *   node scripts/build-all.cjs --dry-run          # Show what would be built
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG_PATH = path.join(__dirname, 'config', 'data-sources.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const yearIndex = args.indexOf('--year');
const targetYear = yearIndex !== -1 && args[yearIndex + 1] ? args[yearIndex + 1] : config.currentYear;

console.log('🏗️  DFS Data Build Pipeline');
console.log('==========================\n');
console.log(`Target Year: ${targetYear}`);
console.log(`Effective Date: ${config.effectiveDate}`);
console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'BUILD'}\n`);

// Define transformation steps
const transformations = [
  {
    name: 'MDS Item Lookup',
    script: 'transformers/generateMdsLookup.cjs',
    description: 'Transform MDS item master definitions'
  },
  {
    name: 'Value Descriptions', 
    script: 'transformers/generateValueDescriptions.cjs',
    description: 'Transform MDS value descriptions'
  },
  {
    name: 'Function Multipliers',
    script: 'transformers/generateFunctionMultipliers.cjs', 
    description: 'Extract function multipliers from risk adjustment appendix'
  },
  {
    name: 'Imputation Multipliers',
    script: 'transformers/generateImputationMultipliers.cjs',
    description: 'Extract imputation multipliers from imputation appendix'
  },
  {
    name: 'ICD-to-HCC Mapping',
    script: 'transformers/generateIcdToHcc.cjs',
    description: 'Create ICD-10 to HCC crosswalk'
  },
  {
    name: 'ICD-10 Lookup',
    script: 'transformers/generateIcd10Lookup.cjs',
    description: 'Generate ICD-10 code lookup'
  }
];

// Check if required data sources exist
function checkDataSources() {
  console.log('📋 Checking data sources...\n');
  
  const dataSourcesDir = path.join(__dirname, 'data-sources');
  let allSourcesPresent = true;
  
  // Check each required file
  Object.values(config.dataSources).forEach(category => {
    Object.values(category).forEach(source => {
      let filename = source.filename;
      
      // Handle year placeholder for ICD codes
      if (source.yearPlaceholder) {
        filename = filename.replace(source.yearPlaceholder, targetYear);
      }
      
      const filePath = path.join(dataSourcesDir, filename);
      const exists = fs.existsSync(filePath);
      
      console.log(`${exists ? '✅' : '❌'} ${filename}`);
      if (!exists && source.required) {
        allSourcesPresent = false;
      }
    });
  });
  
  console.log('');
  return allSourcesPresent;
}

// Run a single transformation
function runTransformation(transform) {
  const scriptPath = path.join(__dirname, transform.script);
  
  if (!fs.existsSync(scriptPath)) {
    console.log(`⚠️  Skipping ${transform.name} - script not found: ${transform.script}`);
    return false;
  }
  
  console.log(`🔄 ${transform.name}: ${transform.description}`);
  
  if (isDryRun) {
    console.log(`   Would run: node ${transform.script}`);
    return true;
  }
  
  try {
    const result = execSync(`node "${scriptPath}"`, { 
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(`✅ ${transform.name} completed successfully`);
    return true;
  } catch (error) {
    console.log(`❌ ${transform.name} failed:`);
    console.log(`   ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  // Check data sources
  const sourcesPresent = checkDataSources();
  
  if (!sourcesPresent) {
    console.log('❌ Some required data sources are missing.');
    console.log('   Please ensure all required files are in scripts/data-sources/');
    console.log('   See scripts/data-sources/README.md for details.\n');
    process.exit(1);
  }
  
  // Run transformations
  console.log('🚀 Starting transformations...\n');
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const transform of transformations) {
    const success = runTransformation(transform);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 Build Summary');
  console.log('================');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📁 Total: ${transformations.length}`);
  
  if (failureCount > 0) {
    console.log('\n⚠️  Some transformations failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All transformations completed successfully!');
    console.log('   Your app is ready with the latest regulatory data.');
  }
}

// Run the build
main().catch(error => {
  console.error('💥 Build pipeline failed:', error.message);
  process.exit(1);
});
