import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { storeFileData, getFileData, getFileSummary, clearAllFileData, getMemoryStats } from '../utils/fileDataManager';
import { createPaginationManager } from '../utils/paginationManager';
import { startMemoryMonitoring, addCleanupCallback, removeCleanupCallback, getMemoryUsage } from '../utils/memoryMonitor';

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
  
  // Pagination state
  const [pagination] = useState(() => createPaginationManager(20));
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Memory monitoring state
  const [memoryUsage, setMemoryUsage] = useState(null);

  // Initialize memory monitoring and cleanup
  React.useEffect(() => {
    // Start memory monitoring
    startMemoryMonitoring(30000, 0.7, 0.85);
    
    // Add cleanup callback for memory pressure
    const cleanupCallback = (level, memoryInfo) => {
      if (level === 'critical') {
        // Clear raw data from least recently used files
        clearAllFileData();
        setUploadedFiles(prev => prev.map(file => ({
          ...file,
          _rawData: null // Clear raw data but keep summary
        })));
      }
    };
    
    addCleanupCallback(cleanupCallback);
    
    // Update memory usage periodically
    const memoryInterval = setInterval(() => {
      setMemoryUsage(getMemoryUsage());
    }, 10000);
    
    return () => {
      clearInterval(memoryInterval);
      removeCleanupCallback(cleanupCallback);
    };
  }, []);

  // Clear data only on actual page refresh or leaving the app
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      // Only clear on actual page unload (refresh or leaving)
      setUploadedFiles([]);
      setIsProcessing(false);
      setTotalFilesToProcess(0);
      setProcessedCount(0);
      setIsCancelled(false);
      clearAllFileData();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Remove debug logging in production
  // React.useEffect(() => {
  //   console.log('BulkUploadContext - uploadedFiles changed:', uploadedFiles.length, uploadedFiles);
  // }, [uploadedFiles]);

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
    clearAllFileData();
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

  // Pagination methods
  const goToPage = useCallback((page) => {
    if (pagination.goToPage(page)) {
      setCurrentPage(page);
    }
  }, [pagination]);

  const nextPage = useCallback(() => {
    if (pagination.nextPage()) {
      setCurrentPage(pagination.getCurrentPage());
    }
  }, [pagination]);

  const prevPage = useCallback(() => {
    if (pagination.prevPage()) {
      setCurrentPage(pagination.getCurrentPage());
    }
  }, [pagination]);

  const setItemsPerPageValue = useCallback((perPage) => {
    pagination.setItemsPerPage(perPage);
    setItemsPerPage(perPage);
    setCurrentPage(1); // Reset to first page
  }, [pagination]);

  // Get paginated files
  const getPaginatedFiles = useCallback(() => {
    pagination.setTotalItems(uploadedFiles.length);
    return pagination.getCurrentPageItems(uploadedFiles);
  }, [uploadedFiles, pagination]);

  // Get pagination info
  const getPaginationInfo = useCallback(() => {
    pagination.setTotalItems(uploadedFiles.length);
    return pagination.getPaginationInfo();
  }, [uploadedFiles, pagination]);

  // Lazy loading methods
  const loadFileData = useCallback(async (fileId, reprocessCallback) => {
    try {
      const fileData = await getFileData(fileId, reprocessCallback);
      return fileData;
    } catch (error) {
      console.error('Failed to load file data:', error);
      throw error;
    }
  }, []);

  const getFileSummary = useCallback((fileId) => {
    try {
      return getFileSummary(fileId);
    } catch (error) {
      console.error('Failed to get file summary:', error);
      return null;
    }
  }, []);

  // Memory management
  const getMemoryStats = useCallback(() => {
    return getMemoryStats();
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
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
    resetProgress,
    // Pagination
    currentPage,
    itemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    setItemsPerPageValue,
    getPaginatedFiles,
    getPaginationInfo,
    // Lazy loading
    loadFileData,
    getFileSummary,
    // Memory management
    memoryUsage,
    getMemoryStats
  }), [
    uploadedFiles,
    isProcessing,
    totalFilesToProcess,
    processedCount,
    isCancelled,
    addFiles,
    updateFile,
    clearAllFiles,
    setProcessing,
    setTotalFiles,
    setProcessed,
    setCancelled,
    resetProgress,
    currentPage,
    itemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    setItemsPerPageValue,
    getPaginatedFiles,
    getPaginationInfo,
    loadFileData,
    getFileSummary,
    memoryUsage,
    getMemoryStats
  ]);

  return (
    <BulkUploadContext.Provider value={value}>
      {children}
    </BulkUploadContext.Provider>
  );
};
