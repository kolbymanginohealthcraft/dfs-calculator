import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { PortalProvider, usePortal } from './contexts/PortalContext';
import { BulkUploadProvider, useBulkUpload } from './contexts/BulkUploadContext';
import { RedactionProvider } from './contexts/RedactionContext';
import RouteBasedClearer from './components/RouteBasedClearer';
import HomeScreen from './components/HomeScreen';
import BasicApp from './components/BasicApp';
import AdvancedAppBulk from './components/AdvancedAppBulk';
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

  // Synchronize URL with the actual state, but not if it's a detail view request
  useEffect(() => {
    if (isDetailViewRequest) {
      // Don't redirect if this is a detail view request
      return;
    }
    
    if (!hasFiles && location.pathname === '/advanced/summary') {
      // No files but on summary URL - redirect to upload page
      navigate('/advanced', { replace: true });
    } else if (hasFiles && location.pathname === '/advanced' && !isDetailViewRequest) {
      // Has files but on upload URL - redirect to summary page (unless it's a detail view)
      navigate('/advanced/summary', { replace: true });
    }
  }, [hasFiles, location.pathname, navigate, isDetailViewRequest]);

  // If no files uploaded, show the upload page
  if (!hasFiles) {
    return <AdvancedAppBulk />;
  }

  // If there's a fileId parameter, show the detail view (AdvancedAppBulk handles this)
  if (isDetailViewRequest) {
    return <AdvancedAppBulk />;
  }

  // If files are uploaded, show the summary page
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
        <Router>
          <div className="App">
            <RouteBasedClearer />
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
