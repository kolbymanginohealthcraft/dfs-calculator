import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PortalProvider, usePortal } from './contexts/PortalContext';
import HomeScreen from './components/HomeScreen';
import BasicApp from './components/BasicApp';
import AdvancedAppNew from './components/AdvancedAppNew';
import FAQ from './components/FAQ';

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
    <Router>
      <div className="App">
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
                <AdvancedAppNew />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route path="/faq" element={<FAQ />} />
        </Routes>
      </div>
    </Router>
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
