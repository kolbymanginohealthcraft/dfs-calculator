/**
 * Shift all dates in MDS XML files so ARD (A2300) falls within FY 2025
 * (10/1/25 - 9/30/26), which uses update_id 3 for coefficient lookups.
 *
 * Shifts all dates by the same amount per file to preserve:
 * - Patient age (DOB + admission date relationship)
 * - Day of stay for assessment (ARD relative to admission)
 *
 * Usage: node scripts/shift-dates-to-fy2025.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_DATA_DIR = path.join(__dirname, '..', 'test-data', 'example-batch2');

// FY 2025 = 10/1/25 to 9/30/26 (update_id 3)
const FY2025_START = new Date('2025-10-01');
const FY2025_END = new Date('2026-09-30');

// Target ARD: use a date safely inside FY 2025 (e.g., mid-November 2025)
const TARGET_ARD = new Date('2025-11-15');

function parseYYYYMMDD(str) {
  if (!str || str.length !== 8) return null;
  const y = parseInt(str.substring(0, 4), 10);
  const m = parseInt(str.substring(4, 6), 10) - 1;
  const d = parseInt(str.substring(6, 8), 10);
  if (y < 1900 || y > 2099) return null;
  const date = new Date(y, m, d);
  if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
  return date;
}

function formatYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Extract ARD from XML - prefers A2300 (Assessment Reference Date)
 */
function extractARD(xml) {
  const a2300 = xml.match(/<A2300>([^<]+)<\/A2300>/);
  if (a2300 && a2300[1] !== '^') return a2300[1];
  const a1600 = xml.match(/<A1600>([^<]+)<\/A1600>/);
  if (a1600 && a1600[1] !== '^') return a1600[1];
  return null;
}

/**
 * Shift all YYYYMMDD dates in XML by `days` (positive = future)
 */
function shiftDatesInXml(xml, days) {
  return xml.replace(/<([A-Za-z0-9_]+)>(\d{8})<\/\1>/g, (match, tag, dateStr) => {
    const date = parseYYYYMMDD(dateStr);
    if (!date) return match;
    const shifted = addDays(date, days);
    const newStr = formatYYYYMMDD(shifted);
    return `<${tag}>${newStr}</${tag}>`;
  });
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const ardStr = extractARD(content);
  if (!ardStr) {
    console.warn(`  Skipping ${path.basename(filePath)}: no ARD (A2300/A1600) found`);
    return false;
  }

  const ardDate = parseYYYYMMDD(ardStr);
  if (!ardDate) {
    console.warn(`  Skipping ${path.basename(filePath)}: invalid ARD "${ardStr}"`);
    return false;
  }

  // If ARD is already in FY 2025, compute shift to target
  let daysToAdd;
  if (ardDate >= FY2025_START && ardDate <= FY2025_END) {
    daysToAdd = Math.round((TARGET_ARD - ardDate) / (24 * 60 * 60 * 1000));
  } else {
    daysToAdd = Math.round((TARGET_ARD - ardDate) / (24 * 60 * 60 * 1000));
  }

  const shifted = shiftDatesInXml(content, daysToAdd);
  fs.writeFileSync(filePath, shifted, 'utf8');
  const newArd = extractARD(shifted);
  return { daysToAdd, newArd };
}

function main() {
  const files = fs.readdirSync(TEST_DATA_DIR).filter((f) => f.endsWith('.xml'));
  console.log(`Shifting dates in ${files.length} files in example-batch2...`);
  console.log('Target: ARD in FY 2025 (10/1/25 - 9/30/26) → update_id 3\n');

  let processed = 0;
  let skipped = 0;

  files.forEach((file) => {
    const filePath = path.join(TEST_DATA_DIR, file);
    const result = processFile(filePath);
    if (result === false) {
      skipped++;
    } else {
      processed++;
      if (processed <= 5) {
        console.log(`  ${file}: shifted ${result.daysToAdd} days → ARD ${result.newArd}`);
      }
    }
  });

  if (processed > 5) {
    console.log(`  ... and ${processed - 5} more files`);
  }

  console.log(`\nDone. Processed ${processed} files, skipped ${skipped}.`);
}

main();
