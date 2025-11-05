/**
 * Input Validation Utility
 * 
 * Validates and sanitizes API request inputs
 */

/**
 * Validate calculation request body
 * @param {object} body - Request body to validate
 * @throws {Error} - If validation fails
 */
export function validateCalculationRequest(body) {
  const errors = [];
  
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a valid JSON object');
  }
  
  // Validate parsedValues
  if (!body.parsedValues || typeof body.parsedValues !== 'object') {
    errors.push('parsedValues must be an object');
  }
  
  // Validate summary
  if (!body.summary || typeof body.summary !== 'object') {
    errors.push('summary must be an object');
  }
  
  // Validate icdList
  if (!Array.isArray(body.icdList)) {
    errors.push('icdList must be an array');
  } else if (body.icdList.length > 100) {
    errors.push('icdList cannot exceed 100 items');
  }
  
  // Validate startScores
  if (!body.startScores || typeof body.startScores !== 'object') {
    errors.push('startScores must be an object');
  }
  
  // Validate ARD date format (optional)
  if (body.ardDate && !/^\d{4}-\d{2}-\d{2}$|^\d{8}$/.test(body.ardDate)) {
    errors.push('ardDate must be in YYYY-MM-DD or YYYYMMDD format');
  }
  
  // Validate manualOverrides if provided
  if (body.manualOverrides && typeof body.manualOverrides !== 'object') {
    errors.push('manualOverrides must be an object');
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return true;
}

/**
 * Validate imputation request body
 * @param {object} body - Request body to validate
 * @throws {Error} - If validation fails
 */
export function validateImputationRequest(body) {
  const errors = [];
  
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a valid JSON object');
  }
  
  // Check if it's a batch request
  if (body.targetGGItems) {
    // Batch request
    if (typeof body.targetGGItems !== 'object') {
      errors.push('targetGGItems must be an object');
    } else {
      const itemCount = Object.keys(body.targetGGItems).length;
      if (itemCount > 50) {
        errors.push('targetGGItems cannot exceed 50 items');
      }
    }
  } else {
    // Single item request
    if (!body.ggItemId || typeof body.ggItemId !== 'string') {
      errors.push('ggItemId must be a string');
    }
  }
  
  // Common validations
  if (!body.parsedValues || typeof body.parsedValues !== 'object') {
    errors.push('parsedValues must be an object');
  }
  
  if (!body.summary || typeof body.summary !== 'object') {
    errors.push('summary must be an object');
  }
  
  if (!Array.isArray(body.icdList)) {
    errors.push('icdList must be an array');
  } else if (body.icdList.length > 100) {
    errors.push('icdList cannot exceed 100 items');
  }
  
  if (!body.startScores || typeof body.startScores !== 'object') {
    errors.push('startScores must be an object');
  }
  
  if (body.ardDate && !/^\d{4}-\d{2}-\d{2}$|^\d{8}$/.test(body.ardDate)) {
    errors.push('ardDate must be in YYYY-MM-DD or YYYYMMDD format');
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return true;
}

/**
 * Check request size
 * @param {number} contentLength - Content-Length header value
 * @param {number} maxSize - Maximum size in bytes (default: 10MB)
 * @throws {Error} - If size exceeds limit
 */
export function validateRequestSize(contentLength, maxSize = 10 * 1024 * 1024) {
  if (contentLength && parseInt(contentLength) > maxSize) {
    throw new Error(`Request body exceeds maximum size limit of ${maxSize / (1024 * 1024)}MB`);
  }
}

