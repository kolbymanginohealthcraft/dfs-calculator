# Server-Side Migration Plan: Protecting Advanced Mode IP

**Status:** 📋 Planning Phase  
**Goal:** Move ALL calculations server-side while maintaining self-contained deployment and high performance

## Executive Summary

This plan migrates the DFS Calculator from client-side only to a fully server-side architecture where:
- **Basic Mode**: Server-side calculations with public token (public access)
- **Advanced Mode**: Server-side calculations with SSO authentication
- **Self-Contained**: No external database dependencies, uses existing JSON data files
- **High Performance**: Optimized for hundreds of file uploads and fast UI responses
- **HIPAA Compliant**: No data storage, maintains existing data clearing mechanisms

## Current Architecture Analysis

### Existing Client-Side Structure
```
Frontend (React)
├── Basic Mode: Manual score entry + client calculations
├── Advanced Mode: MDS XML processing + client calculations
├── Data Files: JSON coefficients (~300KB bundled)
└── Calculations: All scoring logic in browser (vulnerable)
```

### Current Access Control
- **Portal Detection**: `usePortal()` context checks URL referrer
- **Mode Switching**: `ModeBanner.jsx` controls Basic ↔ Advanced transitions
- **Vulnerability**: All logic exposed in browser, easily bypassed

### Existing Backend Infrastructure
- **Express Server**: `src/utils/server.js` (port 3001)
- **Vercel API**: `api/facility-name/[ccn].js` for CMS facility lookup
- **Data Sources**: JSON files in `src/data/` and `public/`

## Target Architecture

### New Server-Side Structure
```
Frontend (React)
├── Basic Mode: API calls with public token
├── Advanced Mode: API calls with SSO token
└── Authentication: Public token + SSO token validation

Backend (Express/Vercel)
├── Auth Middleware: Public token + SSO token validation
├── Calculation APIs: All scoring endpoints (Basic + Advanced)
├── Data Access: Same JSON files (server-side)
└── Public APIs: Basic calculations + facility lookup
```

## Migration Strategy

### Phase 1: Backend API Development

#### 1.1 Create Calculation Endpoints (All Server-Side)

**New API Routes:**
```javascript
// api/calculate/basic-score.js
POST /api/calculate/basic-score
- Input: Manual scores + public token
- Output: Basic DFS calculation
- Auth: Public token required

// api/calculate/advanced-score.js
POST /api/calculate/advanced-score
- Input: MDS XML data + SSO token
- Output: Calculated scores + covariates
- Auth: SSO token required

// api/calculate/imputation.js  
POST /api/calculate/imputation
- Input: GG item data + SSO token
- Output: Imputed values
- Auth: SSO token required

// api/calculate/end-score.js
POST /api/calculate/end-score
- Input: End scores + SSO token  
- Output: End score calculations
- Auth: SSO token required
```

#### 1.2 Server-Side Data Access

**Move JSON files to server:**
```javascript
// Backend data loading
import coefficients from '../data/coefficients-all-versions.json';
import mdsLookup from '../data/mds_item_lookup.json';
import icdToHcc from '../data/icdToHcc.json';
```

#### 1.3 Authentication Middleware

**Token validation for both public and SSO:**
```javascript
// middleware/auth.js
function validatePublicToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  // Validate public token (hardcoded or env var)
  // Allow access to basic calculations only
}

function validateSSOToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  // Validate with IT team's SSO system
  // Allow access to all calculations
}
```

### Phase 2: Frontend Refactoring

#### 2.1 Create API Service Layer

**New file: `src/utils/apiService.js`**
```javascript
// API service for all calculations (Basic + Advanced)
export class BasicAPIService {
  constructor() {
    this.publicToken = process.env.REACT_APP_PUBLIC_TOKEN;
    this.baseURL = '/api/calculate';
  }
  
  async calculateBasicScore(scores, mobilityType) {
    // Call server-side basic calculation
  }
}

export class AdvancedAPIService {
  constructor(authToken) {
    this.token = authToken;
    this.baseURL = '/api/calculate';
  }
  
  async calculateAdvancedScore(mdsData) {
    // Call server-side advanced calculation
  }
  
  async calculateImputation(ggItemData) {
    // Call server-side imputation
  }
}
```

#### 2.2 Update All Mode Components

**Modify existing components:**
- `BasicMode` components: Replace client calculations with API calls
- `AdvancedAppDetail.jsx`: Replace client calculations with API calls
- `AdvancedSummaryView.jsx`: Use server-side results
- `ImputationTab.jsx`: Call imputation API

#### 2.3 Maintain Data Clearing

**Preserve existing mechanisms:**
- File clearing on mode switch
- Data clearing on navigation
- Memory cleanup (already implemented)

### Phase 3: Authentication Integration

#### 3.1 SSO Token Handling

