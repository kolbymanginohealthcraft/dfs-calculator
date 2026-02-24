# Cleanup and Optimization Guide

## Overview

This guide covers cleanup tasks and performance optimizations for the DFS Calculator application after the C# backend migration.

## Cleanup Tasks

### 1. Duplicate Frontend Folder ⚠️

**Location:** `Aegis.DfsCalculator/dfscalculator.client/`

**Status:** NOT USED - This was copied by Hannah when setting up Visual Studio

**What it is:**
- Complete duplicate of your root-level frontend (`src/`, `public/`, `scripts/`)
- Contains its own `node_modules/`, `package.json`, etc.
- Referenced in `DFSCalculator.Server.csproj` but not actively used

**Why it exists:**
- Visual Studio SPA proxy configuration expects a client folder
- Hannah copied your frontend to set up the .NET solution structure
- You run frontend separately with `npm run dev`, so this isn't needed

**Can it be removed?**
- **Yes, but with caution:**
  - The C# project file references it (`<SpaRoot>..\dfscalculator.client</SpaRoot>`)
  - IT might use it in production builds
  - Check with IT before deleting

**Recommendation:**
1. **Ask IT** if they use this folder for production builds
2. If not, remove it and update `.csproj` file
3. If yes, keep it but document that you don't use it

**To remove (after IT confirmation):**
```bash
# 1. Remove the folder
Remove-Item -Recurse -Force "Aegis.DfsCalculator\dfscalculator.client"

# 2. Update DFSCalculator.Server.csproj (remove SpaRoot and ProjectReference)
```

### 2. Legacy API Functions

**Location:** `api/` folder (root level)

**Status:** May not be needed anymore

**What it is:**
- Old Vercel serverless functions
- Used before C# migration
- Now handled by C# backend

