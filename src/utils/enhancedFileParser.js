/**
 * Enhanced file parser with comprehensive validation
 * Integrates with the existing fileParser.js but adds validation layer
 */

import { validateMdsFile, generateUserFriendlyMessage } from './fileValidation';
import { handleFileUpload as originalHandleFileUpload } from './fileParser';

/**
 * Enhanced file upload handler with validation
 */
export async function handleFileUploadWithValidation(
  file,
  setFileName,
  setParsedValues,
  setGroupedSections,
  setModeledValues,
  setStartScores,
  setImputedItems,
  setValidationError = null,
  setValidationWarning = null
) {
  try {
    // Clear any previous validation messages
    if (setValidationError) setValidationError(null);
    if (setValidationWarning) setValidationWarning(null);

    // Perform comprehensive validation
    const validationResult = await validateMdsFile(file);

    // Generate user-friendly messages
    const userMessage = generateUserFriendlyMessage(validationResult);

    // Handle validation results
    if (!validationResult.isValid) {
      // Show error message
      if (setValidationError) {
        setValidationError({
          title: userMessage.title,
          message: userMessage.message,
          suggestion: userMessage.suggestion,
          type: userMessage.type
        });
      }
      return false; // Stop processing
    }

    // Show warnings if any
    if (validationResult.hasWarnings() && setValidationWarning) {
      setValidationWarning({
        title: 'File Validation Warnings',
        warnings: validationResult.warnings.map(w => w.message),
        type: 'warning'
      });
    }

    // If validation passes, proceed with original file processing
    await originalHandleFileUpload(
      file,
      setFileName,
      setParsedValues,
      setGroupedSections,
      setModeledValues,
      setStartScores,
      setImputedItems
    );

    return true; // Success

  } catch (error) {
    console.error('File upload error:', error);
    
    if (setValidationError) {
      setValidationError({
        title: 'Upload Failed',
        message: 'An unexpected error occurred while processing your file.',
        suggestion: 'Please try uploading the file again or contact support if the problem persists.',
        type: 'error'
      });
    }
    
    return false;
  }
}

/**
 * Validates file before upload (for immediate feedback)
 */
export async function validateFileBeforeUpload(file) {
  try {
    const validationResult = await validateMdsFile(file);
    return generateUserFriendlyMessage(validationResult);
  } catch (error) {
    return {
      type: 'error',
      title: 'Validation Failed',
      message: 'Unable to validate file. Please try again.',
      suggestion: 'Ensure the file is not corrupted and try uploading again.'
    };
  }
}
