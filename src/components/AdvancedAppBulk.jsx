import { useState, useEffect, useCallback, useRef, lazy, Suspense, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate, useSearchParams } from "react-router-dom";
import { scoreMap, GG_ITEMS, conditionMap } from "../utils/calculations";
import {
  extractPatientSummary,
  determineMobilityType,
  calculateFunctionScore,
  getFunctionCovariates,
} from "../utils/calculations";
import { fetchFacilityInfo } from "../utils/facilityLookup";
import { handleFileUploadWithValidation } from "../utils/enhancedFileParser";
import { getFunctionMultipliers } from "../utils/coefficientLoader";
import { useICD10Lookup } from "../utils/useICD10Lookup";
import useValueDescriptions from "../utils/useValueDescriptions";
import { redactFullName, redactFacility, redactAddress } from "../utils/redactionUtils";
import { extractXmlFilesFromZip, isZipFile, createFileFromContent } from "../utils/zipHandler";
import { useBulkUpload } from "../contexts/BulkUploadContext";
import { useRedaction } from "../contexts/RedactionContext";
import { usePortal } from "../contexts/PortalContext";
import html2pdf from "html2pdf.js";

import Navbar from "./Navbar";
import ModeBanner from "./ModeBanner";
import PatientHeader from "./PatientHeader";
import ValidationError from "./ValidationError";
import FileManager from "./FileManager";
import SummaryView from "./SummaryView";
import BasicLayout from "../basic/components/BasicLayout";
import InstructionPanel from "../basic/components/InstructionPanel";
import { instructionContent } from "../data/instructionContent";

// Lazy load heavy components to improve initial render performance
const MdsSnapshot = lazy(() => import("./MdsSnapshot"));
const ModelEndScore = lazy(() => import("./ModelEndScore"));
const Covariates = lazy(() => import("./Covariates"));
const ImputationTab = lazy(() => import("./ImputationTab"));
const ExportView = lazy(() => import("./ExportView"));

import "../index.css";
import "../basic/styles/BasicLayout.css";
import styles from "./AdvancedAppNew.module.css";