**Frontend token management:**
```javascript
// contexts/AuthContext.jsx
export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Token from myCare portal
  // Validation with backend
  // Token refresh handling
};
```

#### 3.2 Route Protection

**Update routing logic:**
```javascript
// Protected routes for Advanced mode
<Route path="/advanced/*" element={
  <ProtectedRoute>
    <AdvancedMode />
  </ProtectedRoute>
} />
```

## Performance Requirements

### Critical Performance Considerations
- **Hundreds of Files**: Advanced mode must handle bulk file processing
- **Snappy UI Response**: Real-time updates for score toggles and calculations
- **Immediate Updates**: Score changes must update bar charts instantly
- **Over/Under Calculations**: Real-time recalculation as scores change
- **Memory Efficiency**: No data storage, maintain existing memory management
- **Optimized APIs**: Lean serverless functions with minimal overhead
- **Caching Strategy**: Efficient data loading and coefficient access

### Performance Optimizations
- **Batch Processing**: Handle multiple files in single API calls
- **Efficient Data Loading**: Load coefficients once per request
- **Minimal Payloads**: Only send necessary data between client/server
- **Async Operations**: Non-blocking UI during calculations
- **Real-Time Updates**: Instant API calls for score toggles
- **Client-Side Caching**: Cache calculation results for immediate UI updates
- **Optimistic Updates**: Update UI immediately, then sync with server
- **Debounced API Calls**: Prevent excessive server requests during rapid changes
- **Error Handling**: Fast failure detection and user feedback
- **Bulk Upload Support**: Maintain ability to process hundreds of files
- **Memory Management**: Preserve existing data clearing mechanisms
- **Lean APIs**: Minimal serverless function overhead

## Implementation Details

### Backend API Structure

#### Calculation Endpoints
```javascript
// api/calculate/basic-score.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // 1. Validate public token
  const authResult = await validatePublicToken(req.headers.authorization);
  if (!authResult.valid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // 2. Extract basic scores
  const { scores, mobilityType } = req.body;
  
  // 3. Server-side basic calculation
  const result = calculateBasicScore(scores, mobilityType);
  
  // 4. Return results (no data storage)
  return res.json({ result });
}

// api/calculate/advanced-score.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // 1. Validate SSO token
  const authResult = await validateSSOToken(req.headers.authorization);
  if (!authResult.valid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // 2. Parse MDS data
  const { mdsXmlData } = req.body;
  const parsedValues = parseXml(mdsXmlData);
  
  // 3. Server-side calculations
  const covariates = getFunctionCovariates(parsedValues, ...);
  const scores = calculateFunctionScore(...);
  
  // 4. Return results (no data storage)
  return res.json({ scores, covariates });
}
```

#### Data File Access
```javascript
// Backend data loading (same files, server-side)
import coefficients from '../data/coefficients-all-versions.json';
import { getFunctionMultipliers } from '../utils/coefficientLoader.js';

// Use existing calculation logic
export function calculateAdvancedScore(parsedValues) {
  const ardDate = parsedValues['A2300'];
  const multipliers = getFunctionMultipliers(ardDate);
  // ... existing calculation logic
}
```

### Frontend Changes

#### API Service Integration
```javascript
// src/utils/apiService.js
export class ProtectedAPIService {
  constructor() {
    this.token = this.getAuthToken();
  }
  
  async calculateAdvancedScore(mdsData) {
    const response = await fetch('/api/calculate/advanced-score', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mdsXmlData: mdsData })
    });
    
    if (!response.ok) {
      throw new Error('Calculation failed');
    }
    
    return response.json();
  }
}
```

#### Component Updates
```javascript
// src/components/AdvancedAppDetail.jsx
const handleFileUpload = async (file) => {
  // Parse XML client-side (no sensitive data)
  const parsedValues = parseXml(xmlText);
  
  // Send to server for calculations
  const apiService = new ProtectedAPIService();
  const results = await apiService.calculateAdvancedScore(parsedValues);
  
  // Update UI with server results
  setScores(results.scores);
  setCovariates(results.covariates);
};

// Real-time score updates for immediate UI response
const handleScoreToggle = async (scoreType, newValue) => {
  // Update UI immediately for snappy response
  setScores(prev => ({ ...prev, [scoreType]: newValue }));
  
  // Recalculate on server in background
  const apiService = new BasicAPIService();
  const results = await apiService.calculateBasicScore(updatedScores, mobilityType);
  
  // Update charts and calculations with server results
  updateCharts(results);
  updateOverUnderCalculations(results);
};
```

## Shared Logic Protection

### Why Move Basic Mode Server-Side
Even though Basic mode is publicly accessible, the calculation logic contains:
- **Shared Algorithms**: Same core DFS calculation functions as Advanced mode
- **Business Logic**: Coefficient application and scoring rules
- **Mathematical Models**: Risk adjustment formulas and multipliers
- **Proprietary Methods**: CMS methodology implementation

