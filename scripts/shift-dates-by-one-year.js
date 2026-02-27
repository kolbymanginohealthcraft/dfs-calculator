/**
 * Shift all dates in MDS XML files forward by one year.
 *
 * Usage: node scripts/shift-dates-by-one-year.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DATA_DIR = path.join(__dirname, '..', 'test-data', 'example-batch3');

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

function addOneYear(date) {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + 1);
  return result;
}

function shiftDatesInXml(xml) {
  return xml.replace(/<([A-Za-z0-9_]+)>(\d{8})<\/\1>/g, (match, tag, dateStr) => {
    const date = parseYYYYMMDD(dateStr);
    if (!date) return match;
    const shifted = addOneYear(date);
    const newStr = formatYYYYMMDD(shifted);
    return `<${tag}>${newStr}</${tag}>`;
  });
}

function main() {
  const files = fs.readdirSync(TEST_DATA_DIR).filter((f) => f.endsWith('.xml'));
  console.log(`Shifting dates forward by 1 year in ${files.length} files in example-batch3...\n`);

  files.forEach((file) => {
    const filePath = path.join(TEST_DATA_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const shifted = shiftDatesInXml(content);
    fs.writeFileSync(filePath, shifted, 'utf8');
    console.log(`  ${file}: done`);
  });

  console.log(`\nDone. Processed ${files.length} files.`);
}

main();
