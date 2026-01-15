import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileText, Upload } from "lucide-react";
import DataLossWarningModal from "./DataLossWarningModal";
import { useDataLossWarning } from "../contexts/DataLossWarningContext";
import styles from "./Navbar.module.css";

const Navbar = ({ onDrop, onExport, hasFile, fileName, onUploadClick, onBackToSummary, showBackToSummary, onPreviousFile, onNextFile, canGoPrevious, canGoNext, showViewSummary, onViewSummary, uploadedFiles = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dragActive, setDragActive] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const { hasDataToLose: hasBasicDataToLose, clearDataStatus } = useDataLossWarning();
  
  // Only show upload functionality on advanced route and summary
  const isAdvancedRoute = location.pathname === '/advanced';
  const isSummaryRoute = location.pathname === '/advanced/summary';
  const isBasicRoute = location.pathname.startsWith('/basic');
  const isBasicEndScore = location.pathname === '/basic/end-score';

  // Create a simple file input for the upload button
  const fileInputRef = useRef(null);
  const open = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file input changes
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Filter files by accepted types
      const acceptedFiles = files.filter(file => {
        const isAccepted = file.type === 'text/xml' || 
                         file.type === 'application/zip' ||
                         file.name.toLowerCase().endsWith('.xml') ||
                         file.name.toLowerCase().endsWith('.zip');
        return isAccepted;
      });
      
      if (acceptedFiles.length > 0) {
        onDrop(acceptedFiles);
      }
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  // Pass the open function to parent component
  useEffect(() => {
    if (onUploadClick && (isAdvancedRoute || isSummaryRoute)) {
      onUploadClick(open);
    }
  }, [onUploadClick, isAdvancedRoute, isSummaryRoute, open]);

  const handleBackToHome = () => {
    // Check if there are uploaded files or basic mode data that would be lost
    if (uploadedFiles.length > 0 || hasBasicDataToLose) {
      setShowLeaveWarning(true);
    } else {
      navigate('/');
    }
  };

  const handleConfirmLeave = () => {
    setShowLeaveWarning(false);
    clearDataStatus(); // Clear the data status when user confirms leaving
    navigate('/');
  };

  const handleCancelLeave = () => {
    setShowLeaveWarning(false);
  };

  const handleSwitchCalculator = () => {
    if (isBasicRoute) {
      navigate('/advanced');
    } else if (isAdvancedRoute) {
      navigate('/basic/start-score');
    }
  };

  useEffect(() => {
    // Only set up drag and drop on advanced route and summary
    if (!isAdvancedRoute && !isSummaryRoute) return;
    
    let dragCounter = 0;

    const handleDragEnter = (e) => {
      e.preventDefault();
      dragCounter++;
      setDragActive(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) setDragActive(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      dragCounter = 0;
      setDragActive(false);
      
      // Process files directly with the same logic as useDropzone
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) {
        // Filter files by accepted types (same as useDropzone)
        const acceptedFiles = files.filter(file => {
          const isAccepted = file.type === 'text/xml' || 
                           file.type === 'application/zip' ||
                           file.name.toLowerCase().endsWith('.xml') ||
                           file.name.toLowerCase().endsWith('.zip');
          return isAccepted;
        });
        
        if (acceptedFiles.length > 0) {
          onDrop(acceptedFiles);
        }
      }
    };

    const preventDefaults = (e) => {
      e.preventDefault();
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", preventDefaults);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", preventDefaults);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [onDrop, isAdvancedRoute, isSummaryRoute]);

  return (
    <>
      {dragActive && (isAdvancedRoute || isSummaryRoute) && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragOverlayMessage}>
            <FileText size={16} /> Drop files to upload
          </div>
        </div>
      )}
      
      <div className={styles.navbar}>
        {(isAdvancedRoute || isSummaryRoute) && (
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xml,.zip"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        )}
        
        <div className={styles.navbarLeft}>
          <button 
            className={styles.backButton}
            onClick={handleBackToHome}
          >
            Back to Home
          </button>
          
          {(isAdvancedRoute || isSummaryRoute) && (
            <>
              {isSummaryRoute && hasFile && (
                <button
                  className={styles.uploadButton}
                  onClick={open}
                  title="Add more files"
                >
                  <Upload size={16} />
                  Add File
                </button>
              )}
              <button
                className={`${styles.uploadButton} ${hasFile ? styles.clearButton : ''}`}
                onClick={hasFile ? () => onDrop([]) : open}
                title={hasFile ? "Clear files" : "Upload XML files or ZIP"}
              >
                {hasFile ? (
                  <>
                    <span>×</span>
                    Clear Files
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload Files
                  </>
                )}
              </button>
            </>
          )}
        </div>
        
        <div className={styles.navbarCenter}>
          <h1 className={styles.navbarTitle}>DFS Calculator</h1>
        </div>
        
        <div className={styles.navbarRight}>
          {((isAdvancedRoute && hasFile) || isBasicEndScore) && (
            <button
              className={styles.exportButton}
              onClick={onExport}
              title="Export to PDF"
            >
              <FileText size={16} />
              Export PDF
            </button>
          )}
          
          <div className={styles.logoContainer}>
            <img
              src="/AEGIS_T_White.png"
              alt="Aegis Logo"
              className={styles.navbarLogo}
            />
          </div>
        </div>
      </div>
      
      {/* Data Loss Warning Modal for Back to Home */}
      <DataLossWarningModal
        isOpen={showLeaveWarning}
        onClose={handleCancelLeave}
        onConfirm={handleConfirmLeave}
        title="Leave Calculator"
        message="You have data that will be lost if you leave. Are you sure you want to go back to the home page?"
        confirmText="Yes, Leave"
        cancelText="Stay Here"
      />
    </>
  );
};

export default Navbar;
