/**
 * Enhanced file validation utilities for MDS XML files
 * Provides comprehensive validation to ensure only proper MDS files are processed
 */

import { parseXml } from './xmlParser.js';

// Configuration constants
const VALIDATION_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: ['text/xml', 'application/xml'],
  ALLOWED_EXTENSIONS: ['.xml'],
  REQUIRED_MDS_ELEMENTS: [
    'A0100A', // National Provider Identifier (NPI)
    'A0100B', // CMS Certification Number (CCN)
    'A2300',  // Assessment reference date
    'I0020',  // Primary medical condition category
  ],
  MIN_GG_ELEMENTS_REQUIRED: 5, // Minimum number of GG elements needed for reliable imputation
  VALID_GG_VALUES: ['01', '02', '03', '04', '05', '06', '07', '09', '10', '88', '^', '-'],
  VALID_DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$|^\d{8}$/,
};

/**
 * Validation result object
 */
export class ValidationResult {
  constructor(isValid = true, errors = [], warnings = []) {
    this.isValid = isValid;
    this.errors = errors;
    this.warnings = warnings;
  }

  addError(message, code = null) {
    this.errors.push({ message, code });
    this.isValid = false;
  }

  addWarning(message, code = null) {
    this.warnings.push({ message, code });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  hasWarnings() {
    return this.warnings.length > 0;
  }
}

/**
 * Validates file type and basic properties
 */
export function validateFileType(file) {
  const result = new ValidationResult();

  // Check file size
  if (file.size > VALIDATION_CONFIG.MAX_FILE_SIZE) {
    result.addError(
      `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${VALIDATION_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`,
      'FILE_SIZE_EXCEEDED'
    );
  }

  // Check file extension
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!VALIDATION_CONFIG.ALLOWED_EXTENSIONS.includes(fileExtension)) {
    result.addError(
      `File extension '${fileExtension}' is not allowed. Only XML files are accepted.`,
      'INVALID_EXTENSION'
    );
  }

  // Check MIME type (if available)
  if (file.type && !VALIDATION_CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
    result.addWarning(
      `File MIME type '${file.type}' may not be correct. Expected XML format.`,
      'SUSPICIOUS_MIME_TYPE'
    );
  }

  return result;
}

/**
 * Validates XML structure and syntax
 */
export function validateXmlStructure(xmlString) {
  const result = new ValidationResult();

  try {
    // Check for XML declaration
    if (!xmlString.trim().startsWith('<?xml')) {
      result.addWarning(
        'File does not start with XML declaration. This may indicate a converted file.',
        'MISSING_XML_DECLARATION'
      );
    }

    // Check for PDF conversion indicators in raw content before parsing
    const pdfConversionPatterns = [
      { pattern: /iText.*xml/i, message: 'Contains iText conversion markers - this is a PDF converted to XML' },
      { pattern: /Created from PDF via Acrobat SaveAsXML/i, message: 'This file was created by converting a PDF to XML using Adobe Acrobat - not a proper MDS data file' },
      { pattern: /<TaggedPDF-doc>/i, message: 'This is a PDF converted to XML format, not structured MDS data' },
      { pattern: /MINIMUM DATA SET.*Version.*RESIDENT ASSESSMENT/i, message: 'Contains form text instead of structured data - likely a converted PDF' },
      { pattern: /____/g, message: 'Contains form field placeholders (____) - likely a converted PDF form' },
      { pattern: /□/g, message: 'Contains checkbox symbols (□) - likely a converted PDF form' },
      { pattern: /Enter Code.*01\. Admission assessment/m, message: 'Contains form instructions instead of data values' },
      { pattern: /Type of Assessment Enter Code/m, message: 'Contains form field instructions - likely a converted PDF' },
      { pattern: /Resident unable to respond|Resident declines to respond/i, message: 'Contains form response options - likely a converted PDF' },
      { pattern: /<ImageData src="images\/.*\.jpg"\/>/i, message: 'Contains image references - this is a PDF converted to XML' },
      { pattern: /<Lbl>.*<\/Lbl>/i, message: 'Contains label elements - this is a PDF form converted to XML' },
    ];

    pdfConversionPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(xmlString)) {
        result.addError(message, 'PDF_CONVERSION_DETECTED');
      }
    });

    // Check for excessive form-like content vs. structured XML
    const formIndicators = [
      'Enter Code',
      'Select one',
      'Check all that apply',
      '____',
      '□',
      'Resident unable to respond',
      'Resident declines to respond',
      'Type of Assessment',
      'Admission assessment',
      'Quarterly review assessment'
    ];
    
    const formIndicatorCount = formIndicators.reduce((count, indicator) => {
      return count + (xmlString.toLowerCase().includes(indicator.toLowerCase()) ? 1 : 0);
    }, 0);
    
    if (formIndicatorCount >= 4) {
      result.addError(
        'File contains multiple form field indicators - this appears to be a PDF form converted to XML, not structured MDS data',
        'FORM_CONVERSION_DETECTED'
      );
    }

    // Check for proper XML structure (should have opening/closing tags)
    const hasProperXmlStructure = /<[^>]+>.*<\/[^>]+>/s.test(xmlString);
    if (!hasProperXmlStructure && xmlString.length > 1000) {
      result.addError(
        'File does not contain proper XML structure with opening and closing tags - likely a converted document',
        'INVALID_XML_STRUCTURE'
      );
    }

    // Parse XML to check syntax
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      result.addError(
        'Invalid XML syntax. Please ensure the file is a valid XML document.',
        'XML_SYNTAX_ERROR'
      );
      return result;
    }

    // Check for root element
    if (!xmlDoc.documentElement) {
      result.addError(
        'XML file has no root element.',
        'NO_ROOT_ELEMENT'
      );
    } else {
      // Check for proper MDS root element
      const rootElementName = xmlDoc.documentElement.tagName;
      if (rootElementName !== 'ASSESSMENT' && rootElementName !== 'MDS') {
        result.addError(
          `XML file has root element '${rootElementName}' instead of 'ASSESSMENT' or 'MDS' - this is not a proper MDS data file`,
          'INVALID_ROOT_ELEMENT'
        );
      }
    }

  } catch (error) {
    result.addError(
      `XML parsing failed: ${error.message}`,
      'XML_PARSE_ERROR'
    );
  }

  return result;
}

