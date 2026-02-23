import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../utils/authService';

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
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check authentication status with C# backend (SAML/cookies)
    getCurrentUser().then(({ loggedIn, user: currentUser }) => {
      setIsFromPortal(loggedIn);
      setUser(currentUser);
      setIsLoading(false);
      
      // Store auth state for quick checks (for backward compatibility)
      localStorage.setItem('user-authenticated', loggedIn ? 'true' : 'false');
    }).catch((error) => {
      console.error('Error checking authentication:', error);
      setIsFromPortal(false);
      setIsLoading(false);
      localStorage.setItem('user-authenticated', 'false');
    });
  }, []);

  const value = {
    isFromPortal,
    isLoading,
    user
  };

  return (
    <PortalContext.Provider value={value}>
      {children}
    </PortalContext.Provider>
  );
};
