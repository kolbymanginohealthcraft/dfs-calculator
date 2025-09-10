/**
 * Utility functions for redacting sensitive information while preserving some readability
 */

/**
 * Partially redacts a name by showing the first letter and replacing the rest with asterisks
 * @param {string} name - The name to redact
 * @param {number} minLength - Minimum length to show (default: 3)
 * @returns {string} - Partially redacted name
 */
export function redactName(name) {
  if (!name || typeof name !== 'string') {
    return 'REDACTED';
  }
  
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return 'REDACTED';
  }
  
  // Show first letter and replace rest with asterisks
  const firstLetter = trimmedName.charAt(0).toUpperCase();
  const asterisks = '*'.repeat(Math.max(2, trimmedName.length - 1));
  
  return `${firstLetter}${asterisks}`;
}

/**
 * Partially redacts a full name (first and last name)
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} - Partially redacted full name
 */
export function redactFullName(firstName, lastName) {
  const redactedFirst = redactName(firstName);
  const redactedLast = redactName(lastName);
  
  return `${redactedFirst} ${redactedLast}`;
}

/**
 * Partially redacts facility information
 * @param {string} facilityName - Facility name
 * @returns {string} - Partially redacted facility name
 */
export function redactFacility(facilityName) {
  if (!facilityName || typeof facilityName !== 'string') {
    return 'REDACTED';
  }
  
  const trimmed = facilityName.trim();
  if (trimmed.length === 0) {
    return 'REDACTED';
  }
  
  // For facility names, show first 2-3 characters and redact the rest
  const visibleChars = Math.min(3, Math.max(2, Math.floor(trimmed.length / 3)));
  const visible = trimmed.substring(0, visibleChars);
  const asterisks = '*'.repeat(Math.max(3, trimmed.length - visibleChars));
  
  return `${visible}${asterisks}`;
}

/**
 * Partially redacts an address
 * @param {string} address - Address to redact
 * @returns {string} - Partially redacted address
 */
export function redactAddress(address) {
  if (!address || typeof address !== 'string') {
    return 'REDACTED';
  }
  
  const trimmed = address.trim();
  if (trimmed.length === 0) {
    return 'REDACTED';
  }
  
  // For addresses, show first few characters and redact the rest
  const visibleChars = Math.min(5, Math.max(3, Math.floor(trimmed.length / 4)));
  const visible = trimmed.substring(0, visibleChars);
  const asterisks = '*'.repeat(Math.max(5, trimmed.length - visibleChars));
  
  return `${visible}${asterisks}`;
}
