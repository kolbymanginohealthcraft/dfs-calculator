# Future Improvements

Items identified during the February 2026 codebase cleanup but deferred for a future session.

---

## 1. CSS Normalization

**Problem:** The project uses a mix of ~21 `.module.css` files (scoped styles via CSS Modules) and ~12 plain `.css` files (global styles). This inconsistency means some components use `className={styles.foo}` while others use `className="foo"`.

**What it involves:** Converting plain `.css` files to `.module.css` requires updating every `className="..."` string reference in the associated component to use the `styles.xxx` object pattern. It's not just a file rename — it's a JSX refactor for each component.

**Recommendation:** Only worth doing if you're planning significant UI work or encountering style collisions from global CSS leaking between components. Not a functional issue today.

---

## 2. Long-Term Testing Strategy

**Current state:** Two Node.js test scripts exist (`npm test` for coefficient version selection, `npm run test:transformers` for data pipeline). No test framework is installed. No unit tests for frontend utilities or C# algorithm code.

**Highest-value targets:**

- **C# algorithms (xUnit):** `Calculations.cs` and `Imputations.cs` contain proprietary logic tied to CMS regulatory methodology. Unit tests with known MDS inputs and expected outputs would guard against regressions during annual coefficient updates.
- **Frontend utilities (Vitest):** `coefficientLoader.js`, `fileParser.js`, and `calculations.js` are the most critical client-side utilities. Vitest integrates natively with Vite (zero config).

**What it involves:**
- **Frontend:** Install Vitest, configure it with the existing Vite setup, write unit tests for utility functions, and optionally add component tests with Testing Library.
- **C# backend:** Add an xUnit test project to the solution, reference `DFSCalculator.Server`, and write tests against the algorithm classes with known inputs/outputs.

**Recommendation:** Start with the C# algorithm tests — they protect the most valuable and least replaceable code. Frontend utility tests are a natural second step.