/**
 * Validates MDS-specific content and structure
 */
export function validateMdsContent(parsedData) {
  const result = new ValidationResult();

  // Check item set code first to determine assessment type
  const itemSetCode = parsedData['ITM_SBST_CD'];
  if (itemSetCode) {
    if (itemSetCode !== 'NC' && itemSetCode !== 'NP') {
      const assessmentTypeDescriptions = {
        'NQ': 'Nursing home quarterly assessment',
        'ND': 'Nursing home discharge assessment', 
        'NT': 'Nursing home tracking record (entry/death record)',
        'SP': 'Swing bed PPS assessment',
        'SD': 'Swing bed discharge assessment',
        'ST': 'Swing bed tracking record (entry/death record)',
        'XX': 'Inactivation record (nursing home or swing bed)',
        'NPE': 'Nursing home PPS Part A Discharge (End of Stay)',
        'IPA': 'Interim payment assessment',
        'OSA': 'Other state assessment'
      };
      
      const assessmentDescription = assessmentTypeDescriptions[itemSetCode] || 'unknown assessment type';
      result.addError(
        `This is an ${itemSetCode} (${assessmentDescription}). Only NC (Nursing home comprehensive) and NP (Nursing home PPS) assessments are accepted for function score calculations.`,
        'INVALID_ASSESSMENT_TYPE'
      );
    }
  }

  // Check for required MDS elements
  const missingRequired = VALIDATION_CONFIG.REQUIRED_MDS_ELEMENTS.filter(
    element => !parsedData[element] || parsedData[element].trim() === ''
  );

  if (missingRequired.length > 0) {
    result.addError(
      `Missing required MDS elements: ${missingRequired.join(', ')}. This may not be a valid MDS file.`,
      'MISSING_REQUIRED_ELEMENTS'
    );
  }

  // Check if this is a discharge assessment based on ITM_SBST_CD
  if (itemSetCode === 'ND') {
    result.addError(
      'This is a discharge assessment file. Discharge assessments are not accepted for function score calculations.',
      'DISCHARGE_ASSESSMENT_DETECTED'
    );
  }

  // Check for minimum number of GG elements needed for reliable imputation
  const ggElements = Object.keys(parsedData).filter(key => 
    (key.startsWith('GG0130') || key.startsWith('GG0170')) && 
    key.endsWith('1')
  );
  
  if (ggElements.length < VALIDATION_CONFIG.MIN_GG_ELEMENTS_REQUIRED) {
    result.addError(
      `Insufficient GG function elements found (${ggElements.length} of minimum ${VALIDATION_CONFIG.MIN_GG_ELEMENTS_REQUIRED} required). This file may not have enough data for reliable function score calculations.`,
      'INSUFFICIENT_GG_ELEMENTS'
    );
  }

  // Validate GG element values for the elements that are present
  // Exclude wheelchair/scooter items (Q, RR, SS) as they use different scales
  const invalidGGValues = [];
  ggElements.forEach(element => {
    // Skip wheelchair/scooter items that don't use the 01-06 scale
    if (element.includes('Q') || element.includes('RR') || element.includes('SS')) {
      return;
    }
    
    const value = parsedData[element];
    if (value && !VALIDATION_CONFIG.VALID_GG_VALUES.includes(value)) {
      invalidGGValues.push(`${element}: ${value}`);
    }
  });

  if (invalidGGValues.length > 0) {
    result.addError(
      `Invalid GG function values found: ${invalidGGValues.join(', ')}. Values must be 01-06, 07, 09, 10, 88, ^ (not applicable), or - (dash).`,
      'INVALID_GG_VALUES'
    );
  }

  // Validate date format for A2300
  const ardDate = parsedData['A2300'];
  if (ardDate && !VALIDATION_CONFIG.VALID_DATE_PATTERN.test(ardDate)) {
    result.addError(
      `Invalid date format for A2300 (Assessment Reference Date): '${ardDate}'. Expected format: YYYY-MM-DD or YYYYMMDD`,
      'INVALID_DATE_FORMAT'
    );
  }

  // Validate A0310A (Type of Assessment)
  const assessmentType = parsedData['A0310A'];
  if (assessmentType && assessmentType !== '01' && assessmentType !== '99') {
    const assessmentTypeDescriptions = {
      '01': 'Admission assessment (required by day 14)',
      '02': 'Quarterly review assessment',
      '03': 'Annual assessment',
      '04': 'Significant change in status assessment',
      '05': 'Significant correction to prior comprehensive assessment',
      '06': 'Significant correction to prior quarterly assessment',
      '99': 'None of the above'
    };
    
    const assessmentDescription = assessmentTypeDescriptions[assessmentType] || 'unknown assessment type';
    result.addError(
      `Invalid assessment type A0310A: '${assessmentType}' (${assessmentDescription}). Only admission assessments (01) or none of the above (99) are accepted for function score calculations.`,
      'INVALID_ASSESSMENT_TYPE_A0310A'
    );
  }

  // Check for suspicious content patterns (PDF conversion indicators)
  const suspiciousPatterns = [
    { pattern: /<page>/i, message: 'Contains page elements - may be a PDF converted to XML' },
    { pattern: /<text>/i, message: 'Contains text elements - may be a PDF converted to XML' },
    { pattern: /<font>/i, message: 'Contains font elements - may be a PDF converted to XML' },
    { pattern: /<image>/i, message: 'Contains image elements - may be a PDF converted to XML' },
    // New patterns for form-based conversions
    { pattern: /____/g, message: 'Contains form field placeholders (____) - likely a converted PDF form' },
    { pattern: /□/g, message: 'Contains checkbox symbols (□) - likely a converted PDF form' },
    { pattern: /Enter Code/g, message: 'Contains "Enter Code" instructions - likely a converted PDF form' },
    { pattern: /iText.*xml/i, message: 'Contains iText conversion markers - this is a PDF converted to XML' },
    { pattern: /MINIMUM DATA SET.*Version.*RESIDENT ASSESSMENT/i, message: 'Contains form text instead of structured data - likely a converted PDF' },
    { pattern: /Type of Assessment Enter Code.*01\. Admission assessment/m, message: 'Contains form instructions instead of data values' },
  ];

  // Convert parsed data to string for pattern matching
  const dataString = JSON.stringify(parsedData);
  
  suspiciousPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(dataString)) {
      result.addError(message, 'SUSPICIOUS_CONTENT_PATTERN');
    }
  });

  // Additional check: Look for excessive form-like text vs. structured data
  const formIndicators = [
    'Enter Code',
    'Select one',
    'Check all that apply',
    '____',
    '□',
    'Resident unable to respond',
    'Resident declines to respond'
  ];
  
  const formIndicatorCount = formIndicators.reduce((count, indicator) => {
    return count + (dataString.toLowerCase().includes(indicator.toLowerCase()) ? 1 : 0);
  }, 0);
  
  if (formIndicatorCount >= 3) {
    result.addError(
      'File contains multiple form field indicators - this appears to be a PDF form converted to XML, not structured MDS data',
      'FORM_CONVERSION_DETECTED'
    );
  }

  // Check for minimum data completeness
  const totalElements = Object.keys(parsedData).length;
  if (totalElements < 50) {
    result.addWarning(
      `File contains only ${totalElements} data elements. A complete MDS file typically contains 100+ elements.`,
      'INCOMPLETE_MDS_DATA'
    );
  }

  // Check for proper MDS data structure vs. form text
  const parsedDataString = JSON.stringify(parsedData);
  const hasActualMdsData = /A0100A|A0100B|A2300|I0020|GG0130|GG0170/.test(parsedDataString);
  const hasFormText = /Enter Code|Select one|Check all that apply|____|□/.test(parsedDataString);
  
  if (hasFormText && !hasActualMdsData) {
    result.addError(
      'File contains form instructions but no actual MDS data values - this is likely a converted PDF form',
      'FORM_WITHOUT_DATA'
    );
  }

  // Check for proper MDS element naming pattern
  const mdsElementPattern = /^[A-Z][0-9]{4}[A-Z]?[0-9]?$/;
  const actualMdsElements = Object.keys(parsedData).filter(key => mdsElementPattern.test(key));
  
  if (actualMdsElements.length < 10) {
    result.addError(
      `File contains only ${actualMdsElements.length} proper MDS elements. A valid MDS file should contain many elements with codes like A0100A, GG0130A1, etc.`,
      'INSUFFICIENT_MDS_ELEMENTS'
    );
  }

  return result;
}

