import React, { createContext, useContext, useState, useEffect } from 'react';
import { hasSSOToken } from '../utils/secureApiClient';

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

  useEffect(() => {
    // Check if user has SSO token (authenticated via myCare)
    // This is the primary method: authenticated users have access to advanced mode
    const hasToken = hasSSOToken();
    
    if (hasToken) {
      setIsFromPortal(true);
      setIsLoading(false);
      return;
    }

    // Development mode: Check if we're in dev and allow bypass
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development' || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';
    
    if (isDev) {
      // In development, check for dev token (auto-set by secureApiClient)
      const devToken = localStorage.getItem('dev-sso-token');
      if (devToken === 'dev-bypass-token') {
        setIsFromPortal(true);
        setIsLoading(false);
        return;
      }
    }

    // Fallback: Check referrer for portal access (secondary method)
    // This is less reliable but can be used as backup
    const referrer = document.referrer;
    const hostname = window.location.hostname;
    
    // Check referrer for myCare portal OR hostname for test deployment
    if (referrer.includes('mycare.com') || hostname.includes('mycare')) {
      setIsFromPortal(true);
    } else {
      // Public access: No portal access, basic mode only
      setIsFromPortal(false);
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
