import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload } from 'lucide-react';
import BasicLayout from '../basic/components/BasicLayout';
import Navbar from './Navbar';
import ModeBanner from './ModeBanner';
import SummaryView from './SummaryView';
import { extractXmlFilesFromZip, isZipFile, createFileFromContent } from '../utils/zipHandler';
import { handleFileUploadWithValidation } from '../utils/enhancedFileParser';
import { calculateFunctionScore, getFunctionCovariates, extractPatientSummary, determineMobilityType } from '../utils/calculations';
import { getFunctionMultipliers } from '../utils/coefficientLoader';
import { useBulkUpload } from '../contexts/BulkUploadContext';
import { useRedaction } from '../contexts/RedactionContext';
import { redactName } from '../utils/redactionUtils';
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
    resetProgress
  } = useBulkUpload();
  
  const { isRedacted, toggleRedaction } = useRedaction();
  const uploadOpenFunctionRef = useRef(null);
  
  const cancelledRef = useRef(false);
  const processingStartedRef = useRef(false);

  // Start processing function
  const startProcessing = useCallback(async (filesToProcess) => {
    setProcessing(true);
    setCancelled(false);
    resetProgress();
    cancelledRef.current = false;

    console.log('Starting processing for', filesToProcess.length, 'files');
    setTotalFiles(filesToProcess.length);
    console.log('Set total files to:', filesToProcess.length);

    for (let i = 0; i < filesToProcess.length; i++) {
      console.log(`Checking cancellation before file ${i + 1}, cancelledRef:`, cancelledRef.current);
      if (cancelledRef.current) {
        console.log('Processing cancelled by user');
        break;
      }
      const fileObj = filesToProcess[i];
      console.log(`Processing file ${i + 1} of ${filesToProcess.length}:`, fileObj.name);
      
      // Check if file is still pending (not already processed)
      const currentFiles = uploadedFiles;
      const existingFile = currentFiles.find(f => f.id === fileObj.id);
      if (existingFile && existingFile.status !== 'pending') {
        console.log('File already processed, skipping:', fileObj.id);
        continue;
      }
      
      await processFile(fileObj);
      console.log(`Setting processed count to: ${i + 1}`);
      setProcessed(i + 1);
    }
    setProcessing(false);
    resetProgress();
    processingStartedRef.current = false;
  }, [setProcessing, setCancelled, resetProgress, setTotalFiles, setProcessed, uploadedFiles]);

  // Debug: Log files when component mounts
  React.useEffect(() => {
    console.log('AdvancedSummaryView mounted, files:', uploadedFiles.length, uploadedFiles);
  }, [uploadedFiles]);
  
  // Auto-start processing when component mounts with pending files
  // Only process files that haven't been processed yet
  React.useEffect(() => {
    const pendingFiles = uploadedFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length > 0 && !isProcessing && !cancelledRef.current && !processingStartedRef.current) {
      console.log('Auto-starting processing for', pendingFiles.length, 'pending files');
      processingStartedRef.current = true;
      startProcessing(pendingFiles);
    }
  }, [uploadedFiles, isProcessing, startProcessing]);

  // Cancel processing
  const handleCancelProcessing = useCallback(() => {
    console.log('Cancel processing requested - current state:', {
      cancelledRef: cancelledRef.current,
      isProcessing,
      totalFilesToProcess,
      processedCount
    });
    cancelledRef.current = true;
    setCancelled(true);
    setProcessing(false);
    resetProgress();
    processingStartedRef.current = false;
    console.log('Cancel processing completed - cancelledRef set to:', cancelledRef.current);
  }, [setProcessing, setCancelled, resetProgress, isProcessing, totalFilesToProcess, processedCount]);

  // Handle file uploads
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) {
      // Clear all files and navigate back to advanced page
      setUploadedFiles([]);
      navigate('/advanced');
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
    console.log('Adding new files to context:', newFiles.map(f => ({ id: f.id, name: f.name })));
    setUploadedFiles(prev => {
      const updated = [...prev, ...newFiles];
      console.log('Updated uploadedFiles:', updated.map(f => ({ id: f.id, name: f.name, status: f.status })));
      return updated;
    });

    // Set total files to process
    const filesToProcess = newFiles.filter(f => f.status === 'pending');
    console.log('Files to process:', filesToProcess.length, filesToProcess.map(f => f.name));
    
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
    console.log('Starting to process file:', fileObj.id, fileObj.name);
    
    // Check if processing was cancelled
    if (cancelledRef.current) {
      console.log('Processing cancelled, skipping file:', fileObj.name);
      return;
    }
    
    // Check if file is already being processed or processed
    const currentFiles = uploadedFiles;
    const existingFile = currentFiles.find(f => f.id === fileObj.id);
    if (existingFile && (existingFile.status === 'processing' || existingFile.status === 'processed')) {
      console.log('File already processed or processing, skipping:', fileObj.id);
      return;
    }
    
    try {
      // Check if this is a zip file and extract it first
      if (isZipFile(fileObj.file || fileObj)) {
        console.log('Processing zip file:', fileObj.name);
        
        // Mark the zip file as processing immediately to prevent double processing
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'processing' } : f
        ));
        
        try {
          // Read the file as ArrayBuffer to avoid consumption issues
          const fileToRead = fileObj.file || fileObj;
          const arrayBuffer = await fileToRead.arrayBuffer();
          const extractedFiles = await extractXmlFilesFromZip(arrayBuffer);
          console.log('Extracted', extractedFiles.length, 'XML files from zip');
          
          // Update the total file count to reflect the extracted files
          setTotalFiles(extractedFiles.length);
          
          // Create individual file entries for each extracted XML file
          const extractedFileEntries = [];
          let processedCount = 0;
          for (const extractedFile of extractedFiles) {
            // Check for cancellation before processing each extracted file
            if (cancelledRef.current) {
              console.log('Processing cancelled during zip extraction');
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
                  console.error('File processing error:', error);
                  // Store the detailed error message for later use
                  validationError = error;
                }
              }
            );

            // Wait a bit for all callbacks to complete
            await new Promise(resolve => setTimeout(resolve, 200));

            // Check for cancellation after file validation
            if (cancelledRef.current) {
              console.log('Processing cancelled during file validation:', extractedFile.name);
              return;
            }

            console.log('Processing result:', { result, startData: !!startData, parsedData: !!parsedData, groupedData: !!groupedData, modeledData: !!modeledData });
            
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
                console.log('Expected score calculation:', { 
                  summary, 
                  icdList, 
                  multipliers, 
                  covariateResult,
                  expectedScoreFromResult: covariateResult?.weightedScore,
                  hasWeightedScore: 'weightedScore' in (covariateResult || {}),
                  covariateResultKeys: covariateResult ? Object.keys(covariateResult) : 'null'
                });
              } catch (error) {
                console.error('Error calculating expected score:', error);
                expectedScore = 0;
              }
              
              // Check for cancellation before continuing
              if (cancelledRef.current) {
                console.log('Processing cancelled during file processing:', extractedFile.name);
                return;
              }
              
              const scoreDifference = expectedScore - startScore;

              console.log('Score calculation details:', {
                startScore,
                expectedScore,
                scoreDifference,
                patientFirstName: parsedData?.["A0500A"],
                patientLastName: parsedData?.["A0500C"],
                covariateResult,
                summary,
                icdList,
                rawParsedData: {
                  A0500A: parsedData?.["A0500A"],
                  A0500C: parsedData?.["A0500C"],
                  A2300: parsedData?.["A2300"]
                },
                allParsedData: parsedData
              });

              // Create a new file entry for this extracted XML file
              const extractedFileEntry = {
                id: `extracted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: extractedFile.name,
                file: xmlFileObj,
                content: extractedFile.content,
                size: extractedFile.size,
                status: 'processed',
                results: {
                  startScore,
                  expectedScore,
                  scoreDifference,
                  patientFirstName: parsedData?.["A0500A"] || '',
                  patientLastName: parsedData?.["A0500C"] || '',
                  mobilityType: determineMobilityType(startData),
                  primaryCondition: summary?.primaryCondition || ''
                },
                _rawData: {
                  parsedValues: parsedData,
                  groupedSections: groupedData,
                  modeledValues: modeledData,
                  startScores: startData,
                  imputedItems: imputedData
                }
              };
              
              // Add successful file to uploadedFiles immediately so cards update in real-time
              setUploadedFiles(prev => {
                const withoutZip = prev.filter(f => f.id !== fileObj.id);
                return [...withoutZip, extractedFileEntry];
              });
            } else {
              console.log('Processing failed - result:', result, 'parsedData:', !!parsedData, 'startData:', !!startData);
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
            console.log(`Processed ${processedCount} of ${extractedFiles.length} extracted files`);
          }
          
          // Remove the original zip file (extracted files are already added above)
          setUploadedFiles(prev => prev.filter(f => f.id !== fileObj.id));
          
        } catch (error) {
          console.error('Failed to extract zip file:', error);
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
            console.error('File processing error:', error);
            // Store the detailed error message for later use
            validationError = error;
          }
        }
      );

      // Wait a bit for all callbacks to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('Processing result:', { result, startData: !!startData, parsedData: !!parsedData, groupedData: !!groupedData, modeledData: !!modeledData });
      
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
          console.log('Expected score calculation:', { 
            summary, 
            icdList, 
            multipliers, 
            covariateResult,
            expectedScoreFromResult: covariateResult?.weightedScore,
            hasWeightedScore: 'weightedScore' in (covariateResult || {}),
            covariateResultKeys: covariateResult ? Object.keys(covariateResult) : 'null'
          });
        } catch (error) {
          console.error('Error calculating expected score:', error);
          expectedScore = 0;
        }
        
        // Check for cancellation before continuing
        if (cancelledRef.current) {
          console.log('Processing cancelled during file processing:', fileObj.name);
          return;
        }
        
        const scoreDifference = expectedScore - startScore;

        console.log('Score calculation details:', {
          startScore,
          expectedScore,
          scoreDifference,
          patientFirstName: parsedData?.["A0500A"],
          patientLastName: parsedData?.["A0500C"],
          covariateResult,
          summary,
          icdList,
          rawParsedData: {
            A0500A: parsedData?.["A0500A"],
            A0500C: parsedData?.["A0500C"],
            A2300: parsedData?.["A2300"]
          },
          allParsedData: parsedData
        });

        // Update file with results
        setUploadedFiles(prev => {
          const updated = prev.map(f => 
            f.id === fileObj.id 
              ? { 
                  ...f, 
                  status: 'processed',
                  results: {
                    startScore,
                    expectedScore,
                    scoreDifference,
                    patientFirstName: parsedData?.["A0500A"] || 'Unknown',
                  patientLastName: parsedData?.["A0500C"] || 'Patient',
                  mobilityType: 'Unknown' // This would need to be calculated
                },
                _rawData: {
                  parsedValues: parsedData,
                  groupedSections: groupedData,
                  modeledValues: modeledData,
                  startScores: startData,
                  imputedItems: imputedData
                }
              }
            : f
          );
          console.log('Updated file after processing:', updated.find(f => f.id === fileObj.id));
          return updated;
        });
      } else {
        console.log('Processing failed - result:', result, 'parsedData:', !!parsedData, 'startData:', !!startData);
        const errorMessage = validationError ? validationError.message : 'Processing failed - missing data';
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'error', error: errorMessage } : f
        ));
      }
    } catch (error) {
      console.error('Error processing file:', fileObj.name, error);
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileObj.id ? { ...f, status: 'error', error: error.message } : f
      ));
    }
  }, [uploadedFiles]);

  // Handle file selection (navigate to detailed view)
  const handleFileSelect = useCallback((index) => {
    const file = uploadedFiles[index];
    console.log('AdvancedSummaryView - File selection:', {
      index,
      fileId: file?.id,
      fileName: file?.name,
      status: file?.status,
      allFileIds: uploadedFiles.map(f => ({ id: f.id, name: f.name, status: f.status }))
    });
    if (file && file.status === 'processed') {
      // Navigate to the detailed view with the selected file using its unique ID
      console.log('Navigating to:', `/advanced?fileId=${file.id}`);
      navigate(`/advanced?fileId=${file.id}`);
    } else {
      console.log('Cannot navigate to file - status is not processed:', file?.status);
    }
  }, [navigate, uploadedFiles]);

  // Handle export all
  const handleExportAll = useCallback(() => {
    const successfulFiles = uploadedFiles.filter(f => f.status === 'processed');
    if (successfulFiles.length === 0) return;

    const headers = [
      'File Name',
      'Patient First Name',
      'Patient Last Name',
      'Start Score',
      'Expected Score',
      'End Score',
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
  }, [uploadedFiles]);

  // Handle clear all
  const handleClearAll = useCallback(() => {
    setUploadedFiles([]);
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
      />
      <ModeBanner />
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
                  <FileText size={32} />
                </div>
                <div className={styles.headerText}>
                  <h2>Bulk DFS Calculator</h2>
                  <p>Upload and analyze multiple MDS files to compare function scores across patients</p>
                </div>
              </div>
              {uploadedFiles.length > 0 && (
                <div className={styles.headerStats}>
                  <div className={styles.statCard}>
                    <span className={styles.statNumber}>{uploadedFiles.filter(f => f.status === 'processed').length}</span>
                    <span className={styles.statLabel}>Ready</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statNumber}>{uploadedFiles.filter(f => f.status === 'error').length}</span>
                    <span className={styles.statLabel}>Errors</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statNumber}>{uploadedFiles.filter(f => f.status === 'processed' || f.status === 'error').length}</span>
                    <span className={styles.statLabel}>Completed</span>
                  </div>
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
                  calculateFunctionScore={calculateFunctionScore}
                  onDeleteFile={handleDeleteFile}
                  isRedacted={isRedacted}
                  onToggleRedaction={toggleRedaction}
                />
              </div>
            )}

          </div>
        }
      />
    </div>
  );
};

export default AdvancedSummaryView;
