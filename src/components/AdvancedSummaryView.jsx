import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, File, Zap, AlertTriangle } from 'lucide-react';
import BasicLayout from '../basic/components/BasicLayout';
import Navbar from './Navbar';
import ModeBanner from './ModeBanner';
import SummaryView from './SummaryView';
import PaginationControls from './PaginationControls';
import DataLossWarningModal from './DataLossWarningModal';
import { extractXmlFilesFromZip, isZipFile, createFileFromContent } from '../utils/zipHandler';
import { handleFileUploadWithValidation } from '../utils/enhancedFileParser';
import { calculateFunctionScore, extractPatientSummary, determineMobilityType, GG_ITEMS } from '../utils/calculations';
import { calculateFunctionScore as calculateFunctionScoreSecure } from '../utils/secureApiClient';
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
                
                covariateResult = await calculateFunctionScoreSecure({
                  parsedValues: parsedData,
                  summary,
                  icdList,
                  startScores: startData,
                  ardDate: parsedData["A2300"],
                  manualOverrides: {}
                });
                
                expectedScore = covariateResult?.weightedScore || 0;
                console.log('Expected score calculated (bulk):', expectedScore, 'from result:', covariateResult);
              } catch (error) {
                console.error('Calculation failed (bulk):', error);
                console.error('Error details:', {
                  message: error.message,
                  status: error.status,
                  data: error.data
                });
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
          
          covariateResult = await calculateFunctionScoreSecure({
            parsedValues: parsedData,
            summary,
            icdList,
            startScores: startData,
            ardDate: parsedData["A2300"],
            manualOverrides: {}
          });
          
          expectedScore = covariateResult?.weightedScore || 0;
        } catch (error) {
          // Silently handle calculation errors - they're already shown in UI
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
    a.download = `dfs-summary-${new Date().toISOString().split('T')[0]}.csv`;
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
    a.download = `dfs-details-${new Date().toISOString().split('T')[0]}.csv`;
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
        rightPanel={uploadedFiles.length === 0 ? (
          // Upload State - Full Width Welcome Section
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
                  <h2 className={styles.uploadTitle}>Upload Your MDS Files</h2>
                  <p className={styles.uploadDescription}>
                    <strong>Drag and drop multiple files</strong> or <strong>click here to upload</strong> your MDS files in XML format or zipped folders for bulk analysis.
                  </p>
                  <div className={styles.fileTypeNote}>
                    <span className={styles.fileTypeIcon}>
                      <File size={16} />
                    </span>
                    <span>XML files and zipped folders supported • Bulk processing available</span>
                  </div>
                  <div className={styles.performanceNote}>
                    <span className={styles.performanceIcon}>
                      <Zap size={16} />
                    </span>
                    <span>For optimal performance, we recommend uploading no more than 100 files at once</span>
                  </div>
                </div>

                {/* Privacy Notice Section */}
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
                        <p>Your files and patient data are never permanently saved to our servers. File parsing happens in your browser, and calculations are securely processed through authenticated APIs. All session data is cleared when you leave the site.</p>
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

                {/* MDS Information Section */}
                <div className={styles.mdsInfoSection}>
                  <div className={styles.mdsInfoHeader}>
                    <h3>What is an MDS File?</h3>
                    <p>MDS (Minimum Data Set) files contain comprehensive patient assessment data used in healthcare facilities.</p>
                  </div>
                  
                  <div className={styles.mdsInfoContent}>
                    <div className={styles.mdsInfoText}>
                      <div className={styles.infoItem}>
                        <div className={styles.infoIcon}>
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 3V21H21M7 16L12 11L16 15L21 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <strong>Standardized Assessment</strong>
                          <p>Contains patient demographics, function scores, and clinical data</p>
                        </div>
                      </div>
                      <div className={styles.infoItem}>
                        <div className={styles.infoIcon}>
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 21H21L20 9H4L3 21ZM5 9H19L18 7H6L5 9ZM9 13H15V15H9V13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <strong>Healthcare Compliance</strong>
                          <p>Required documentation for Medicare and Medicaid reporting</p>
                        </div>
                      </div>
                      <div className={styles.infoItem}>
                        <div className={styles.infoIcon}>
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <strong>Automated Processing</strong>
                          <p>Our system extracts key metrics automatically from your MDS files in XML format</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={styles.xmlPreview}>
                      <div className={styles.xmlPreviewHeader}>
                        <span>Sample MDS File Structure (XML Format)</span>
                      </div>
                      <pre className={styles.xmlCode}>
{`<MDS>
  <A0100A>John</A0100A>
  <A0100B>Doe</A0100B>
  <A2300>2024-01-15</A2300>
  <GG0130A1>06</GG0130A1>
  <GG0130B1>05</GG0130B1>
  <GG0130C1>04</GG0130C1>
  <GG0170A1>03</GG0170A1>
  <GG0170B1>02</GG0170B1>
  <GG0170C1>01</GG0170C1>
</MDS>`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Analysis Overview Section */}
                <div className={styles.mdsItemsSection}>
                  <div className={styles.mdsItemsHeader}>
                    <div className={styles.mdsItemsIcon}>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h3>Why is the MDS file so important?</h3>
                    <p>This tool processes 110+ MDS data points to transform complex patient assessments into actionable discharge predictions.</p>
                  </div>
                  
                  <div className={styles.mdsItemsContent}>
                    {/* Core Components Overview */}
                    <div className={styles.analysisOverview}>
                      <div className={styles.analysisCard}>
                        <div className={styles.analysisIcon}>
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <h4>Functional Abilities</h4>
                        <p>Core mobility and self-care activities including eating, toileting, transfers, walking, and stairs</p>
                      </div>

                      <div className={styles.analysisCard}>
                        <div className={styles.analysisIcon}>
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <h4>Clinical Factors</h4>
                        <p>Medical conditions, cognitive status, BMI, nutrition, pain levels, and therapy services</p>
                      </div>

                      <div className={styles.analysisCard}>
                        <div className={styles.analysisIcon}>
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <h4>Medical History</h4>
                        <p>Primary diagnoses, comorbidities, and prior functional abilities</p>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
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

            {isProcessing ? (
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
                {uploadedFiles.length > 80 && (
                  <div className={styles.fileCountWarning}>
                    <span className={styles.warningIcon}>
                      <AlertTriangle size={16} />
                    </span>
                    <span>You have {uploadedFiles.length} files. For optimal performance, we recommend staying under 100 files.</span>
                  </div>
                )}
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
        )}
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
