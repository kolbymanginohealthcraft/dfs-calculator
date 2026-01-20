import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useBulkUpload } from '../contexts/BulkUploadContext';
import { useDataLossWarning } from '../contexts/DataLossWarningContext';

const RouteBasedClearer = () => {
  const location = useLocation();
  const { uploadedFiles, setUploadedFiles, setProcessing } = useBulkUpload();
  const { hasDataToLose, clearDataStatus } = useDataLossWarning();

  // Clear data when leaving /advanced route
  useEffect(() => {
    const isAdvancedRoute = location.pathname.startsWith('/advanced');
    
    if (!isAdvancedRoute && uploadedFiles.length > 0) {
      setUploadedFiles([]);
      setProcessing(false);
    }
  }, [location.pathname, uploadedFiles.length, setUploadedFiles, setProcessing]);

  // Clear data loss warning when navigating away from basic/advanced modes
  useEffect(() => {
    const isBasicRoute = location.pathname.startsWith('/basic');
    const isAdvancedRoute = location.pathname.startsWith('/advanced');
    
    // Only clear when navigating to home or other non-basic/advanced routes
    if (!isBasicRoute && !isAdvancedRoute && hasDataToLose) {
      clearDataStatus();
    }
  }, [location.pathname, hasDataToLose, clearDataStatus]);

  return null; // This component doesn't render anything
};

export default RouteBasedClearer;
