#!/usr/bin/env node

/**
 * Test script to verify coefficient version selection
 * Run: node test-version-selection.cjs
 */

const allVersions = require('./Aegis.DfsCalculator/DFSCalculator.Server/Data/coefficients-all-versions.json');

// Version selection logic (duplicated from coefficientLoader for testing)
function getUpdateIdForDate(dateStr) {
  if (!dateStr) {
    return allVersions.schedule[allVersions.schedule.length - 1].updateId;
  }
  
  let assessmentDate;
  if (dateStr.includes('-')) {
    assessmentDate = new Date(dateStr);
  } else if (dateStr.length === 8) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    assessmentDate = new Date(`${year}-${month}-${day}`);
  } else {
    return allVersions.schedule[allVersions.schedule.length - 1].updateId;
  }
  
  // Normalize all dates to midnight UTC to avoid timezone issues
  const assessmentDateOnly = new Date(Date.UTC(
    assessmentDate.getUTCFullYear(),
    assessmentDate.getUTCMonth(),
    assessmentDate.getUTCDate()
  ));
  
  for (const period of allVersions.schedule) {
    const startDate = new Date(period.startDate);
    const startDateOnly = new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    ));
    
    const endDate = period.endDate ? new Date(period.endDate) : new Date('9999-12-31');
    const endDateOnly = new Date(Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate()
    ));
    
    if (assessmentDateOnly >= startDateOnly && assessmentDateOnly <= endDateOnly) {
      return period.updateId;
    }
  }
  
  return allVersions.schedule[allVersions.schedule.length - 1].updateId;
}

function getFunctionMultipliers(dateStr) {
  const updateId = getUpdateIdForDate(dateStr);
  return allVersions.functionMultipliers[updateId];
}

function getScheduleInfo(dateStr) {
  const updateId = getUpdateIdForDate(dateStr);
  return allVersions.schedule.find(s => s.updateId === updateId);
}

function getAllSchedules() {
  return allVersions.schedule;
}

console.log('🧪 Testing Coefficient Version Selection\n');
console.log('═'.repeat(60));

// Show all available versions
console.log('\n📅 Available Versions:\n');
const schedules = getAllSchedules();
schedules.forEach(s => {
  console.log(`   Update ID ${s.updateId}:`);
  console.log(`     Fiscal Year: ${s.fiscalYear}`);
  console.log(`     Effective: ${s.startDate} to ${s.endDate || 'Present'}`);
  console.log(`     Manual: Version ${s.manualVersion}`);
  console.log();
});

console.log('═'.repeat(60));

// Test cases
const testCases = [
  {
    name: 'FY 2023 Assessment (Mid-year)',
    date: '20230515',
    expectedId: '1',
    expectedFY: 'FY 2023'
  },
  {
    name: 'FY 2024 Assessment (End of period)',
    date: '20240915',
    expectedId: '1',
    expectedFY: 'FY 2023'
  },
  {
    name: 'FY 2025 Assessment (Start)',
    date: '20241001',
    expectedId: '2',
    expectedFY: 'FY 2025'
  },
  {
    name: 'FY 2025 Assessment (Mid-year)',
    date: '20250315',
    expectedId: '2',
    expectedFY: 'FY 2025'
  },
  {
    name: 'FY 2026 Assessment (Just started)',
    date: '20251001',
    expectedId: '3',
    expectedFY: 'FY 2026'
  },
  {
    name: 'FY 2026 Assessment (Today)',
    date: '20251006',
    expectedId: '3',
    expectedFY: 'FY 2026'
  },
  {
    name: 'ISO Date Format',
    date: '2025-10-06',
    expectedId: '3',
    expectedFY: 'FY 2026'
  },
  {
    name: 'No Date (Should use latest)',
    date: null,
    expectedId: '3',
    expectedFY: 'FY 2026'
  }
];

console.log('\n🧪 Running Test Cases:\n');

let passCount = 0;
let failCount = 0;

testCases.forEach((test, index) => {
  const updateId = getUpdateIdForDate(test.date);
  const scheduleInfo = getScheduleInfo(test.date);
  const multipliers = getFunctionMultipliers(test.date);
  const modelIntercept = multipliers['Model Intercept'];
  
  const idMatch = updateId === test.expectedId;
  const fyMatch = scheduleInfo?.fiscalYear === test.expectedFY;
  const testPassed = idMatch && fyMatch;
  
  const status = testPassed ? '✅ PASS' : '❌ FAIL';
  
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`   Date: ${test.date || '(none)'}`);
  console.log(`   Expected: Update ID ${test.expectedId} (${test.expectedFY})`);
  console.log(`   Actual:   Update ID ${updateId} (${scheduleInfo?.fiscalYear})`);
  console.log(`   Model Intercept: ${modelIntercept}`);
  console.log(`   ${status}\n`);
  
  if (testPassed) {
    passCount++;
  } else {
    failCount++;
  }
});

console.log('═'.repeat(60));
console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed\n`);

if (failCount === 0) {
  console.log('✅ All tests passed! Version selection is working correctly.\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review the logic.\n');
  process.exit(1);
}
