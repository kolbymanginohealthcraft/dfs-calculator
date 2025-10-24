import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload } from 'lucide-react';
import BasicLayout from '../basic/components/BasicLayout';
import Navbar from './Navbar';
import ModeBanner from './ModeBanner';
import SummaryView from './SummaryView';
import PaginationControls from './PaginationControls';
import DataLossWarningModal from './DataLossWarningModal';
import { extractXmlFilesFromZip, isZipFile, createFileFromContent } from '../utils/zipHandler';
import { handleFileUploadWithValidation } from '../utils/enhancedFileParser';
import { calculateFunctionScore, getFunctionCovariates, extractPatientSummary, determineMobilityType, GG_ITEMS } from '../utils/calculations';
import { getFunctionMultipliers } from '../utils/coefficientLoader';
import { useBulkUpload } from '../contexts/BulkUploadContext';
import { useDataLossWarning } from '../contexts/DataLossWarningContext';
import { useRedaction } from '../contexts/RedactionContext';
import { redactName } from '../utils/redactionUtils';
import { storeFileData } from '../utils/fileDataManager';
import '../basic/styles/BasicLayout.css';
import styles from './AdvancedSummaryView.module.css';

const AdvancedSummaryView = () => {
  const navigate = useNavigate();
  const { 
    uploadedFiles, 
    setUploadedFiles, 
    isProcessing, 
    setProcessing,
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
    setItemsPerPageValue,
    getPaginatedFiles,
    getPaginationInfo,
    // Memory
    memoryUsage
  } = useBulkUpload();
  const { updateDataStatus, clearDataStatus } = useDataLossWarning();
  
  const { isRedacted, toggleRedaction } = useRedaction();
  const uploadOpenFunctionRef = useRef(null);
  
  const cancelledRef = useRef(false);
  const processingStartedRef = useRef(false);
  
  // State for data loss warning modals
  const [showClearWarning, setShowClearWarning] = useState(false);
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);

  // Track data changes for browser refresh warnings
  useEffect(() => {
    const hasFiles = uploadedFiles.length > 0;
    updateDataStatus('advancedFiles', hasFiles, 'Uploaded files and analysis results');
  }, [uploadedFiles.length, updateDataStatus]);


  // Start processing function
  const startProcessing = useCallback(async (filesToProcess) => {
    setProcessing(true);
    setCancelled(false);
    resetProgress();
    cancelledRef.current = false;

    setTotalFiles(filesToProcess.length);

    for (let i = 0; i < filesToProcess.length; i++) {
      if (cancelledRef.current) {
        break;
      }
      const fileObj = filesToProcess[i];
      
      // Check if file is still pending (not already processed)
      const currentFiles = uploadedFiles;
      const existingFile = currentFiles.find(f => f.id === fileObj.id);
      if (existingFile && existingFile.status !== 'pending') {
        continue;
      }
      
      await processFile(fileObj);
      setProcessed(i + 1);
    }
    setProcessing(false);
    resetProgress();
    processingStartedRef.current = false;
  }, [setProcessing, setCancelled, resetProgress, setTotalFiles, setProcessed, uploadedFiles]);

  // Removed debug logging for production
  
  // Auto-start processing when component mounts with pending files
  // Only process files that haven't been processed yet
  React.useEffect(() => {
    const pendingFiles = uploadedFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length > 0 && !isProcessing && !cancelledRef.current && !processingStartedRef.current) {
      processingStartedRef.current = true;
      startProcessing(pendingFiles);
    }
  }, [uploadedFiles, isProcessing, startProcessing]);

  // Cancel processing
  const handleCancelProcessing = useCallback(() => {
    cancelledRef.current = true;
    setCancelled(true);
    setProcessing(false);
    resetProgress();
    processingStartedRef.current = false;
  }, [setProcessing, setCancelled, resetProgress]);

  // Handle file uploads
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) {
      // Show confirmation modal for clearing files
      setShowClearWarning(true);
      return;
    }

    setProcessing(true);
    setCancelled(false);
    resetProgress();
    cancelledRef.current = false;
    const newFiles = [];

    for (const file of acceptedFiles) {
      // Just store the file reference - let processFile handle reading
      newFiles.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      return updated;
    });

    // Set total files to process
    const filesToProcess = newFiles.filter(f => f.status === 'pending');
    
    // Start processing the new files
    if (filesToProcess.length > 0) {
      startProcessing(filesToProcess);
    } else {
      setProcessing(false);
      resetProgress();
    }
  }, [setUploadedFiles, setProcessing, navigate, setCancelled, resetProgress, startProcessing]);

  // Process a single file
  const processFile = useCallback(async (fileObj) => {
    
    // Check if processing was cancelled
    if (cancelledRef.current) {
      return;
    }
    
    // Check if file is already being processed or processed
    const currentFiles = uploadedFiles;
    const existingFile = currentFiles.find(f => f.id === fileObj.id);
    if (existingFile && (existingFile.status === 'processing' || existingFile.status === 'processed')) {
      return;
    }
    
    try {
      // Check if this is a zip file and extract it first
      if (isZipFile(fileObj.file || fileObj)) {
        
        // Mark the zip file as processing immediately to prevent double processing
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'processing' } : f
        ));
        
        try {
          // Read the file as ArrayBuffer to avoid consumption issues
          const fileToRead = fileObj.file || fileObj;
          const arrayBuffer = await fileToRead.arrayBuffer();
          const extractedFiles = await extractXmlFilesFromZip(arrayBuffer);
          
          // Update the total file count to reflect the extracted files
          setTotalFiles(extractedFiles.length);
          
          // Create individual file entries for each extracted XML file
          const extractedFileEntries = [];
          let processedCount = 0;
          for (const extractedFile of extractedFiles) {
            // Check for cancellation before processing each extracted file
            if (cancelledRef.current) {
              break;
            }
            
            const xmlFileObj = createFileFromContent(extractedFile.name, extractedFile.content, extractedFile.size);
            
            // Process the XML file
            let parsedData = null;
            let groupedData = null;
            let modeledData = null;
            let startData = null;
            let imputedData = null;
            let validationError = null;

            const result = await handleFileUploadWithValidation(
              xmlFileObj,
              (name) => {}, // fileName callback - not used in summary view
              (data) => { parsedData = data; },
              (data) => { groupedData = data; },
              (data) => { modeledData = data; },
              (data) => { startData = data; },
              (data) => { imputedData = data; },
              null, // setValidationError - not used in summary view
              null, // setValidationWarning - not used in summary view
              (error) => {
                if (error && error !== null) {
                  // Store the detailed error message for later use
                  validationError = error;
                }
              }
            );

            // Wait a bit for all callbacks to complete
            await new Promise(resolve => setTimeout(resolve, 200));

            // Check for cancellation after file validation
            if (cancelledRef.current) {
              return;
            }
            
            if (result && parsedData && startData) {
              // Calculate scores
              const startScore = calculateFunctionScore(startData);
              
              // Calculate expected score using the same logic as AdvancedAppBulk
              let expectedScore = 0;
              let summary = null;
              let icdList = [];
              let covariateResult = null;
              
              try {
                summary = extractPatientSummary(parsedData);
                icdList = Object.entries(parsedData)
                  .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
                  .map(([_, value]) => value)
                  .filter(Boolean);
                
                const multipliers = getFunctionMultipliers(parsedData["A2300"]);
                covariateResult = getFunctionCovariates(
                  parsedData,
                  summary,
                  icdList,
                  startData,
                  parsedData["A2300"]
                );
                
                expectedScore = covariateResult?.weightedScore || 0;
              } catch (error) {
                expectedScore = 0;
              }
              
              // Check for cancellation before continuing
              if (cancelledRef.current) {
                return;
              }
              
              const scoreDifference = expectedScore - startScore;

              // Create summary data for lazy loading
              const summaryData = {
                startScore,
                expectedScore,
                scoreDifference,
                patientFirstName: parsedData?.["A0500A"] || '',
                patientLastName: parsedData?.["A0500C"] || '',
                mobilityType: determineMobilityType(startData),
                primaryCondition: summary?.primaryCondition || ''
              };

              // Store raw data for lazy loading (only when needed)
              const rawData = {
                parsedValues: parsedData,
                groupedSections: groupedData,
                modeledValues: modeledData,
                startScores: startData,
                imputedItems: imputedData
              };

              // Create a new file entry for this extracted XML file
              const fileId = `extracted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              const extractedFileEntry = {
                id: fileId,
                name: extractedFile.name,
                file: xmlFileObj,
                content: extractedFile.content,
                size: extractedFile.size,
                status: 'processed',
                results: summaryData,
                _rawData: rawData // Store the data directly for now
              };
              
              // Add successful file to uploadedFiles immediately so cards update in real-time
              setUploadedFiles(prev => {
                const withoutZip = prev.filter(f => f.id !== fileObj.id);
                return [...withoutZip, extractedFileEntry];
              });
            } else {
              // Create error entry for failed extraction
              const errorMessage = validationError ? validationError.message : 'Failed to process file - missing or invalid data';
              const errorFileEntry = {
                id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: extractedFile.name,
                status: 'error',
                error: errorMessage
              };
              
              // Add error file to uploadedFiles immediately so cards update in real-time
              setUploadedFiles(prev => {
                const withoutZip = prev.filter(f => f.id !== fileObj.id);
                return [...withoutZip, errorFileEntry];
              });
            }
            
            // Update progress for each processed file
            processedCount++;
            setProcessed(processedCount);
          }
          
          // Remove the original zip file (extracted files are already added above)
          setUploadedFiles(prev => prev.filter(f => f.id !== fileObj.id));
          
        } catch (error) {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, status: 'error', error: error.message }
              : f
          ));
        }
        return;
      }

      // Handle regular XML files
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileObj.id ? { ...f, status: 'processing' } : f
      ));
      
      const tempFile = fileObj.file || (fileObj instanceof File ? fileObj : createFileFromContent(fileObj.name, fileObj.content, fileObj.size));
      
      let parsedData = null;
      let groupedData = null;
      let modeledData = null;
      let startData = null;
      let imputedData = null;
      let validationError = null;

      const result = await handleFileUploadWithValidation(
        tempFile,
        (name) => {}, // fileName callback - not used in summary view
        (data) => { parsedData = data; },
        (data) => { groupedData = data; },
        (data) => { modeledData = data; },
        (data) => { startData = data; },
        (data) => { imputedData = data; },
        (error) => {
          // Only handle actual errors, not null values
          if (error && error !== null) {
            // Store the detailed error message for later use
            validationError = error;
          }
        }
      );

      // Wait a bit for all callbacks to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (result && parsedData && startData) {
        // Calculate scores
        const startScore = calculateFunctionScore(startData);
        
        // Calculate expected score using the same logic as AdvancedAppBulk
        let expectedScore = 0;
        let summary = null;
        let icdList = [];
        let covariateResult = null;
        
        try {
          summary = extractPatientSummary(parsedData, parsedData["A2300"]);
          icdList = Object.entries(parsedData)
            .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
            .map(([_, value]) => value)
            .filter(Boolean);
          
          const multipliers = getFunctionMultipliers(parsedData["A2300"]);
          covariateResult = getFunctionCovariates(
            parsedData,
            summary,
            icdList,
            startData,
            parsedData["A2300"]
          );
          
          expectedScore = covariateResult?.weightedScore || 0;
        } catch (error) {
          expectedScore = 0;
        }
        
        // Check for cancellation before continuing
        if (cancelledRef.current) {
          return;
        }
        
        const scoreDifference = expectedScore - startScore;

        // Create summary data for lazy loading
        const summaryData = {
          startScore,
          expectedScore,
          scoreDifference,
          patientFirstName: parsedData?.["A0500A"] || 'Unknown',
          patientLastName: parsedData?.["A0500C"] || 'Patient',
          mobilityType: 'Unknown' // This would need to be calculated
        };

        // Store raw data for lazy loading
        const rawData = {
          parsedValues: parsedData,
          groupedSections: groupedData,
          modeledValues: modeledData,
          startScores: startData,
          imputedItems: imputedData
        };

        // Update file with results
        setUploadedFiles(prev => {
          const updated = prev.map(f => 
            f.id === fileObj.id 
              ? { 
                  ...f, 
                  status: 'processed',
                  results: summaryData,
                  _rawData: rawData // Store the data directly for now
                }
            : f
          );
          return updated;
        });
      } else {
        const errorMessage = validationError ? validationError.message : 'Processing failed - missing data';
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'error', error: errorMessage } : f
        ));
      }
    } catch (error) {
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileObj.id ? { ...f, status: 'error', error: error.message } : f
      ));
    }
  }, [uploadedFiles]);

  // Handle file selection (navigate to detailed view)
  const handleFileSelect = useCallback((index) => {
    const file = uploadedFiles[index];
    if (file && file.status === 'processed') {
      // Navigate to the detailed view with the selected file using its unique ID
      navigate(`/advanced?fileId=${file.id}`);
    }
  }, [navigate, uploadedFiles]);

  // Handle export all
  const handleExportAll = useCallback((filesToExport = null) => {
    const filesToUse = filesToExport || uploadedFiles;
    const successfulFiles = filesToUse.filter(f => f.status === 'processed');
    if (successfulFiles.length === 0) return;

    const headers = [
      'File Name',
      'Patient First Name',
      'Patient Last Name',
      'Start Score',
      'Expected Score',
      'Modeled End Score',
      'End Score vs Expected',
      'Gain',
      'Required Gain'
    ];

    const rows = successfulFiles.map(file => {
      // Only calculate user end score if userModeledValues exists AND there's actual gain (end > start)
      let userEndScore = null;
      if (file.userModeledValues && calculateFunctionScore) {
        const endScore = calculateFunctionScore(file.userModeledValues);
        const startScore = file.results?.startScore || 0;
        // Only use the score if there's actual gain (end > start)
        userEndScore = endScore > startScore ? endScore : null;
      }
      const expectedScore = file.results?.expectedScore || 0;
      const startScore = file.results?.startScore || 0;
      
      // Separate end score values
      let endScoreValue = '';
      let endScoreComparison = '';
      if (userEndScore !== null) {
        endScoreValue = Math.round(userEndScore).toString();
        if (expectedScore !== undefined) {
          const diff = userEndScore - expectedScore;
          endScoreComparison = diff.toFixed(2);
        }
      }
      
      // Separate gain values
      let gainValue = '';
      let requiredGainValue = '';
      if (userEndScore !== null && startScore !== undefined) {
        const gain = userEndScore - startScore;
        gainValue = gain.toFixed(0);
      }
      if (expectedScore !== undefined && startScore !== undefined) {
        const required = expectedScore - startScore;
        requiredGainValue = required.toFixed(2);
      }
      
      return [
        file.name,
        isRedacted ? redactName(file.results?.patientFirstName || '') : (file.results?.patientFirstName || ''),
        isRedacted ? redactName(file.results?.patientLastName || '') : (file.results?.patientLastName || ''),
        startScore ? Math.round(startScore) : 0,
        expectedScore ? expectedScore.toFixed(2) : 0,
        endScoreValue,
        endScoreComparison,
        gainValue,
        requiredGainValue
      ];
    });

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
  }, [uploadedFiles, isRedacted]);

  // Handle detailed export with GG items as rows
  const handleExportDetails = useCallback((filesToExport = null) => {
    const filesToUse = filesToExport || uploadedFiles;
    const successfulFiles = filesToUse.filter(f => f.status === 'processed');
    if (successfulFiles.length === 0) return;

    const headers = [
      'File Name',
      'Patient First Name', 
      'Patient Last Name',
      'GG Item ID',
      'GG Item Label',
      'Domain',
      'Start Score',
      'Modeled End Score',
      'Score Change'
    ];

    const rows = [];
    
    successfulFiles.forEach(file => {
      const startScores = file._rawData?.startScores || {};
      const endScores = file.userModeledValues || startScores; // Use user modeled values if available, otherwise start scores
      
      // Get contributing GG items based on mobility type
      const mobilityType = file.results?.mobilityType || 'Unknown';
      const contributingItems = getContributingGGItemsForDetails(mobilityType);
      
      contributingItems.forEach(itemId => {
        const ggItem = GG_ITEMS.find(gi => gi.id === itemId);
        const startValue = startScores[itemId] || '';
        const endValue = endScores[itemId] || '';
        
        // Calculate score change (end - start)
        let scoreChange = '';
        if (startValue && endValue && startValue !== '' && endValue !== '') {
          const startNum = parseInt(startValue, 10);
          const endNum = parseInt(endValue, 10);
          if (!isNaN(startNum) && !isNaN(endNum)) {
            scoreChange = (endNum - startNum).toString();
          }
        }
        
        rows.push([
          file.name,
          isRedacted ? redactName(file.results?.patientFirstName || '') : (file.results?.patientFirstName || ''),
          isRedacted ? redactName(file.results?.patientLastName || '') : (file.results?.patientLastName || ''),
          itemId,
          ggItem?.label || itemId,
          ggItem?.domain || 'unknown',
          startValue,
          endValue,
          scoreChange
        ]);
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dfs-bulk-details-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [uploadedFiles, isRedacted]);

  // Helper function to get contributing GG items for detailed export
  const getContributingGGItemsForDetails = (mobilityType) => {
    const contributingItems = new Set();
    
    // Self-care items (always contributing)
    const selfCareItems = ['GG0130A', 'GG0130B', 'GG0130C'];
    selfCareItems.forEach(id => contributingItems.add(id));
    
    // Mobility items based on type
    if (mobilityType === 'Walk' || mobilityType === 'Unknown') {
      const walkItems = [
        'GG0170A', // Roll left and right
        'GG0170C', // Lying to sitting on bed side
        'GG0170D', // Sit to stand
        'GG0170E', // Chair/bed-to-chair transfer
        'GG0170F', // Toilet transfer
        'GG0170I', // Walk 10 feet
        'GG0170J', // Walk 50 feet with two turns
      ];
      walkItems.forEach(id => contributingItems.add(id));
    } else if (mobilityType === 'Wheel') {
      const wheelItems = [
        'GG0170A', // Roll left and right
        'GG0170C', // Lying to sitting on bed side
        'GG0170D', // Sit to stand
        'GG0170E', // Chair/bed-to-chair transfer
        'GG0170F', // Toilet transfer
        'GG0170R', // Wheel 50 feet with two turns
      ];
      wheelItems.forEach(id => contributingItems.add(id));
    } else {
      // Default to walk items if mobility type is unknown
      const defaultItems = [
        'GG0170A', 'GG0170C', 'GG0170D', 'GG0170E', 'GG0170F', 'GG0170I', 'GG0170J'
      ];
      defaultItems.forEach(id => contributingItems.add(id));
    }
    
    return Array.from(contributingItems);
  };

  // Handle clear all with confirmation
  const handleClearAll = useCallback(() => {
    setShowClearWarning(true);
  }, []);

  const handleConfirmClearAll = useCallback(() => {
    setUploadedFiles([]);
    setShowClearWarning(false);
    navigate('/advanced');
  }, [navigate]);

  const handleCancelClearAll = useCallback(() => {
    setShowClearWarning(false);
  }, []);

  // Handle switch to basic warning
  const handleSwitchToBasic = useCallback(() => {
    setShowSwitchWarning(true);
  }, []);

  const handleConfirmSwitch = useCallback(() => {
    setShowSwitchWarning(false);
    clearDataStatus(); // Clear the data status when user confirms the switch
    navigate('/basic/start-score');
  }, [navigate, clearDataStatus]);

  const handleCancelSwitch = useCallback(() => {
    setShowSwitchWarning(false);
  }, []);

  // Handle delete individual file
  const handleDeleteFile = useCallback((fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);


  // Handle upload click
  const handleUploadClick = useCallback((openFunction) => {
    uploadOpenFunctionRef.current = openFunction;
  }, []);

  // Remove useDropzone - we handle file drops through Navbar's onDrop prop
  // This prevents double processing of files

  const summaryNavbar = (
    <>
      <Navbar 
        onDrop={onDrop} 
        onExport={handleExportAll} 
        hasFile={uploadedFiles.length > 0} 
        fileName="" 
        onUploadClick={handleUploadClick}
        uploadedFiles={uploadedFiles}
      />
      <ModeBanner 
        uploadedFiles={uploadedFiles} 
        onSwitchToBasic={handleSwitchToBasic}
      />
    </>
  );

  return (
    <div className={styles.appContainer}>
      <BasicLayout 
        navbar={summaryNavbar}
        fullWidth={true}
        rightPanel={
          <div className={styles.summaryContainer}>
            {/* Enhanced Header Section */}
            <div className={styles.summaryHeader}>
              <div className={styles.headerContent}>
                <div className={styles.headerIcon}>
                  <FileText size={20} />
                </div>
                <div className={styles.headerText}>
                  <h2>Analysis Console</h2>
                  <p>Upload and analyze MDS files to compare function scores across patients</p>
                </div>
              </div>
              {uploadedFiles.length > 0 && (
                <div className={styles.headerStats}>
                  <div className={styles.statCard}>
                    <div className={styles.statMainContent}>
                      <span className={styles.statNumber}>{uploadedFiles.filter(f => f.status === 'processed' || f.status === 'error').length}</span>
                      <span className={styles.statLabel}>Files Analyzed</span>
                    </div>
                    <div className={styles.statBreakdown}>
                      <span className={styles.breakdownItem}>
                        <span className={styles.breakdownNumber}>{uploadedFiles.filter(f => f.status === 'processed').length}</span>
                        <span className={styles.breakdownLabel}>Success</span>
                      </span>
                      <span className={styles.breakdownItem}>
                        <span className={styles.breakdownNumber}>{uploadedFiles.filter(f => f.status === 'error').length}</span>
                        <span className={styles.breakdownLabel}>Errors</span>
                      </span>
                    </div>
                  </div>
                  {(() => {
                    const processedFiles = uploadedFiles.filter(f => f.status === 'processed' && f.results?.scoreDifference !== undefined);
                    const avgRequiredGain = processedFiles.length > 0 
                      ? (processedFiles.reduce((sum, f) => sum + f.results.scoreDifference, 0) / processedFiles.length).toFixed(1)
                      : '0.0';
                    return (
                      <div className={styles.statCard}>
                        <div className={styles.statMainContent}>
                          <span className={styles.statNumber}>{avgRequiredGain}</span>
                          <span className={styles.statLabel}>Avg Required Gain</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {uploadedFiles.length === 0 ? (
              <div className={styles.uploadSection}>
                <div className={styles.uploadArea}>
                  <div className={styles.uploadIcon}>
                    <Upload size={48} />
                  </div>
                  <h3>Upload MDS Files</h3>
                  <p>Drag and drop XML files or ZIP archives, or click to browse</p>
                  <div className={styles.fileTypeNote}>
                    <span className={styles.fileTypeIcon}>📄</span>
                    <span>XML files and ZIP archives supported • Bulk processing available</span>
                  </div>
                </div>
              </div>
            ) : isProcessing ? (
              <div className={styles.processingSection}>
                <div className={styles.processingContent}>
                  <div className={styles.processingIcon}>
                    <div className={styles.spinner}></div>
                  </div>
                  <h3>Processing Files</h3>
                  <p>Analyzing {totalFilesToProcess} file{totalFilesToProcess !== 1 ? 's' : ''}...</p>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ width: `${totalFilesToProcess > 0 ? (processedCount / totalFilesToProcess) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className={styles.progressText}>
                    {processedCount} of {totalFilesToProcess} files processed
                  </div>
                  <button 
                    className={styles.cancelButton}
                    onClick={handleCancelProcessing}
                  >
                    Cancel Processing
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.summarySection}>
                <SummaryView
                  uploadedFiles={uploadedFiles}
                  onSelectFile={handleFileSelect}
                  onExportAll={handleExportAll}
                  onExportDetails={handleExportDetails}
                  calculateFunctionScore={calculateFunctionScore}
                  onDeleteFile={handleDeleteFile}
                  onClearAll={handleClearAll}
                  isRedacted={isRedacted}
                  onToggleRedaction={toggleRedaction}
                  paginationInfo={getPaginationInfo()}
                  currentPage={currentPage}
                  totalItems={uploadedFiles.length}
                  onPageChange={goToPage}
                />
              </div>
            )}

          </div>
        }
      />
      
      {/* Data Loss Warning Modals */}
      <DataLossWarningModal
        isOpen={showClearWarning}
        onClose={handleCancelClearAll}
        onConfirm={handleConfirmClearAll}
        title="Clear All Files"
        message="Are you sure you want to clear all uploaded files and analysis results?"
        confirmText="Yes, Clear All Data"
        cancelText="Cancel"
      />
      
      <DataLossWarningModal
        isOpen={showSwitchWarning}
        onClose={handleCancelSwitch}
        onConfirm={handleConfirmSwitch}
        title="Switch to Basic Mode"
        message="You have uploaded files that will be lost if you switch to basic mode. Are you sure you want to continue?"
        confirmText="Yes, Switch"
        cancelText="Stay in Advanced"
      />
    </div>
  );
};

export default AdvancedSummaryView;
