import React, { createContext, useContext, useState, useEffect } from 'react';

const RedactionContext = createContext();

export const useRedaction = () => {
  const context = useContext(RedactionContext);
  if (!context) {
    throw new Error('useRedaction must be used within a RedactionProvider');
  }
  return context;
};

export const RedactionProvider = ({ children }) => {
  // Initialize redaction state - always default to true (redacted by default)
  const [isRedacted, setIsRedacted] = useState(true);

  // Save redaction state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dfs-redaction-state', JSON.stringify(isRedacted));
  }, [isRedacted]);

  const toggleRedaction = () => {
    setIsRedacted(prev => !prev);
  };

  const value = {
    isRedacted,
    setIsRedacted,
    toggleRedaction
  };

  return (
    <RedactionContext.Provider value={value}>
      {children}
    </RedactionContext.Provider>
  );
};