**Check if needed:**
- `api/facility-name/` - Facility lookup (may still be used)
- `api/calculate/` - Calculation endpoints (replaced by C# backend)
- `api/auth/` - Auth endpoints (replaced by C# SAML)

**Recommendation:**
- Review which endpoints are still called
- Remove unused endpoints
- Keep `api/facility-name/` if frontend still uses it

### 3. Unused Dependencies

**Check for:**
- `papaparse` - CSV parsing (may not be needed if using JSON)
- `express` - Dev dependency (may not be needed)
- `cors` - Dev dependency (may not be needed)

**To check:**
```bash
# See what's actually imported
grep -r "import.*papaparse" src/
grep -r "require.*papaparse" src/
```

**To remove:**
```bash
npm uninstall papaparse  # if not used
```

### 4. Build Artifacts

**Locations:**
- `dist/` - Production build (gitignored, but check if committed)
- `Aegis.DfsCalculator/DFSCalculator.Server/bin/` - C# build artifacts
- `Aegis.DfsCalculator/DFSCalculator.Server/obj/` - C# build artifacts

**Status:** Should be gitignored (check `.gitignore`)

## Performance Optimizations

### 1. Large Data File Loading ⚡

**Current State:**
- ICD-10 lookup: ~2 MB JSON file loaded on app start
- Coefficients: ~300 KB bundled in main bundle
- MDS lookup: ~100 KB bundled

**Optimizations:**

#### A. Lazy Load ICD-10 Lookup
**Current:** Loads immediately when component mounts
**Optimization:** Load only when needed (when viewing diagnoses)

```javascript
// Current: src/utils/useICD10Lookup.js
// Already lazy loaded via useEffect, but loads on first component mount

// Better: Load only when user views diagnosis codes
const useICD10Lookup = () => {
  const [lookup, setLookup] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const loadLookup = useCallback(async () => {
    if (lookup) return lookup; // Already loaded
    
    setLoading(true);
    const data = await fetch('/icd10_lookup_2026.json').then(r => r.json());
    setLookup(data);
    setLoading(false);
    return data;
  }, [lookup]);
  
  return { lookup, loading, loadLookup };
};
```

#### B. Code Split Large Dependencies
**Current:** All dependencies bundled together
**Optimization:** Lazy load heavy libraries

```javascript
// Instead of:
import html2pdf from 'html2pdf.js';

// Use:
const exportPDF = async () => {
  const html2pdf = (await import('html2pdf.js')).default;
  // Use it
};
```

**Already implemented:**
- ✅ Recharts (lazy loaded in components)
- ✅ html2pdf (could be improved)

### 2. File Upload Performance 🚀

**Current Issues:**
- Large XML files parsed synchronously
- All data loaded into memory at once
- No progress indication for large files

**Optimizations:**

#### A. Stream Processing
```javascript
// Process file in chunks instead of loading all at once
// Use FileReader with chunked reading
```

#### B. Web Workers
```javascript
// Move XML parsing to Web Worker
// Keeps UI responsive during parsing
```

#### C. Progress Indicators
```javascript
// Show parsing progress for large files
// Use FileReader progress events
```

### 3. Component Rendering Performance ⚡

**Current:**
- Some heavy components render on initial load
- Large lists render all items at once

**Optimizations:**

#### A. Virtual Scrolling
```javascript
// For long lists (diagnoses, covariates)
// Only render visible items
```

#### B. Memoization
```javascript
// Use React.memo for expensive components
// Use useMemo for expensive calculations
```

**Already implemented:**
- ✅ Lazy loading for heavy components (MdsSnapshot, Covariates, etc.)
- ✅ Suspense boundaries

### 4. Bundle Size Optimization 📦

**Current Bundle:**
- Main: ~1.5 MB (384 KB gzipped)
- Charts: 159 KB (53 KB gzipped)
- PDF: 202 KB (48 KB gzipped)

**Optimizations:**

#### A. Tree Shaking
```javascript
// Import only what you need
import { specificFunction } from 'library';
// Instead of:
import * from 'library';
```

#### B. Manual Chunks (Already Configured)
```javascript
// vite.config.js already has:
manualChunks: {
  'vendor-charts': ['recharts'],
  'vendor-pdf': ['html2pdf.js', 'html2canvas']
}
```

#### C. Remove Unused Code
- Remove commented-out code
- Remove unused imports
- Remove unused dependencies

### 5. Network Optimization 🌐

**Current:**
- ICD-10 lookup fetched on every page load
- No caching strategy

**Optimizations:**

#### A. Browser Caching
```javascript
// Set cache headers for static assets
// Use service worker for offline support
```

#### B. Request Deduplication
```javascript
// Prevent multiple requests for same resource
// Use request cache/memoization
```

## Implementation Priority

### High Priority (Do First)
1. ✅ Remove duplicate frontend (after IT confirmation)
2. ✅ Lazy load ICD-10 lookup only when needed
3. ✅ Remove unused dependencies
4. ✅ Optimize file upload with progress indicators

### Medium Priority
1. Move XML parsing to Web Worker
2. Add virtual scrolling for long lists
3. Implement request caching
4. Add service worker for offline support

### Low Priority (Nice to Have)
1. Split ICD-10 lookup by code range
2. Implement streaming file processing
3. Add performance monitoring

## Performance Metrics to Track

### Before Optimization
- Initial load time: ~2.1s
- Time to interactive: ~2.3s
- Bundle size: ~500 KB gzipped
- File upload time: (measure)

### Target Metrics
- Initial load time: < 1.5s
- Time to interactive: < 2s
- Bundle size: < 400 KB gzipped
- File upload time: < 1s for typical files

## Testing Performance

### Tools
- Chrome DevTools Performance tab
- Lighthouse (built into Chrome)
- Bundle analyzer: `npm run build -- --analyze`

### What to Test
1. Initial page load
2. File upload (small and large files)
3. Navigation between pages
4. Calculation performance
5. Export performance

## Next Steps

1. **Review with IT** - Confirm duplicate client folder can be removed
2. **Implement high-priority optimizations** - Start with lazy loading
3. **Measure performance** - Establish baseline metrics
4. **Iterate** - Continue optimizing based on measurements

---

**Last Updated:** January 2025
