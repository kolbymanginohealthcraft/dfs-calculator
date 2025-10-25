import React, { createContext, useContext, useState, useEffect } from 'react';

const PortalContext = createContext();

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
};

export const PortalProvider = ({ children }) => {
  const [isFromPortal, setIsFromPortal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // DEV FLAG: Set to false to disable referrer checking for development
  const ENABLE_REFERRER_CHECK = true;

  useEffect(() => {
    if (!ENABLE_REFERRER_CHECK) {
      // Development mode: simulate portal user (full access)
      setIsFromPortal(true);
      setIsLoading(false);
      return;
    }

    // Production mode: Check if user came from myCare portal OR is on mycare subdomain (for testing)
    const referrer = document.referrer;
    const hostname = window.location.hostname;
    
    // Check referrer for real portal access OR hostname for test deployment
    if (referrer.includes('mycare.com') || hostname.includes('mycare')) {
      setIsFromPortal(true);
    }
    setIsLoading(false);
  }, []);

  const value = {
    isFromPortal,
    isLoading
  };

  return (
    <PortalContext.Provider value={value}>
      {children}
    </PortalContext.Provider>
  );
};
