import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const DataLossWarningContext = createContext();

export const useDataLossWarning = () => {
  const context = useContext(DataLossWarningContext);
  if (!context) {
    throw new Error('useDataLossWarning must be used within a DataLossWarningProvider');
  }
  return context;
};

export const DataLossWarningProvider = ({ children }) => {
  const [dataLossSources, setDataLossSources] = useState({
    basicStart: false,
    basicExpected: false,
    basicEnd: false,
    advancedFiles: false
  });
  const [dataDescription, setDataDescription] = useState('');
  
  // Calculate overall data loss status
  const hasDataToLose = Object.values(dataLossSources).some(status => status);
  
  const updateDataStatus = useCallback((source, hasData, description = '') => {
    setDataLossSources(prev => ({
      ...prev,
      [source]: hasData
    }));
    if (hasData) {
      setDataDescription(description);
    }
  }, []);

  const clearDataStatus = useCallback(() => {
    setDataLossSources({
      basicStart: false,
      basicExpected: false,
      basicEnd: false,
      advancedFiles: false
    });
    setDataDescription('');
  }, []);


  // Show warning when user tries to leave with unsaved work
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // Only show warning if there is data and user is trying to leave
      if (hasDataToLose) {
        event.preventDefault();
        event.returnValue = 'You have unsaved work. Are you sure you want to leave?';
        return 'You have unsaved work. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasDataToLose]);

  const value = {
    hasDataToLose,
    dataDescription,
    updateDataStatus,
    clearDataStatus
  };

  return (
    <DataLossWarningContext.Provider value={value}>
      {children}
    </DataLossWarningContext.Provider>
  );
};
