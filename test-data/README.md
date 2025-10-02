# Test Data Directory

This directory contains test files and examples used for development and validation testing.

## Examples Directory

The `examples/` subdirectory contains sample MDS XML files used during development:

### Files

- **`GOOD_EXAMPLE.xml`** - A valid MDS XML file that passes all validation checks
  - Used to test successful file processing
  - Contains proper MDS structure and required elements
  - Demonstrates correct XML formatting and content

- **`BAD_EXAMPLE.xml`** - An invalid MDS XML file that fails validation
  - Used to test error handling and validation messages
  - Contains formatting issues or missing required elements
  - Helps ensure proper error reporting to users

### Purpose

These files were created during development to:
- Test file validation logic
- Develop appropriate error messages
- Ensure proper handling of both valid and invalid uploads
- Provide examples for documentation

### Usage

These files are **not referenced by the application code** - they are purely development artifacts that can be used for:
- Manual testing during development
- Documentation examples
- Regression testing
- Understanding expected file formats

## Note

These files may contain sample patient data for testing purposes. Ensure proper data handling practices when using them in development environments.
