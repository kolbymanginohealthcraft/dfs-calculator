import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../utils/authService';

const PortalContext = createContext();
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

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
    async function checkAuth() {
      let result = await getCurrentUser();

      if (!result.loggedIn && isDevelopment) {
        try {
          const res = await fetch('/account/dev-login', { credentials: 'include' });
          if (res.ok) {
            result = await getCurrentUser();
          }
        } catch { /* backend may not be running */ }
      }

      setIsFromPortal(result.loggedIn);
      setUser(result.user);
      setIsLoading(false);
    }

    checkAuth().catch((error) => {
      console.error('Error checking authentication:', error);
      setIsFromPortal(false);
      setIsLoading(false);
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
