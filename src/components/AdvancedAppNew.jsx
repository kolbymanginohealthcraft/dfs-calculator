import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { scoreMap, GG_ITEMS, conditionMap } from "../utils/calculations";
import {
  extractPatientSummary,
  determineMobilityType,
  calculateFunctionScore,
  getFunctionCovariates,
} from "../utils/calculations";
import { fetchFacilityInfo } from "../utils/facilityLookup";
import { handleFileUpload } from "../utils/fileParser";
import { functionMultipliers } from "../utils/functionMultipliers";
import { useICD10Lookup } from "../utils/useICD10Lookup";
import useValueDescriptions from "../utils/useValueDescriptions";
import html2pdf from "html2pdf.js";

import Navbar from "./Navbar";
import PatientHeader from "./PatientHeader";
import PatientOverview from "./PatientOverview";

// Lazy load heavy components to improve initial render performance
const MdsSnapshot = lazy(() => import("./MdsSnapshot"));
const ModelEndScore = lazy(() => import("./ModelEndScore"));
const Covariates = lazy(() => import("./Covariates"));
const ExportView = lazy(() => import("./ExportView"));

import "../index.css";
import styles from "./AdvancedAppNew.module.css";

function AdvancedAppNew() {
  const [parsedValues, setParsedValues] = useState({});
  const [groupedSections, setGroupedSections] = useState({});
  const [modeledValues, setModeledValues] = useState({});
  const [startScores, setStartScores] = useState({});
  const [fileName, setFileName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [isRedacted, setIsRedacted] = useState(true);
  const [activeRightPanel, setActiveRightPanel] = useState('overview');
  const exportRef = useRef();

  const icd10Descriptions = useICD10Lookup();
  const descriptions = useValueDescriptions();
  const ardDate = parsedValues["A2300"];

  const onDrop = useCallback((acceptedFiles) => {
    // If empty array is passed, clear the file
    if (acceptedFiles.length === 0) {
      setFileName("");
      setParsedValues({});
      setGroupedSections({});
      setModeledValues({});
      setStartScores({});
      return;
    }
    
    const file = acceptedFiles[0];
    handleFileUpload(
      file,
      setFileName,
      setParsedValues,
      setGroupedSections,
      setModeledValues,
      setStartScores
    );
  }, []);

  const handleTick = (key, delta) => {
    setModeledValues((prev) => {
      const raw = prev[key];
      const current = scoreMap[raw] ?? 0;
      const next = Math.max(1, Math.min(6, current + delta));
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

  const hasFile = !!fileName;

  const icdList = Object.entries(parsedValues)
    .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
    .map(([_, value]) => value)
    .filter(Boolean);

  const { covariates = {}, weightedScore = 0 } = hasFile
    ? getFunctionCovariates(
        parsedValues,
        extractPatientSummary(parsedValues, ardDate),
        icdList,
        startScores
      ) || {}
    : {};

  const handleCovariateClick = (itemsArray) => {
    // If the clicked items match what's already selected, clear them
    const isSameSelection =
      itemsArray.length === selectedItems.length &&
      itemsArray.every((item) => selectedItems.includes(item));

    const newSelection = isSameSelection ? [] : itemsArray;

    console.log("[AdvancedAppNew.jsx] Setting selectedItems to:", newSelection);
    setSelectedItems(newSelection);
  };

  const toggleRedaction = () => {
    setIsRedacted(!isRedacted);
  };

  const rightPanelOptions = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'mds', label: 'MDS Data', icon: '📋' },
    { id: 'covariates', label: 'Covariates', icon: '🔬' }
  ];

  return (
    <div className={styles.appContainer}>
      <Navbar onDrop={onDrop} onExport={handleExport} hasFile={hasFile} fileName={fileName} />

      {!hasFile ? (
        // Welcome/Upload State
        <div className={styles.welcomeSection}>
          <div className={styles.welcomeContainer}>
            <div className={styles.welcomeContent}>
              <div className={styles.welcomeIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <h1 className={styles.welcomeTitle}>Advanced DFS Calculator</h1>
              <div className={styles.uploadPrompt}>
                <div className={styles.uploadIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>
                <h2 className={styles.uploadTitle}>Upload Your MDS XML File</h2>
                <p className={styles.uploadDescription}>
                  <strong>Drag and drop your MDS XML file</strong> into the upload area above, or click the upload button to get started with comprehensive patient function analysis and discharge planning.
                </p>
                <div className={styles.fileTypeNote}>
                  <span className={styles.fileTypeIcon}>📄</span>
                  <span>Only XML files are supported</span>
                </div>
              </div>
              <div className={styles.welcomeFeatures}>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                  <div className={styles.featureContent}>
                    <h3>Automated Analysis</h3>
                    <p>Extract and analyze MDS data automatically</p>
                  </div>
                </div>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                    </svg>
                  </div>
                  <div className={styles.featureContent}>
                    <h3>Comprehensive Reports</h3>
                    <p>Generate detailed PDF reports with visualizations</p>
                  </div>
                </div>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div className={styles.featureContent}>
                    <h3>MDS Integration</h3>
                    <p>Seamless processing of MDS XML files</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Main Application State
        <div className={styles.mainContent}>
          <div className={styles.contentLeft}>
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
                  />
            </Suspense>
          </div>

          <div className={styles.contentRight}>
            {/* Patient Header Section - above the solid line */}
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
                />
              </Suspense>
            </div>

            {/* Unified Tab Container */}
            <div className={styles.unifiedTabContainer}>
              {/* Right Panel Navigation */}
              <div className={styles.rightPanelNavigation}>
                {rightPanelOptions.map(option => (
                  <button
                    key={option.id}
                    className={`${styles.panelButton} ${activeRightPanel === option.id ? styles.panelButtonActive : ''}`}
                    onClick={() => setActiveRightPanel(option.id)}
                  >
                    <span className={styles.panelIcon}>{option.icon}</span>
                    <span className={styles.panelLabel}>{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Right Panel Content */}
              <div className={styles.rightPanelContent}>
              {activeRightPanel === 'overview' && (
                <div className={styles.overviewPanel}>
                  <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
                    <PatientOverview
                      admitDate={admitDate}
                      ardDate={ardDate}
                      ardGapDays={ardGapDays}
                      facility={facility}
                      facilityName={facilityName}
                      facilityAddress={facilityAddress}
                      conditionCategory={conditionCategory}
                      mobilityType={mobilityType}
                      hasFile={hasFile}
                      isRedacted={isRedacted}
                    />
                  </Suspense>
                </div>
              )}

              {activeRightPanel === 'mds' && (
                <div className={styles.mdsPanel}>
                  <Suspense fallback={<div className={styles.loading}>Loading MDS data...</div>}>
                    <MdsSnapshot
                      groupedSections={groupedSections}
                      descriptions={descriptions}
                      icd10Descriptions={icd10Descriptions}
                      selectedItems={selectedItems}
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
                      multipliers={functionMultipliers}
                      onCovariateClick={handleCovariateClick}
                    />
                  </Suspense>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Export View */}
      <div style={{ display: "none" }}>
        <div ref={exportRef}>
          <Suspense fallback={<div>Loading...</div>}>
            <ExportView
              patient={{
                name: isRedacted ? "REDACTED REDACTED" : `${firstName} ${lastName}`,
                dob,
                age,
                admitDate,
                ard: ardDate,
                dischargeDate,
                facility: isRedacted ? "REDACTED" : facilityName,
                address: isRedacted ? "REDACTED" : facilityAddress,
              }}
              scores={{
                start: startTotal,
                expected: weightedScore,
                modeled: modeledTotal,
              }}
              covariates={Object.entries(covariates).map(([name, value]) => ({
                name,
                value,
                multiplier: functionMultipliers[name],
              }))}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default AdvancedAppNew;
