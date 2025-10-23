import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const BulkUploadContext = createContext();

export const useBulkUpload = () => {
  const context = useContext(BulkUploadContext);
  if (!context) {
    throw new Error('useBulkUpload must be used within a BulkUploadProvider');
  }
  return context;
};

export const BulkUploadProvider = ({ children }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  // Progress tracking state
  const [totalFilesToProcess, setTotalFilesToProcess] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);

  // Clear data only on actual page refresh or leaving the app
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      // Only clear on actual page unload (refresh or leaving)
      setUploadedFiles([]);
      setIsProcessing(false);
      setTotalFilesToProcess(0);
      setProcessedCount(0);
      setIsCancelled(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Debug: Log when context changes
  React.useEffect(() => {
    console.log('BulkUploadContext - uploadedFiles changed:', uploadedFiles.length, uploadedFiles);
  }, [uploadedFiles]);

  const addFiles = useCallback((newFiles) => {
    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const updateFile = useCallback((fileId, updates) => {
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, ...updates } : f
    ));
  }, []);

  const clearAllFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  const setProcessing = useCallback((processing) => {
    setIsProcessing(processing);
  }, []);

  // Progress tracking functions
  const setTotalFiles = useCallback((total) => {
    setTotalFilesToProcess(total);
  }, []);

  const setProcessed = useCallback((count) => {
    setProcessedCount(count);
  }, []);

  const setCancelled = useCallback((cancelled) => {
    setIsCancelled(cancelled);
  }, []);

  const resetProgress = useCallback(() => {
    setTotalFilesToProcess(0);
    setProcessedCount(0);
    setIsCancelled(false);
  }, []);

  const value = {
    uploadedFiles,
    setUploadedFiles,
    addFiles,
    updateFile,
    clearAllFiles,
    isProcessing,
    setProcessing,
    // Progress tracking
    totalFilesToProcess,
    processedCount,
    isCancelled,
    setTotalFiles,
    setProcessed,
    setCancelled,
    resetProgress
  };

  return (
    <BulkUploadContext.Provider value={value}>
      {children}
    </BulkUploadContext.Provider>
  );
};
