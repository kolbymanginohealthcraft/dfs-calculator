# Future Improvements

Items identified during the February 2026 codebase cleanup but deferred for a future session.

---

## ~~1. CSS Normalization~~ (Completed Feb 2026)

All plain `.css` component files have been converted to `.module.css` with scoped `className={styles.xxx}` references. The only remaining global CSS files are `src/index.css` and `src/basic/index.css`, which intentionally define `:root` variables, element-level resets, and shared utility classes. Shared layout styles in `BasicLayout.module.css` are imported as a module by each component that uses them.

---

## 2. ~~Long-Term Testing Strategy~~ (COMPLETED — February 2026)

**Implemented in both tracks:**

- **Frontend (Vitest):** 49 tests across `calculations.test.js` and `coefficientLoader.test.js`. Run with `npm test` (now uses `vitest run`). Legacy scripts available via `npm run test:legacy` and `npm run test:transformers`.
- **C# backend (xUnit):** 57 tests across `CalculationsTests.cs`, `ImputationsTests.cs`, and `CoefficientLoaderTests.cs`. Run with `dotnet test` from `Aegis.DfsCalculator/`. Solution file `Aegis.DfsCalculator.sln` ties both projects together.

**What was added:**
- Vitest configured in `vite.config.js` (`test` block), test files in `src/utils/__tests__/`.
- xUnit test project at `Aegis.DfsCalculator/DFSCalculator.Server.Tests/` with a shared `DataDirectoryFixture` for JSON data file access.
- Tests cover: score resolution, date formatting, age calculation, mobility type detection, function score computation, coefficient version selection, covariate extraction (age, BMI, cognition, communication, continence, prior functioning, medical conditions), imputation exclusion rules, threshold loading, imputed value ranges, batch imputation, and imputation analysis.

**Remaining opportunities:** Component tests with Testing Library, API endpoint integration tests, and coverage reporting.
