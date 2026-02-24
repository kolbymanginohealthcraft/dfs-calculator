import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BulkUploadProvider, useBulkUpload } from './contexts/BulkUploadContext';
import { RedactionProvider } from './contexts/RedactionContext';
import { DataLossWarningProvider } from './contexts/DataLossWarningContext';
import RouteBasedClearer from './components/RouteBasedClearer';
import HomeScreen from './components/HomeScreen';
import BasicApp from './components/BasicApp';

const AdvancedAppDetail = lazy(() => import('./components/AdvancedAppDetail'));
const AdvancedSummaryView = lazy(() => import('./components/AdvancedSummaryView'));
const FAQ = lazy(() => import('./components/FAQ'));

// Component to handle conditional routing for advanced pages
function AdvancedRouteHandler() {
  const { uploadedFiles } = useBulkUpload();
  const navigate = useNavigate();
  const location = useLocation();
  const hasFiles = uploadedFiles && uploadedFiles.length > 0;
  
  // Check if there's a fileId query parameter (indicates detail view request)
  const urlParams = new URLSearchParams(location.search);
  const fileId = urlParams.get('fileId');
  const isDetailViewRequest = fileId !== null;

  // Handle redirect logic for detail view requests
  useEffect(() => {
    if (isDetailViewRequest) {
      // If there's a fileId but no files (e.g., after refresh), redirect to /advanced
      if (!hasFiles) {
        navigate('/advanced', { replace: true });
        return;
      }
      
      // If there's a fileId and files exist, check if the file exists
      const fileExists = uploadedFiles.some(file => file.id === fileId);
      if (!fileExists) {
        // File doesn't exist, redirect to /advanced
        navigate('/advanced', { replace: true });
        return;
      }
      
      // File exists and we have files, let AdvancedAppDetail handle it
      return;
    }
    
    // Handle other routing logic
    if (!hasFiles && location.pathname === '/advanced/summary') {
      // No files but on summary URL - redirect to main advanced page
      navigate('/advanced', { replace: true });
    } else if (hasFiles && location.pathname === '/advanced' && !isDetailViewRequest) {
      // Has files but on upload URL - redirect to summary page (unless it's a detail view)
      navigate('/advanced/summary', { replace: true });
    }
  }, [hasFiles, location.pathname, navigate, isDetailViewRequest, uploadedFiles, fileId]);

  const fallback = (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px', color: '#666' }}>
      Loading...
    </div>
  );

  if (isDetailViewRequest && hasFiles) {
    return <Suspense fallback={fallback}><AdvancedAppDetail /></Suspense>;
  }

  return <Suspense fallback={fallback}><AdvancedSummaryView /></Suspense>;
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <RedactionProvider>
      <BulkUploadProvider>
        <DataLossWarningProvider>
          <Router>
            <div className="App">
              <RouteBasedClearer />
              <Routes>
              <Route 
                path="/" 
                element={<HomeScreen isAuthenticated={isAuthenticated} />}
              />
              <Route path="/basic/*" element={<BasicApp />} />
              <Route 
                path="/advanced" 
                element={
                  isAuthenticated ? (
                    <AdvancedRouteHandler />
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />
              <Route 
                path="/advanced/summary" 
                element={
                  isAuthenticated ? (
                    <AdvancedRouteHandler />
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />
              <Route path="/faq" element={<Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px', color: '#666' }}>Loading...</div>}><FAQ /></Suspense>} />
              </Routes>
            </div>
          </Router>
        </DataLossWarningProvider>
      </BulkUploadProvider>
    </RedactionProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
