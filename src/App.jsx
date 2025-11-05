import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { PortalProvider, usePortal } from './contexts/PortalContext';
import { BulkUploadProvider, useBulkUpload } from './contexts/BulkUploadContext';
import { RedactionProvider } from './contexts/RedactionContext';
import { DataLossWarningProvider } from './contexts/DataLossWarningContext';
import RouteBasedClearer from './components/RouteBasedClearer';
import AuthStateTester from './components/AuthStateTester';
import HomeScreen from './components/HomeScreen';
import BasicApp from './components/BasicApp';
import AdvancedAppDetail from './components/AdvancedAppDetail';
import AdvancedSummaryView from './components/AdvancedSummaryView';
import FAQ from './components/FAQ';

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

  // If there's a fileId parameter and we have files, show the detail view
  if (isDetailViewRequest && hasFiles) {
    return <AdvancedAppDetail />;
  }

  // For all other cases (no files or files uploaded), show the summary view
  // AdvancedSummaryView now handles both upload state and summary view
  return <AdvancedSummaryView />;
}

function AppContent() {
  const { isFromPortal, isLoading } = usePortal();

  // Show loading state briefly to ensure referrer is available
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
              <AuthStateTester />
              <Routes>
              <Route 
                path="/" 
                element={<HomeScreen isFromPortal={isFromPortal} />}
              />
              <Route path="/basic/*" element={<BasicApp />} />
              <Route 
                path="/advanced" 
                element={
                  isFromPortal ? (
                    <AdvancedRouteHandler />
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />
              <Route 
                path="/advanced/summary" 
                element={
                  isFromPortal ? (
                    <AdvancedRouteHandler />
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />
              <Route path="/faq" element={<FAQ />} />
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
    <PortalProvider>
      <AppContent />
    </PortalProvider>
  );
}

export default App;
