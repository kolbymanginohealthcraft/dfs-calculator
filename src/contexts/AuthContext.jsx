import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../utils/authService';

const AuthContext = createContext();
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

      setIsAuthenticated(result.loggedIn);
      setUser(result.user);
      setIsLoading(false);
    }

    checkAuth().catch((error) => {
      console.error('Error checking authentication:', error);
      setIsAuthenticated(false);
      setIsLoading(false);
    });
  }, []);

  const value = {
    isAuthenticated,
    isLoading,
    user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