### Protection Strategy
- **Public Token**: Basic mode uses a hardcoded public token for API access
- **Limited Scope**: Public token only allows basic score calculations
- **No Data Exposure**: Coefficient data never sent to client
- **Server-Only Logic**: All mathematical operations happen server-side

## Security Considerations

### What's Protected
- **All Calculation Logic**: Both Basic and Advanced scoring algorithms server-side
- **Coefficient Data**: JSON files not exposed to client
- **Imputation Logic**: Advanced calculations hidden
- **Business Rules**: All covariate processing server-side
- **Shared Logic**: Common calculation functions protected

### What Remains Client-Side
- **UI Components**: All React components
- **File Parsing**: XML parsing (no sensitive data)
- **Data Display**: Results presentation
- **Form Handling**: User input collection

### Authentication Flow

**Basic Mode (Public):**
1. **Frontend**: Uses hardcoded public token
2. **API Calls**: Include public token in headers
3. **Backend**: Validates public token
4. **Response**: Returns basic calculation results only

**Advanced Mode (SSO):**
1. **myCare Portal**: Provides SSO token
2. **Frontend**: Stores SSO token securely
3. **API Calls**: Include SSO token in headers
4. **Backend**: Validates token with IT's SSO system
5. **Response**: Returns all calculation results

## Data Flow Comparison

### Current (Client-Side)
```
User Input → Browser Calculate → Display Results
     ↓              ↓
  Form Data  →  All Logic  →  UI Update
```

### New (Server-Side)
```
User Input → API Call → Server Calculate → Display Results
     ↓           ↓            ↓
  Form Data  →  Token   →  All Logic  →  UI Update
```

## File Structure Changes

### New Backend Files
```
api/
├── calculate/
│   ├── basic-score.js
│   ├── advanced-score.js
│   ├── imputation.js
│   └── end-score.js
├── auth/
│   └── validate-token.js
└── facility-name/
    └── [ccn].js (existing)
```

### Modified Frontend Files
```
src/
├── utils/
│   ├── apiService.js (new)
│   └── calculations.js (move ALL logic to backend)
├── contexts/
│   └── AuthContext.jsx (new)
└── components/
    ├── BasicMode components (update all)
    ├── AdvancedAppDetail.jsx (update)
    └── AdvancedSummaryView.jsx (update)
```

## Deployment Considerations

### Deployment Configuration
- **Platform**: Bitbucket + Velocity (IT team's deployment platform)
- **Serverless Functions**: API routes in `api/` directory
- **Environment Variables**: SSO validation secrets + public token
- **CORS**: Configure for myCare portal domain
- **Timeout**: Ensure calculation endpoints have sufficient time
- **Performance**: Optimize for Velocity platform requirements

### Data Files
- **Coefficients**: Move from `src/data/` to `api/data/`
- **Lookups**: Move from `public/` to `api/data/`
- **Bundle Size**: Remove from frontend bundle

## Testing Strategy

### Unit Tests
- **API Endpoints**: Test calculation accuracy
- **Authentication**: Test token validation
- **Data Parsing**: Ensure XML parsing works server-side

### Integration Tests
- **End-to-End**: Full calculation flow
- **Error Handling**: Invalid tokens, malformed data
- **Performance**: API response times

### Manual Testing
- **Basic Mode**: Ensure unchanged functionality
- **Advanced Mode**: Verify server-side calculations
- **Mode Switching**: Test data clearing still works

## Rollback Plan

### If Issues Arise
1. **Feature Flag**: Toggle between client/server calculations
2. **Gradual Migration**: Move one calculation type at a time
3. **Fallback**: Keep client-side logic as backup

### Rollback Steps
1. Revert frontend to client-side calculations
2. Remove API endpoints
3. Restore original data file locations
4. Update routing to remove authentication

## Success Criteria

### Security Goals
- ✅ ALL calculations not accessible via browser console
- ✅ Coefficient data not exposed to client
- ✅ SSO authentication required for advanced features
- ✅ Public token required for basic calculations
- ✅ Shared calculation logic protected server-side

### Functionality Goals
- ✅ All existing features work identically
- ✅ Data clearing mechanisms preserved
- ✅ Performance maintained or improved
- ✅ HIPAA compliance maintained

### Technical Goals
- ✅ Self-contained deployment (no external database)
- ✅ Same JSON data files used
- ✅ Minimal code duplication
- ✅ Easy maintenance and updates

## Next Steps

1. **Review with IT Team**: Validate SSO integration approach
2. **Create Development Branch**: `feature/server-side-migration`
3. **Start with API Endpoints**: Begin backend development
4. **Iterative Testing**: Test each component as it's built

---

**Note**: This plan maintains the self-contained nature of the application while providing the security Scott requested. All existing functionality is preserved, and the migration can be done incrementally to minimize risk.