/**
 * Comprehensive file validation combining all checks
 */
export async function validateMdsFile(file) {
  const result = new ValidationResult();

  // Step 1: File type validation
  const fileTypeResult = validateFileType(file);
  result.errors.push(...fileTypeResult.errors);
  result.warnings.push(...fileTypeResult.warnings);
  result.isValid = result.isValid && fileTypeResult.isValid;

  if (fileTypeResult.hasErrors()) {
    return result;
  }

  try {
    // Step 2: Read file content
    const xmlString = await file.text();

    // Step 3: XML structure validation
    const xmlResult = validateXmlStructure(xmlString);
    result.errors.push(...xmlResult.errors);
    result.warnings.push(...xmlResult.warnings);
    result.isValid = result.isValid && xmlResult.isValid;

    if (xmlResult.hasErrors()) {
      return result;
    }

    // Step 4: Parse XML and validate MDS content
    // Use shared parseXml utility to avoid code duplication
    const parsedData = parseXml(xmlString);

    // Step 5: MDS content validation
    const mdsResult = validateMdsContent(parsedData);
    result.errors.push(...mdsResult.errors);
    result.warnings.push(...mdsResult.warnings);
    result.isValid = result.isValid && mdsResult.isValid;

  } catch (error) {
    result.addError(
      `File processing failed: ${error.message}`,
      'FILE_PROCESSING_ERROR'
    );
  }

  return result;
}

