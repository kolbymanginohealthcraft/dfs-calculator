# Future Improvements

Opportunities identified but deferred for a future session.

---

## 1. Component Tests (React Testing Library)

No React component tests exist yet. The current test suite covers calculations, coefficient loading, and data transformations, but not UI behavior. Adding tests for key components (file upload flow, score display, mode switching) would catch regressions earlier.

## 2. API Endpoint Integration Tests

The C# backend has unit tests for its calculation and imputation logic, but no integration tests that exercise the full HTTP request/response cycle through the controllers. These would verify request validation, serialization, auth gating, and error handling end-to-end.

## 3. Coverage Reporting

Neither the Vitest nor xUnit test suites have coverage reporting configured. Adding `--coverage` to the test scripts and setting a baseline threshold would help track test health over time.
