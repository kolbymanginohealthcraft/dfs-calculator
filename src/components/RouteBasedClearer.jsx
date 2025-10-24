import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useBulkUpload } from '../contexts/BulkUploadContext';

const RouteBasedClearer = () => {
  const location = useLocation();
  const { uploadedFiles, setUploadedFiles, setProcessing } = useBulkUpload();

  // Clear data when leaving /advanced route
  useEffect(() => {
    const isAdvancedRoute = location.pathname.startsWith('/advanced');
    
    if (!isAdvancedRoute && uploadedFiles.length > 0) {
      setUploadedFiles([]);
      setProcessing(false);
    }
  }, [location.pathname, uploadedFiles.length, setUploadedFiles, setProcessing]);

  return null; // This component doesn't render anything
};

export default RouteBasedClearer;
