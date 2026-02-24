import { useState, useEffect, useCallback, useRef, lazy, Suspense, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { scoreMap, GG_ITEMS, conditionMap, resolveScore, scoreToStoredValue } from "../utils/calculations";
import {
  extractPatientSummary,
  determineMobilityType,
  calculateFunctionScore,
} from "../utils/calculations";
import { fetchFacilityInfo } from "../utils/facilityLookup";
import { calculateFunctionScore as calculateFunctionScoreSecure } from "../utils/secureApiClient";
import useValueDescriptions from "../utils/useValueDescriptions";
import { redactFullName, redactFacility, redactAddress } from "../utils/redactionUtils";
import { useBulkUpload } from "../contexts/BulkUploadContext";
import { useRedaction } from "../contexts/RedactionContext";
import { useDataLossWarning } from "../contexts/DataLossWarningContext";
import html2pdf from "html2pdf.js";

import Navbar from "./Navbar";
import ModeBanner from "./ModeBanner";
import PatientHeader from "./PatientHeader";
import ValidationError from "./ValidationError";
import FileManager from "./FileManager";
import SummaryView from "./SummaryView";
import BasicLayout from "../basic/components/BasicLayout";
import InstructionPanel from "../basic/components/InstructionPanel";
import DataLossWarningModal from "./DataLossWarningModal";
import { instructionContent } from "../data/instructionContent";

// Lazy load heavy components to improve initial render performance
const MdsSnapshot = lazy(() => import("./MdsSnapshot"));
const ModelEndScore = lazy(() => import("./ModelEndScore"));
const Covariates = lazy(() => import("./Covariates"));
const ImputationTab = lazy(() => import("./ImputationTab"));
const ExportView = lazy(() => import("./ExportView"));

import styles from "./AdvancedAppDetail.module.css";

function AdvancedAppDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Use bulk upload context
  const { uploadedFiles, setUploadedFiles } = useBulkUpload();
  const { updateDataStatus, clearDataStatus } = useDataLossWarning();
  
  // Use redaction context
  const { isRedacted, toggleRedaction } = useRedaction();
  
  // Local state for current file selection
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);
  const [showClearWarning, setShowClearWarning] = useState(false);
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  
  // Track data changes for browser refresh warnings
  // Only warn if there are processed files with results (not just pending uploads)
  useEffect(() => {
    const hasProcessedFiles = uploadedFiles.some(file => file.status === 'processed');
    updateDataStatus('advancedFiles', hasProcessedFiles, 'Uploaded files and analysis results');
  }, [uploadedFiles, updateDataStatus]);


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
  const exportRef = useRef();

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
  
  // Removed debug logging for production


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


  // File processing is handled by AdvancedSummaryView - this component only displays details

  // This component only handles detailed file view - no upload logic needed

  // Handle file selection
  const handleFileSelect = useCallback(async (index) => {
    
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
      
      // Load the selected file's detailed data into the current view
      setFileName(file.name);
      
      // Load detailed data from _rawData
      if (file._rawData) {
        setParsedValues(file._rawData.parsedValues || {});
        setGroupedSections(file._rawData.groupedSections || {});
        setStartScores(file._rawData.startScores || {});
        setImputedItems(file._rawData.imputedItems || new Set());
        
        // Load user's saved modeled values, or fall back to original modeled values
        setModeledValues(file.userModeledValues || file._rawData.modeledValues || {});
        setCovariates(file.userCovariates || file._rawData.covariates || {});
        const initialWeightedScore = file.userWeightedScore ?? 
          (file.results?.expectedScore !== undefined ? file.results.expectedScore : 0);
        setWeightedScore(initialWeightedScore);
        setVersionMultipliers(file.userVersionMultipliers || file._rawData.multipliers || {});
        setManualCovariateOverrides(file.userManualCovariateOverrides || {});
      } else {
        // Fallback to empty data if no data available
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
    }
  }, [uploadedFiles, currentFile, modeledValues, covariates, weightedScore, versionMultipliers, manualCovariateOverrides, navigate]);

  // Handle file parameter from URL (only once)
  useEffect(() => {
    const fileId = searchParams.get('fileId');
    
    // Only auto-select if we're on the detail view route and not already viewing a file
    // and not navigating away
    if (fileId !== null && uploadedFiles.length > 0 && currentFileIndex === -1 && !isNavigatingAway) {
      const index = uploadedFiles.findIndex(file => file.id === fileId);
      if (index >= 0) {
        handleFileSelect(index);
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

  // Clear all and export all functionality is handled by AdvancedSummaryView

  // Upload functionality is handled by AdvancedSummaryView

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

  const handleTick = useCallback((key, delta) => {
    setModeledValues((prev) => {
      const raw = prev[key];
      const current = resolveScore(raw);
      const startRaw = startScores[key];
      const startScore = resolveScore(startRaw);
      const isImputed = imputedItems.has(key);
      const hasNonIntegerStart = isImputed && !Number.isInteger(startScore);

      let next;

      if (hasNonIntegerStart) {
        const firstInt = Math.ceil(startScore);

        if (delta > 0) {
          if (!Number.isInteger(current)) {
            next = firstInt;
          } else {
            next = Math.min(6, current + 1);
          }
        } else {
          if (!Number.isInteger(current)) {
            next = current;
          } else if (current <= firstInt) {
            next = startScore;
          } else {
            next = current - 1;
          }
        }
      } else {
        next = Math.max(1, Math.min(6, current + delta));
        if (startRaw !== undefined) {
          next = Math.max(next, startScore);
        }
      }

      return { ...prev, [key]: scoreToStoredValue(next) };
    });
  }, [startScores, imputedItems]);

  // Memoize subtotals per domain to avoid recalculating on every render
  const subtotals = useMemo(() => {
    const domains = ['selfCare', 'mobility'];
    const result = {};
    domains.forEach(domain => {
      result[domain] = GG_ITEMS
        .filter((i) => i.domain === domain)
        .reduce((sum, i) => sum + resolveScore(modeledValues[i.id]), 0);
    });
    return result;
  }, [modeledValues]);

  const subtotal = useCallback((domain) => subtotals[domain] || 0, [subtotals]);

  const startTotal = calculateFunctionScore(startScores);
  const modeledTotal = calculateFunctionScore(modeledValues);

  // Memoize patient summary to avoid recalculating with same parameters
  const patientSummary = useMemo(() => 
    extractPatientSummary(parsedValues, ardDate), 
    [parsedValues, ardDate]
  );

  const {
    firstName,
    lastName,
    dob,
    facility,
    admitDate,
    dischargeDate,
    age,
    ardGapDays,
  } = patientSummary;

  const mobilityType = determineMobilityType(parsedValues);
  const conditionCode = parsedValues["I0020"];
  const conditionCategory = conditionMap[conditionCode] || "Unknown";

  // Memoize icdList for ImputationTab - prevents re-renders and effect re-runs when toggling GG items
  const imputationIcdList = useMemo(
    () =>
      Object.entries(parsedValues)
        .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
        .map(([_, value]) => value)
        .filter(Boolean),
    [parsedValues]
  );

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

  // Recalculate covariates only when manual overrides change.
  // On initial load, covariates/multipliers are already cached from bulk processing (_rawData)
  // or from a previous user session (userCovariates/userVersionMultipliers).
  useEffect(() => {
    if (hasFile && Object.keys(parsedValues).length > 0 && Object.keys(startScores).length > 0) {
      const hasManualOverrides = Object.keys(manualCovariateOverrides).length > 0;
      const hasCachedCovariates = Object.keys(covariates).length > 0 && Object.keys(versionMultipliers).length > 0;
      if (hasManualOverrides || !hasCachedCovariates) {
        const icdList = Object.entries(parsedValues)
          .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
          .map(([_, value]) => value)
          .filter(Boolean);

        const calculateScores = async () => {
          try {
            const result = await calculateFunctionScoreSecure({
              parsedValues,
              summary: extractPatientSummary(parsedValues, ardDate),
              icdList,
              startScores,
              ardDate,
              manualOverrides: manualCovariateOverrides
            });

            setVersionMultipliers(result.multipliers || {});
            setCovariates(result.covariates || {});
            // Only update weightedScore if we have manual overrides (which change the calculation)
            // Otherwise, keep the pre-calculated value for immediate display
            if (hasManualOverrides) {
              setWeightedScore(result.weightedScore || 0);
            }
          } catch (error) {
            // Silently handle calculation errors - they're already shown in UI if needed
          }
        };

        calculateScores();
      }
    }
  }, [hasFile, parsedValues, startScores, ardDate, manualCovariateOverrides, covariates, versionMultipliers]);

  const handleExport = async () => {
    if (!fileName) return;
    
    // If facility data is not yet loaded, fetch it first
    if (!facilityName && parsedValues?.A0100B) {
      try {
        const response = await fetch(`/api/facility-name/${parsedValues.A0100B}`);
        const result = await response.json();
        const fetchedFacilityName = result?.facility_name || `CCN: ${parsedValues.A0100B}`;
        const fetchedFacilityAddress = `${result?.address || ""}, ${result?.city || ""}, ${result?.state || ""} ${result?.zip || ""}`;
        
        // Update state with fetched data
        setFacilityName(fetchedFacilityName);
        setFacilityAddress(fetchedFacilityAddress);
        
        // Wait a moment for state to update, then generate PDF
        setTimeout(() => {
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
        }, 100);
        return;
      } catch (error) {
        // Continue with export even if facility fetch fails
      }
    }
    
    // If facility data is already available, export immediately
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

  // Handle clear all files with confirmation
  const handleClearAll = useCallback(() => {
    setShowClearWarning(true);
  }, []);

  // Handle file drops from detail view - process files and redirect to summary
  const handleFileDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) {
      // Empty array means clear button was clicked - show warning
      setShowClearWarning(true);
      return;
    }

    // Save current modeled values to the current file before processing new files
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

    // Create new file entries and add them to uploadedFiles
    const newFiles = [];
    for (const file of acceptedFiles) {
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
    
    // Navigate to summary page - the summary view will auto-process the pending files
    navigate('/advanced/summary');
  }, [currentFile, modeledValues, covariates, weightedScore, versionMultipliers, manualCovariateOverrides, setUploadedFiles, navigate]);

  const handleConfirmClearAll = useCallback(() => {
    setUploadedFiles([]);
    setCurrentFileIndex(-1);
    clearAllPatientData();
    setShowClearWarning(false);
    navigate('/advanced');
  }, [setUploadedFiles, clearAllPatientData, navigate]);

  const handleCancelClearAll = useCallback(() => {
    setShowClearWarning(false);
  }, []);

  const handleBackToSummary = useCallback(() => {
    setIsNavigatingAway(true);
    
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
  }, [currentFile, modeledValues, covariates, weightedScore, versionMultipliers, manualCovariateOverrides, setUploadedFiles, clearAllPatientData, navigate]);

  const advancedNavbar = (
    <>
      <Navbar 
        onDrop={handleFileDrop}
        onExport={handleExport} 
        hasFile={hasFile} 
        fileName={fileName} 
        uploadedFiles={uploadedFiles}
      />
      <ModeBanner 
        showBackToSummary={isViewingFileDetail}
        onBackToSummary={handleBackToSummary}
        onPreviousFile={handlePreviousFile}
        onNextFile={handleNextFile}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        showViewSummary={false}
        uploadedFiles={uploadedFiles}
        onSwitchToBasic={handleSwitchToBasic}
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
        fullWidth={false}
        expandedRight={true}
        rightPanel={(
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
                    fileName={fileName}
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
                      summary={patientSummary}
                      icdList={imputationIcdList}
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
      
      {/* Data Loss Warning Modal for Switch to Basic */}
      <DataLossWarningModal
        isOpen={showSwitchWarning}
        onClose={handleCancelSwitch}
        onConfirm={handleConfirmSwitch}
        title="Switch to Basic Mode"
        message="You have uploaded files that will be lost if you switch to basic mode. Are you sure you want to continue?"
        confirmText="Yes, Switch"
        cancelText="Stay in Advanced"
      />
      
      {/* Data Loss Warning Modal for Clear All Files */}
      <DataLossWarningModal
        isOpen={showClearWarning}
        onClose={handleCancelClearAll}
        onConfirm={handleConfirmClearAll}
        title="Clear All Files"
        message="Are you sure you want to clear all uploaded files and analysis results?"
        confirmText="Yes, Clear All Data"
        cancelText="Cancel"
      />
    </div>
  );
}

export default AdvancedAppDetail;