/**
 * Generates user-friendly error messages
 */
export function generateUserFriendlyMessage(validationResult) {
  if (validationResult.isValid) {
    return {
      type: 'success',
      title: 'File Validated Successfully',
      message: 'Your MDS XML file has been validated and is ready for processing.',
      warnings: validationResult.warnings
    };
  }

  const error = validationResult.errors[0]; // Show first error
  const warning = validationResult.warnings[0]; // Show first warning if no errors

  const messages = {
    FILE_SIZE_EXCEEDED: {
      type: 'error',
      title: 'File Too Large',
      message: 'The uploaded file is too large. Please ensure your MDS file is under 10MB.',
      suggestion: 'Try compressing the file or contact support if this is a legitimate large MDS file.'
    },
    INVALID_EXTENSION: {
      type: 'error',
      title: 'Invalid File Type',
      message: 'Only XML files are accepted. Please upload a proper MDS XML file.',
      suggestion: 'Export your MDS data as XML from your EMR system, not as PDF or other formats.'
    },
    SUSPICIOUS_MIME_TYPE: {
      type: 'warning',
      title: 'File Type Warning',
      message: 'The file type may not be correct. Please ensure this is an XML file.',
      suggestion: 'If you converted a PDF to XML, this will not work. You need the original XML export from your EMR.'
    },
    XML_SYNTAX_ERROR: {
      type: 'error',
      title: 'Invalid XML Format',
      message: 'The file contains invalid XML syntax and cannot be processed.',
      suggestion: 'Please export a fresh XML file from your EMR system.'
    },
    MISSING_REQUIRED_ELEMENTS: {
      type: 'error',
      title: 'Not a Valid MDS File',
      message: 'This file is missing required MDS data elements.',
      suggestion: 'Please ensure you are uploading a complete MDS assessment file exported from your EMR system.'
    },
    INSUFFICIENT_GG_ELEMENTS: {
      type: 'error',
      title: 'Insufficient Function Data',
      message: 'This file does not have enough function assessment (GG) elements for reliable calculations.',
      suggestion: 'Please ensure your MDS file includes sufficient function assessments. The imputation system requires a minimum number of GG elements to work effectively.'
    },
    INVALID_GG_VALUES: {
      type: 'error',
      title: 'Invalid Function Scores',
      message: 'The file contains invalid function assessment scores.',
      suggestion: 'Please check that all GG items have valid scores (01-06, 07, 09, 10, 88, ^ for not applicable, or - for dash) in your EMR system.'
    },
    INVALID_DATE_FORMAT: {
      type: 'error',
      title: 'Invalid Date Format',
      message: 'The assessment reference date is not in the correct format.',
      suggestion: 'Please ensure your EMR system exports dates in YYYY-MM-DD or YYYYMMDD format.'
    },
    SUSPICIOUS_CONTENT_PATTERN: {
      type: 'error',
      title: 'File Appears to be Converted',
      message: 'This file appears to be a PDF or other document converted to XML format.',
      suggestion: 'Please export the original XML file directly from your EMR system, not a converted document.'
    },
    PDF_CONVERSION_DETECTED: {
      type: 'error',
      title: 'PDF Conversion Detected',
      message: 'This file contains clear indicators that it was converted from a PDF form.',
      suggestion: 'You need to export the original structured XML data from your EMR system, not convert a PDF form to XML.'
    },
    FORM_CONVERSION_DETECTED: {
      type: 'error',
      title: 'Form Conversion Detected',
      message: 'This file contains multiple form field indicators and appears to be a converted PDF form.',
      suggestion: 'Please export the actual MDS data as XML from your EMR system, not a PDF form that has been converted.'
    },
    INVALID_XML_STRUCTURE: {
      type: 'error',
      title: 'Invalid XML Structure',
      message: 'This file does not contain proper XML structure with opening and closing tags.',
      suggestion: 'Please ensure you are uploading a properly formatted XML file exported from your EMR system.'
    },
    FORM_WITHOUT_DATA: {
      type: 'error',
      title: 'Form Without Data',
      message: 'This file contains form instructions but no actual MDS data values.',
      suggestion: 'You need to export the actual patient data from your EMR system, not just the form template.'
    },
    INSUFFICIENT_MDS_ELEMENTS: {
      type: 'error',
      title: 'Not a Valid MDS File',
      message: 'This file does not contain enough proper MDS data elements.',
      suggestion: 'Please ensure you are uploading a complete MDS assessment file with actual patient data, not a form template.'
    },
    INVALID_ROOT_ELEMENT: {
      type: 'error',
      title: 'Invalid File Format',
      message: 'This file does not have the correct root element for an MDS data file.',
      suggestion: 'Please export the actual MDS data as XML from your EMR system, not a converted PDF or other document format.'
    },
    INVALID_ASSESSMENT_TYPE: {
      type: 'error',
      title: 'Invalid Assessment Type',
      message: 'This assessment type is not supported for function score calculations.',
      suggestion: 'Please upload an NC (Nursing home comprehensive) or NP (Nursing home PPS) assessment from your EMR system.'
    },
    FILE_PROCESSING_ERROR: {
      type: 'error',
      title: 'File Processing Failed',
      message: 'An error occurred while processing your file.',
      suggestion: 'Please try uploading the file again or contact support if the problem persists.'
    }
  };

  // For INVALID_ASSESSMENT_TYPE, use the detailed error message instead of generic one
  if (error.code === 'INVALID_ASSESSMENT_TYPE') {
    return {
      type: 'error',
      title: 'Invalid Assessment Type',
      message: error.message,
      suggestion: 'Please upload an NC (Nursing home comprehensive) or NP (Nursing home PPS) assessment from your EMR system.'
    };
  }

  // For INVALID_ASSESSMENT_TYPE_A0310A, use the detailed error message
  if (error.code === 'INVALID_ASSESSMENT_TYPE_A0310A') {
    return {
      type: 'error',
      title: 'Invalid Assessment Type',
      message: error.message,
      suggestion: 'Please upload an admission assessment (A0310A = 01) or an assessment with "none of the above" (A0310A = 99) from your EMR system.'
    };
  }

  return messages[error.code] || {
    type: 'error',
    title: 'Validation Error',
    message: error.message,
    suggestion: 'Please check your file and try again.'
  };
}