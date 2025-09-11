import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { FileText, Upload } from "lucide-react";
import styles from "./Navbar.module.css";

const Navbar = ({ onDrop, onExport, hasFile, fileName, onUploadClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dragActive, setDragActive] = useState(false);
  
  // Only show upload functionality on advanced route
  const isAdvancedRoute = location.pathname === '/advanced';
  const isBasicRoute = location.pathname.startsWith('/basic');

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { "text/xml": [".xml"] },
    noClick: true,
    noKeyboard: true,
  });

  // Pass the open function to parent component
  useEffect(() => {
    if (onUploadClick && isAdvancedRoute) {
      onUploadClick(open);
    }
  }, [onUploadClick, isAdvancedRoute, open]);

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleSwitchCalculator = () => {
    if (isBasicRoute) {
      navigate('/advanced');
    } else if (isAdvancedRoute) {
      navigate('/basic/start-score');
    }
  };

  useEffect(() => {
    // Only set up drag and drop on advanced route
    if (!isAdvancedRoute) return;
    
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
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) onDrop(files);
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
  }, [onDrop, isAdvancedRoute]);

  return (
    <>
      {dragActive && isAdvancedRoute && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragOverlayMessage}>
            <FileText size={16} /> Drop XML to upload
          </div>
        </div>
      )}
      
      <div className={styles.navbar} {...(isAdvancedRoute ? getRootProps() : {})}>
        {isAdvancedRoute && <input {...getInputProps()} />}
        
        <div className={styles.navbarLeft}>
          <button 
            className={styles.backButton}
            onClick={handleBackToHome}
          >
            Back to Home
          </button>
          
          {isAdvancedRoute && (
            <button
              className={`${styles.uploadButton} ${hasFile ? styles.clearButton : ''}`}
              onClick={hasFile ? () => onDrop([]) : open}
              title={hasFile ? "Clear file" : "Upload XML file"}
            >
              {hasFile ? (
                <>
                  <span>×</span>
                  Clear File
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload XML
                </>
              )}
            </button>
          )}
        </div>
        
        <div className={styles.navbarCenter}>
          <h1 className={styles.navbarTitle}>DFS Calculator</h1>
        </div>
        
        <div className={styles.navbarRight}>
          {isAdvancedRoute && hasFile && (
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
    </>
  );
};

export default Navbar;
