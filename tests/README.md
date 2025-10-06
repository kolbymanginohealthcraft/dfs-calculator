# Tests

## Overview

This directory contains test scripts for validating the DFS Viewer functionality.

## Available Tests

### 1. Version Selection Test

**File:** `version-selection.test.cjs`

**Purpose:** Validates that the coefficient version selection logic works correctly across different fiscal years.

**Run:**
```bash
node tests/version-selection.test.cjs
```

**What it tests:**
- FY 2023 assessments use Update ID 1
- FY 2025 assessments use Update ID 2
- FY 2026 assessments use Update ID 3
- Boundary dates (10/01/2024, 10/01/2025) map correctly
- Both date formats (YYYYMMDD and YYYY-MM-DD) work
- Missing dates default to latest version
- Model intercepts match expected values

**Expected output:**
```
✅ All tests passed
```

### 2. Data Transformations Test

**File:** `transformations.test.cjs`

**Purpose:** Validates that data transformation scripts generate correct output files.

**Run:**
```bash
node tests/transformations.test.cjs
```

**What it tests:**
- All transformer scripts exist
- Generated files are created
- File sizes are reasonable
- JSON files are valid
- Required data structures exist

**Expected output:**
```
✅ All transformation tests passed
```

## Running All Tests

```bash
# Run individually
node tests/version-selection.test.cjs
node tests/transformations.test.cjs

# Or create a test runner (future enhancement)
npm test
```

## Test Data

Sample MDS files for manual testing are located in `test-data/examples/`:
- `GOOD_EXAMPLE.xml` - Valid MDS 3.0 assessment
- `BAD_EXAMPLE.xml` - Invalid file for error handling

## Future Enhancements

Potential test additions:
- [ ] Unit tests for calculation functions
- [ ] Integration tests for MDS parsing
- [ ] Component tests (React Testing Library)
- [ ] E2E tests (Playwright/Cypress)
- [ ] Performance benchmarks
- [ ] Bundle size tracking

## CI/CD Integration

These tests can be integrated into a CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: |
    node tests/version-selection.test.cjs
    node tests/transformations.test.cjs
```

## Notes

- Tests use CommonJS (`.cjs`) format to avoid ES module complications
- Tests are standalone and don't require build step
- No external test framework dependencies (pure Node.js)