function AdvancedAppBulk() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Debug: Check portal context
  const { isFromPortal } = usePortal();
  // Use bulk upload context
  const { uploadedFiles, setUploadedFiles } = useBulkUpload();
  
  // Use redaction context
  const { isRedacted, toggleRedaction } = useRedaction();
  
  // Local state for current file selection
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);
  const [activeView, setActiveView] = useState('summary'); // 'files' or 'summary'
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);
  

  // Current file state (for detailed view)
  const [parsedValues, setParsedValues] = useState({});
  const [groupedSections, setGroupedSections] = useState({});
  const [modeledValues, setModeledValues] = useState({});
  const [startScores, setStartScores] = useState({});
  const [imputedItems, setImputedItems] = useState(new Set());
  const [fileName, setFileName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedCovariate, setSelectedCovariate] = useState(null);
  const [activeRightPanel, setActiveRightPanel] = useState('instructions');
  const [covariates, setCovariates] = useState({});
  const [weightedScore, setWeightedScore] = useState(0);
  const [versionMultipliers, setVersionMultipliers] = useState({});
  const [validationError, setValidationError] = useState(null);
  const [validationWarning, setValidationWarning] = useState(null);
  const [manualCovariateOverrides, setManualCovariateOverrides] = useState({});
  const uploadOpenFunctionRef = useRef(null);
  const exportRef = useRef();

  const icd10Descriptions = useICD10Lookup();
  const descriptions = useValueDescriptions();
  const ardDate = parsedValues["A2300"];

  // Get current file data (memoized to prevent unnecessary re-renders)
  const currentFile = useMemo(() => 
    currentFileIndex >= 0 ? uploadedFiles[currentFileIndex] : null,
    [currentFileIndex, uploadedFiles]
  );
  
  const hasFile = useMemo(() => 
    !!currentFile && currentFile.status === 'processed',
    [currentFile]
  );
  
  // Show back to summary button when viewing a file detail (either loaded file or URL with fileId)
  const isViewingFileDetail = useMemo(() => 
    hasFile || searchParams.get('fileId') !== null,
    [hasFile, searchParams]
  );
  
  // Debug: Log current state (only when state changes significantly)
  // console.log('Current state:', {
  //   uploadedFilesCount: uploadedFiles.length,
  //   currentFileIndex,
  //   currentFile: currentFile?.name,
  //   hasFile,
  //   isViewingFileDetail,
  //   fileIdFromUrl: searchParams.get('fileId'),
  //   activeView,
  //   currentFileStatus: currentFile?.status,
  //   currentFileId: currentFile?.id,
  //   allFiles: uploadedFiles.map(f => ({ name: f.name, status: f.status, id: f.id }))
  // });


  // HIPAA-compliant data cleanup function
  const clearAllPatientData = useCallback(() => {
    setFileName("");
    setParsedValues({});
    setGroupedSections({});
    setModeledValues({});
    setStartScores({});
    setImputedItems(new Set());
    setCovariates({});
    setWeightedScore(0);
    setVersionMultipliers({});
    setValidationError(null);
    setValidationWarning(null);
    setManualCovariateOverrides({});
    // Force garbage collection hint for sensitive data
    if (window.gc) {
      window.gc();
    }
  }, []);


  // Process a single file
  const processFile = useCallback(async (file, fileId) => {
    try {
      console.log('Processing file:', file.name);
      
      // Create a temporary file object for processing
      const tempFile = file.file || (file instanceof File ? file : createFileFromContent(file.name, file.content, file.size));
      
      // Store parsed data as we process
      let parsedData = null;
      let groupedData = null;
      let modeledData = null;
      let startData = null;
      let imputedData = null;
      
      // Process the file using existing validation
      const result = await handleFileUploadWithValidation(
        tempFile,
        (name) => {}, // We'll handle fileName separately
        (parsed) => {
          parsedData = parsed;
        },
        (grouped) => {
          groupedData = grouped;
        },
        (modeled) => {
          modeledData = modeled;
        },
        (start) => {
          startData = start;
        },
        (imputed) => {
          imputedData = imputed;
        },
        (error) => {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'error', error: error?.message || 'Processing failed' }
              : f
          ));
        },
        (warning) => {
          // Store warnings if needed
        }
      );

      // Wait a bit for all callbacks to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (result && parsedData && startData) {
        // Calculate only essential results for summary view
        const summary = extractPatientSummary(parsedData, parsedData["A2300"]);
        const icdList = Object.entries(parsedData)
          .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
          .map(([_, value]) => value)
          .filter(Boolean);
        
        const multipliers = getFunctionMultipliers(parsedData["A2300"]);
        const covariateResult = getFunctionCovariates(
          parsedData,
          summary,
          icdList,
          startData,
          parsedData["A2300"]
        );

        const startScore = calculateFunctionScore(startData);
        const expectedScore = covariateResult?.weightedScore || 0;
        const scoreDifference = expectedScore - startScore;

        console.log('File processed successfully:', file.name);

        // Update file with minimal data for summary view
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { 
                ...f, 
                status: 'processed',
                // Store minimal data for summary
                results: {
                  patientFirstName: summary.firstName,
                  patientLastName: summary.lastName,
                  startScore,
                  expectedScore,
                  scoreDifference,
                  mobilityType: determineMobilityType(parsedData),
                  primaryCondition: conditionMap[parsedData["I0020"]] || 'Unknown'
                },
                // Store raw data for detailed view (only when needed)
                _rawData: {
                  parsedValues: parsedData,
                  groupedSections: groupedData,
                  modeledValues: modeledData,
                  startScores: startData,
                  imputedItems: imputedData
                }
              }
            : f
        ));
      }
    } catch (error) {
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'error', error: error.message }
          : f
      ));
    }
  }, []);

  // Handle file uploads (including zip files)
  const onDrop = useCallback(async (acceptedFiles) => {
    // If empty array is passed, clear all files
    if (acceptedFiles.length === 0) {
      setUploadedFiles([]);
      setCurrentFileIndex(-1);
      clearAllPatientData();
      navigate('/advanced');
      return;
    }

    const newFiles = [];

    try {
      for (const file of acceptedFiles) {
        // Just store the file reference - let summary page handle reading
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        newFiles.push({
          id: fileId,
          name: file.name,
          file: file,
          size: file.size,
          status: 'pending',
          error: null
        });
      }

      // Add new files to the list
      setUploadedFiles(prev => {
        const updated = [...prev, ...newFiles];
        console.log('Adding files to context:', newFiles.length, 'Total files:', updated.length);
        return updated;
      });

      // Navigate to summary page immediately - let summary page handle processing
      console.log('Navigating to summary page immediately');
      navigate('/advanced/summary');
    } catch (error) {
      console.error('Bulk upload error:', error);
    }
  }, [clearAllPatientData, navigate]);

  // Handle file selection
  const handleFileSelect = useCallback((index) => {
    console.log('Selecting file at index:', index);
    
    // Save current modeled values to the previous file before switching
    // Only save if the user has actually made changes (userModeledValues doesn't exist or differs from original)
    if (currentFile && currentFile.status === 'processed') {
      const originalModeledValues = currentFile._rawData?.modeledValues || {};
      const hasChanges = JSON.stringify(modeledValues) !== JSON.stringify(originalModeledValues);
      
      if (hasChanges || currentFile.userModeledValues) {
        setUploadedFiles(prev => prev.map(f => 
          f.id === currentFile.id 
            ? { 
                ...f, 
                userModeledValues: { ...modeledValues },
                userCovariates: { ...covariates },
                userWeightedScore: weightedScore,
                userVersionMultipliers: { ...versionMultipliers },
                userManualCovariateOverrides: { ...manualCovariateOverrides }
              }
            : f
        ));
      }
    }
    
    setCurrentFileIndex(index);
    const file = uploadedFiles[index];
    
    // Update URL with file ID
    if (file) {
      navigate(`/advanced?fileId=${file.id}`, { replace: true });
    }
    
    if (file && file.status === 'processed') {
      console.log('Loading detailed data for:', file.name);
      
      // Load the selected file's detailed data into the current view
      setFileName(file.name);
      
      // Load detailed data from _rawData if available
      if (file._rawData) {
        setParsedValues(file._rawData.parsedValues || {});
        setGroupedSections(file._rawData.groupedSections || {});
        setStartScores(file._rawData.startScores || {});
        setImputedItems(file._rawData.imputedItems || new Set());
        
        // Load user's saved modeled values, or fall back to original modeled values
        setModeledValues(file.userModeledValues || file._rawData.modeledValues || {});
        setCovariates(file.userCovariates || {});
        setWeightedScore(file.userWeightedScore || 0);
        setVersionMultipliers(file.userVersionMultipliers || {});
        setManualCovariateOverrides(file.userManualCovariateOverrides || {});
      } else {
        // Fallback to empty data if _rawData not available
        setParsedValues({});
        setGroupedSections({});
        setModeledValues({});
        setStartScores({});
        setImputedItems(new Set());
        setCovariates({});
        setWeightedScore(0);
        setVersionMultipliers({});
        setManualCovariateOverrides({});
      }
      
      setValidationError(null);
      setValidationWarning(null);
      
      console.log('Detailed data loaded successfully');
    } else {
      console.log('File not processed or not found');
    }
  }, [uploadedFiles, currentFile, modeledValues, covariates, weightedScore, versionMultipliers, manualCovariateOverrides, navigate]);

  // Handle file parameter from URL (only once)
  useEffect(() => {
    const fileId = searchParams.get('fileId');
    console.log('URL parameter handling:', {
      fileId,
      uploadedFilesLength: uploadedFiles.length,
      currentFileIndex,
      isNavigatingAway,
      uploadedFileIds: uploadedFiles.map(f => f.id)
    });
    
    // Only auto-select if we're on the detail view route and not already viewing a file
    // and not navigating away
    if (fileId !== null && uploadedFiles.length > 0 && currentFileIndex === -1 && !isNavigatingAway) {
      const index = uploadedFiles.findIndex(file => file.id === fileId);
      console.log('File lookup result:', { index, fileId, foundFile: uploadedFiles[index]?.name });
      if (index >= 0) {
        console.log('Auto-selecting file from URL:', index, uploadedFiles[index]?.name);
        handleFileSelect(index);
      } else {
        console.log('File not found in uploadedFiles array');
      }
    }
  }, [searchParams, uploadedFiles.length, currentFileIndex, handleFileSelect, isNavigatingAway]);

  // Reset navigation flag when component mounts or when we're not on a detail view
  useEffect(() => {
    const fileId = searchParams.get('fileId');
    if (!fileId) {
      setIsNavigatingAway(false);
    }
  }, [searchParams]);

  // No auto-loading - start with summary view

  // Clear all files
  const handleClearAll = useCallback(() => {
    setUploadedFiles([]);
    setCurrentFileIndex(0);
    clearAllPatientData();
  }, [clearAllPatientData]);

  // Export all results to CSV
  const handleExportAll = useCallback(() => {
    const successfulFiles = uploadedFiles.filter(f => f.status === 'processed' && f.results);
    
    if (successfulFiles.length === 0) return;

    const headers = [
      'File Name',
      'Patient First Name',
      'Patient Last Name',
      'Start Score',
      'Expected Score',
      'Score Difference',
      'Mobility Type',
      'Primary Condition'
    ];

    const rows = successfulFiles.map(file => [
      file.name,
      file.results.patientFirstName || '',
      file.results.patientLastName || '',
      file.results.startScore || '',
      file.results.expectedScore || '',
      file.results.scoreDifference || '',
      file.results.mobilityType || '',
      file.results.primaryCondition || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dfs-bulk-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [uploadedFiles]);

  // Callback to receive the open function from navbar
  const handleUploadClick = useCallback((openFunction) => {
    uploadOpenFunctionRef.current = openFunction;
  }, []);

  // Rest of the component logic (handleTick, subtotal, etc.) remains the same
  const handleTick = (key, delta) => {
    setModeledValues((prev) => {
      const raw = prev[key];
      const current = scoreMap[raw] ?? 0;
      let next = Math.max(1, Math.min(6, current + delta));
      
      // Ensure end score doesn't go below start score
      const startRaw = startScores[key];
      if (startRaw !== undefined) {
        const startScore = scoreMap[startRaw] ?? 0;
        next = Math.max(next, startScore);
      }
      
      const code =
        Object.entries(scoreMap).find(([k, v]) => v === next)?.[0] || "01";
      return { ...prev, [key]: code };
    });
  };

  const subtotal = (domain) =>
    GG_ITEMS.filter((i) => i.domain === domain).reduce(
      (sum, i) => sum + (scoreMap[modeledValues[i.id]] || 0),
      0
    );

  const startTotal = calculateFunctionScore(startScores);
  const modeledTotal = calculateFunctionScore(modeledValues);

  const {
    firstName,
    lastName,
    dob,
    facility,
    admitDate,
    dischargeDate,
    age,
    ardGapDays,
  } = extractPatientSummary(parsedValues, ardDate);

  const mobilityType = determineMobilityType(parsedValues);
  const conditionCode = parsedValues["I0020"];
  const conditionCategory = conditionMap[conditionCode] || "Unknown";

  useEffect(() => {
    fetchFacilityInfo(
      parsedValues?.A0100B,
      setFacilityName,
      setFacilityAddress
    );
  }, [parsedValues]);

  // HIPAA-compliant cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clear all patient data when component unmounts
      clearAllPatientData();
    };
  }, [clearAllPatientData]);

  // Calculate covariates only once when file is loaded (or when manual overrides change)
  useEffect(() => {
    if (hasFile && Object.keys(parsedValues).length > 0 && Object.keys(startScores).length > 0) {
      const icdList = Object.entries(parsedValues)
        .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
        .map(([_, value]) => value)
        .filter(Boolean);

      // Get version-specific multipliers
      const multipliers = getFunctionMultipliers(ardDate);
      setVersionMultipliers(multipliers);

      const result = getFunctionCovariates(
        parsedValues,
        extractPatientSummary(parsedValues, ardDate),
        icdList,
        startScores,
        ardDate,
        manualCovariateOverrides
      );

      if (result) {
        setCovariates(result.covariates || {});
        setWeightedScore(result.weightedScore || 0);
      }
    }
  }, [hasFile, parsedValues, startScores, ardDate, manualCovariateOverrides]);

  const handleExport = () => {
    if (!fileName) return;
    html2pdf()
      .set({
        margin: 0.5,
        filename: `dfs-report-${fileName.replace(".xml", "")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      })
      .from(exportRef.current)
      .save();
  };

  const handleCovariateClick = (covariateKey, itemsArray) => {
    // If the clicked items match what's already selected, clear them
    const isSameSelection =
      itemsArray.length === selectedItems.length &&
      itemsArray.every((item) => selectedItems.includes(item));

    if (isSameSelection) {
      // Clear selection
      setSelectedItems([]);
      setSelectedCovariate(null);
    } else {
      // Set new selection and switch to MDS tab
      setSelectedItems(itemsArray);
      setSelectedCovariate(covariateKey);
      setActiveRightPanel('mds');
    }
  };

  const clearCovariateSelection = () => {
    setSelectedItems([]);
    setSelectedCovariate(null);
    setActiveRightPanel('covariates'); // Switch back to covariates tab
  };

  const clearCovariateFilter = () => {
    setSelectedItems([]);
    setSelectedCovariate(null);
    // Stay on MDS tab and reset to default section view
    // The MdsSnapshot component will handle resetting to Section A
  };


  const rightPanelOptions = [
    { id: 'instructions', label: 'Instructions' },
    { id: 'mds', label: 'MDS Data' },
    { id: 'covariates', label: 'Covariates' },
    { id: 'imputation', label: 'Imputation' }
  ];

  const handleTabChange = (tabId) => {
    // Clear covariate selection when navigating away from MDS tab
    if (activeRightPanel === 'mds' && tabId !== 'mds') {
      setSelectedItems([]);
      setSelectedCovariate(null);
    }
    setActiveRightPanel(tabId);
  };

  // Navigation logic
  const processedFiles = useMemo(() => 
    uploadedFiles.filter(f => f.status === 'processed'),
    [uploadedFiles]
  );
  
  const currentProcessedIndex = useMemo(() => 
    currentFile ? processedFiles.findIndex(f => f.id === currentFile.id) : -1,
    [currentFile, processedFiles]
  );
  
  const canGoPrevious = useMemo(() => 
    currentProcessedIndex > 0,
    [currentProcessedIndex]
  );
  
  const canGoNext = useMemo(() => 
    currentProcessedIndex < processedFiles.length - 1,
    [currentProcessedIndex, processedFiles.length]
  );

  const handlePreviousFile = useCallback(() => {
    if (canGoPrevious) {
      const previousFile = processedFiles[currentProcessedIndex - 1];
      const previousIndex = uploadedFiles.findIndex(f => f.id === previousFile.id);
      handleFileSelect(previousIndex);
      // URL will be updated by handleFileSelect
    }
  }, [canGoPrevious, processedFiles, uploadedFiles, handleFileSelect]);

  const handleNextFile = useCallback(() => {
    if (canGoNext) {
      const nextFile = processedFiles[currentProcessedIndex + 1];
      const nextIndex = uploadedFiles.findIndex(f => f.id === nextFile.id);
      handleFileSelect(nextIndex);
      // URL will be updated by handleFileSelect
    }
  }, [canGoNext, processedFiles, uploadedFiles, handleFileSelect]);

  const advancedNavbar = (
    <>
      <Navbar 
        onDrop={onDrop} 
        onExport={handleExport} 
        hasFile={hasFile} 
        fileName={fileName} 
        onUploadClick={handleUploadClick}
      />
      <ModeBanner 
        showBackToSummary={isViewingFileDetail}
        onBackToSummary={useCallback(() => {
          // Set flag to prevent auto-selection during navigation
          setIsNavigatingAway(true);
          
          // Save current modeled values to the current file before going back
          // Only save if the user has actually made changes
          if (currentFile && currentFile.status === 'processed') {
            const originalModeledValues = currentFile._rawData?.modeledValues || {};
            const hasChanges = JSON.stringify(modeledValues) !== JSON.stringify(originalModeledValues);
            
            if (hasChanges || currentFile.userModeledValues) {
              setUploadedFiles(prev => prev.map(f => 
                f.id === currentFile.id 
                  ? { 
                      ...f, 
                      userModeledValues: { ...modeledValues },
                      userCovariates: { ...covariates },
                      userWeightedScore: weightedScore,
                      userVersionMultipliers: { ...versionMultipliers },
                      userManualCovariateOverrides: { ...manualCovariateOverrides }
                    }
                  : f
              ));
            }
          }
          setCurrentFileIndex(-1);
          clearAllPatientData();
          navigate('/advanced/summary');
        }, [currentFile, modeledValues, covariates, weightedScore, versionMultipliers, manualCovariateOverrides, setUploadedFiles, clearAllPatientData, navigate])}
        onPreviousFile={handlePreviousFile}
        onNextFile={handleNextFile}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        showViewSummary={false}
      />
    </>
  );

  return (
    <div className={styles.appContainer}>
      <ValidationError 
        error={validationError}
        warning={validationWarning}
        onDismissError={() => setValidationError(null)}
        onDismissWarning={() => setValidationWarning(null)}
      />
      <BasicLayout 
        navbar={advancedNavbar}
        fullWidth={!hasFile}
        expandedRight={hasFile}
        rightPanel={!hasFile ? (
          // Welcome/Upload State - Full Width
          <div className={styles.welcomeSection}>
            <div className={styles.welcomeContainer}>
              <div className={styles.welcomeContent}>

                {/* Main Upload Section */}
                <div className={styles.uploadHero} onClick={() => uploadOpenFunctionRef.current?.()} style={{ cursor: 'pointer' }}>
                  <div className={styles.uploadIcon}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h2 className={styles.uploadTitle}>Upload Your MDS XML Files</h2>
                  <p className={styles.uploadDescription}>
                    <strong>Drag and drop multiple files</strong> or <strong>click here to upload</strong> your MDS XML files or ZIP archives for bulk analysis.
                  </p>
                  <div className={styles.fileTypeNote}>
                    <span className={styles.fileTypeIcon}>📄</span>
                    <span>XML files and ZIP archives supported • Bulk processing available</span>
                  </div>
                </div>


                {/* Upload Success Message */}
                {uploadedFiles.length > 0 && !hasFile && (
                  <div className={styles.uploadSuccessSection}>
                    <div className={styles.successMessage}>
                      <h3>✅ Files Uploaded Successfully!</h3>
                      <p>{uploadedFiles.length} file(s) processed. Navigate to the summary page to see your results.</p>
                    </div>
                  </div>
                )}


                {/* Privacy Notice Section - same as before */}
                <div className={styles.privacySection}>
                  <div className={styles.privacyHeader}>
                    <div className={styles.privacyIcon}>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C12 22 20 16 20 10V4L12 2L4 4V10C4 16 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h3 className={styles.privacyTitle}>Privacy & Data Protection</h3>
                    <p className={styles.privacySubtitle}>
                      This lightweight application is designed with your privacy and HIPAA compliance in mind, featuring enhanced security measures
                    </p>
                  </div>
                  
                  <div className={styles.privacyContent}>
                    <div className={styles.privacyItem}>
                      <div className={styles.privacyItemIcon}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 3H21V21H3V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M9 9H15V15H9V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <strong>No Data Storage</strong>
                        <p>Your files and patient data are never saved to our servers. Everything is processed locally in your browser.</p>
                      </div>
                    </div>
                    
                    <div className={styles.privacyItem}>
                      <div className={styles.privacyItemIcon}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <strong>Session-Based Processing</strong>
                        <p>Upload your files, analyze the data, and export results. The moment you refresh the page or leave the site, all data is gone.</p>
                      </div>
                    </div>
                    
                    <div className={styles.privacyItem}>
                      <div className={styles.privacyItemIcon}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <strong>Enhanced HIPAA Compliance</strong>
                        <p>Features comprehensive security headers, cache prevention, HTTPS enforcement, and automatic data cleanup for maximum privacy protection.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.rightPanelContainer}>
            {/* Unified Tab Container */}
            <div className={styles.unifiedTabContainer}>
              {/* Patient Header Section - now inside the unified container */}
              <div className={styles.patientHeaderSection}>
                <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
                  <PatientHeader
                    firstName={firstName}
                    lastName={lastName}
                    dob={dob}
                    age={age}
                    hasFile={hasFile}
                    isRedacted={isRedacted}
                    onToggleRedaction={toggleRedaction}
                    admitDate={admitDate}
                    ardDate={ardDate}
                    ardGapDays={ardGapDays}
                    facility={facility}
                    facilityName={facilityName}
                    facilityAddress={facilityAddress}
                    conditionCategory={conditionCategory}
                    mobilityType={mobilityType}
                  />
                </Suspense>
              </div>

              {/* Right Panel Navigation */}
              <div className={styles.rightPanelNavigation}>
                {rightPanelOptions.map(option => (
                  <button
                    key={option.id}
                    className={`${styles.panelButton} ${activeRightPanel === option.id ? styles.panelButtonActive : ''}`}
                    onClick={() => handleTabChange(option.id)}
                  >
                    <span className={styles.panelLabel}>{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Right Panel Content */}
              <div className={styles.rightPanelContent}>
              {activeRightPanel === 'instructions' && (
                <Suspense fallback={<div className={styles.loading}>Loading instructions...</div>}>
                  <InstructionPanel
                    title={instructionContent.advanced.title}
                    whatYoureDoing={instructionContent.advanced.whatYoureDoing}
                    howToUse={instructionContent.advanced.howToUse}
                    scoreValues={instructionContent.advanced.scoreValues}
                    noContainer={true}
                  />
                </Suspense>
              )}

              {activeRightPanel === 'mds' && (
                <div className={styles.mdsPanel}>
                  <Suspense fallback={<div className={styles.loading}>Loading MDS data...</div>}>
                    <MdsSnapshot
                      groupedSections={groupedSections}
                      descriptions={descriptions}
                      icd10Descriptions={icd10Descriptions}
                      selectedItems={selectedItems}
                      selectedCovariate={selectedCovariate}
                      onClearSelection={clearCovariateSelection}
                      onClearFilter={clearCovariateFilter}
                      isRedacted={isRedacted}
                    />
                  </Suspense>
                </div>
              )}

              {activeRightPanel === 'covariates' && (
                <div className={styles.covariatesPanel}>
                  <Suspense fallback={<div className={styles.loading}>Loading covariates...</div>}>
                    <Covariates
                      hasFile={hasFile}
                      covariates={covariates}
                      multipliers={versionMultipliers}
                      onCovariateClick={handleCovariateClick}
                      selectedCovariate={selectedCovariate}
                      ardDate={ardDate}
                      manualOverrides={manualCovariateOverrides}
                      onManualOverrideChange={setManualCovariateOverrides}
                      parsedValues={parsedValues}
                    />
                  </Suspense>
                </div>
              )}

              {activeRightPanel === 'imputation' && (
                <div className={styles.imputationPanel}>
                  <Suspense fallback={<div className={styles.loading}>Loading imputation analysis...</div>}>
                    <ImputationTab
                      hasFile={hasFile}
                      parsedValues={parsedValues}
                      startScores={startScores}
                      summary={extractPatientSummary(parsedValues, ardDate)}
                      icdList={Object.entries(parsedValues)
                        .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
                        .map(([_, value]) => value)
                        .filter(Boolean)}
                    />
                  </Suspense>
                </div>
              )}
              </div>
            </div>
          </div>
        )}
      >
        {hasFile ? (
          // Main Application State - ModelEndScore component
          <Suspense fallback={<div className={styles.loading}>Loading modeling tools...</div>}>
            <ModelEndScore
              modeledValues={modeledValues}
              startScores={startScores}
              subtotal={subtotal}
              modeledTotal={modeledTotal}
              handleTick={handleTick}
              setModeledValues={setModeledValues}
              hasFile={hasFile}
              parsedValues={parsedValues}
              weightedScore={weightedScore}
              mobilityType={mobilityType}
              imputedItems={imputedItems}
            />
          </Suspense>
        ) : null}
      </BasicLayout>

      {/* Hidden Export View */}
      <div style={{ display: "none" }}>
        <div ref={exportRef}>
          <Suspense fallback={<div>Loading...</div>}>
            <ExportView
              patient={{
                name: isRedacted ? redactFullName(firstName, lastName) : `${firstName} ${lastName}`,
                dob,
                age,
                admitDate,
                ard: ardDate,
                dischargeDate,
                facility: isRedacted ? redactFacility(facilityName) : facilityName,
                address: isRedacted ? redactAddress(facilityAddress) : facilityAddress,
              }}
              scores={{
                start: startTotal,
                expected: weightedScore,
                modeled: modeledTotal,
              }}
              functionItems={{
                scores: modeledValues,
                startScores: startScores,
                mobilityType: mobilityType
              }}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default AdvancedAppBulk;
