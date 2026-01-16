const fs = require('fs');
const path = require('path');

// Directory containing test XML files
const TEST_DATA_DIR = path.join(__dirname, '..', 'test-data', 'example-batch');

// Generate a random string
function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate a random number string
function randomNumericString(length) {
  const digits = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return result;
}

// Generate a random DOB (age between 65-100)
function randomDOB() {
  const currentYear = new Date().getFullYear();
  const age = Math.floor(Math.random() * 35) + 65; // 65-100 years old
  const year = currentYear - age;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Anonymize XML content
function anonymizeXML(xmlContent) {
  // Anonymize patient name (A0500A, A0500B, A0500C, A0500D)
  xmlContent = xmlContent.replace(/<A0500A>([^<]+)<\/A0500A>/, `<A0500A>${randomString(6)}</A0500A>`);
  xmlContent = xmlContent.replace(/<A0500B>([^<]+)<\/A0500B>/, (match) => {
    const value = match.match(/<A0500B>([^<]+)<\/A0500B>/)[1];
    if (value === '^' || value === '') return match;
    return `<A0500B>${randomString(1).toUpperCase()}</A0500B>`;
  });
  xmlContent = xmlContent.replace(/<A0500C>([^<]+)<\/A0500C>/, `<A0500C>${randomString(8)}</A0500C>`);
  xmlContent = xmlContent.replace(/<A0500D>([^<]+)<\/A0500D>/, (match) => {
    const value = match.match(/<A0500D>([^<]+)<\/A0500D>/)[1];
    if (value === '^' || value === '') return match;
    return `<A0500D>${randomString(3)}</A0500D>`;
  });

  // Anonymize DOB (A0900)
  xmlContent = xmlContent.replace(/<A0900>([^<]+)<\/A0900>/, `<A0900>${randomDOB()}</A0900>`);

  // Anonymize SSN (A0600A)
  xmlContent = xmlContent.replace(/<A0600A>([^<]+)<\/A0600A>/, `<A0600A>${randomNumericString(9)}</A0600A>`);

  // Anonymize other patient identifiers
  xmlContent = xmlContent.replace(/<A0600B>([^<]+)<\/A0600B>/, `<A0600B>${randomString(11)}</A0600B>`);
  xmlContent = xmlContent.replace(/<A0100A>([^<]+)<\/A0100A>/, `<A0100A>${randomNumericString(10)}</A0100A>`);
  xmlContent = xmlContent.replace(/<A0100B>([^<]+)<\/A0100B>/, `<A0100B>${randomNumericString(6)}</A0100B>`);
  xmlContent = xmlContent.replace(/<A0100C>([^<]+)<\/A0100C>/, `<A0100C>${randomNumericString(9)}</A0100C>`);

  return xmlContent;
}

// Process all XML files in the directory
function processFiles() {
  const files = fs.readdirSync(TEST_DATA_DIR).filter(file => file.endsWith('.xml'));
  
  console.log(`Processing ${files.length} files...`);
  
  files.forEach((file, index) => {
    const filePath = path.join(TEST_DATA_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const anonymized = anonymizeXML(content);
    fs.writeFileSync(filePath, anonymized, 'utf8');
    
    if ((index + 1) % 10 === 0) {
      console.log(`Processed ${index + 1}/${files.length} files...`);
    }
  });
  
  console.log('All files processed successfully!');
}

// Run the script
processFiles();
