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
import { redactFullName, redactFacility, redactAddress } from "../utils/redactionUtils";
import html2pdf from "html2pdf.js";

import Navbar from "./Navbar";
import ModeBanner from "./ModeBanner";
import PatientHeader from "./PatientHeader";
import PatientOverview from "./PatientOverview";
import BasicLayout from "../basic/components/BasicLayout";

// Lazy load heavy components to improve initial render performance
const MdsSnapshot = lazy(() => import("./MdsSnapshot"));
const ModelEndScore = lazy(() => import("./ModelEndScore"));
const Covariates = lazy(() => import("./Covariates"));
const ExportView = lazy(() => import("./ExportView"));

import "../index.css";
import "../basic/styles/BasicLayout.css";
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
  const [activeRightPanel, setActiveRightPanel] = useState('instructions');
  const [covariates, setCovariates] = useState({});
  const [weightedScore, setWeightedScore] = useState(0);
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
      setCovariates({});
      setWeightedScore(0);
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
  const hasFile = !!fileName;

  useEffect(() => {
    fetchFacilityInfo(
      parsedValues?.A0100B,
      setFacilityName,
      setFacilityAddress
    );
  }, [parsedValues]);

  // Calculate covariates only once when file is loaded
  useEffect(() => {
    if (hasFile && Object.keys(parsedValues).length > 0 && Object.keys(startScores).length > 0) {
      const icdList = Object.entries(parsedValues)
        .filter(([key]) => key === "I0020B" || /^I8000[A-J]$/.test(key))
        .map(([_, value]) => value)
        .filter(Boolean);

      const result = getFunctionCovariates(
        parsedValues,
        extractPatientSummary(parsedValues, ardDate),
        icdList,
        startScores
      );

      if (result) {
        setCovariates(result.covariates || {});
        setWeightedScore(result.weightedScore || 0);
      }
    }
  }, [hasFile, parsedValues, startScores, ardDate]);

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
    { id: 'instructions', label: 'Instructions' },
    { id: 'overview', label: 'Overview' },
    { id: 'mds', label: 'MDS Data' },
    { id: 'covariates', label: 'Covariates' }
  ];

  const advancedNavbar = (
    <>
      <Navbar onDrop={onDrop} onExport={handleExport} hasFile={hasFile} fileName={fileName} />
      <ModeBanner />
    </>
  );

  return (
    <div className={styles.appContainer}>
      <BasicLayout 
        navbar={advancedNavbar}
        fullWidth={!hasFile}
        expandedRight={hasFile}
        rightPanel={!hasFile ? (
          // Welcome/Upload State - Full Width
          <div className={styles.welcomeSection}>
            <div className={styles.welcomeContainer}>
              <div className={styles.welcomeContent}>
                {/* Hero Section */}
                <div className={styles.heroSection}>
                  <div className={styles.heroIcon}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h1 className={styles.welcomeTitle}>Advanced DFS Calculator</h1>
                  <p className={styles.welcomeSubtitle}>
                    Comprehensive patient function analysis and discharge planning made simple
                  </p>
                </div>

                {/* Main Upload Section */}
                <div className={styles.uploadHero}>
                  <div className={styles.uploadIcon}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h2 className={styles.uploadTitle}>Upload Your MDS XML File</h2>
                  <p className={styles.uploadDescription}>
                    <strong>Drag and drop your MDS XML file</strong> into the upload area above, or click the upload button to begin comprehensive patient function analysis.
                  </p>
                  <div className={styles.fileTypeNote}>
                    <span className={styles.fileTypeIcon}>📄</span>
                    <span>XML files only • Standard MDS format supported</span>
                  </div>
                </div>


                {/* MDS Information Section */}
                <div className={styles.mdsInfoSection}>
                  <div className={styles.mdsInfoHeader}>
                    <h3>What is an MDS XML File?</h3>
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
                          <p>Our system extracts key metrics automatically from your XML files</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={styles.xmlPreview}>
                      <div className={styles.xmlPreviewHeader}>
                        <span>Sample MDS XML Structure</span>
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
                  />
                </Suspense>
              </div>

              {/* Right Panel Navigation */}
              <div className={styles.rightPanelNavigation}>
                {rightPanelOptions.map(option => (
                  <button
                    key={option.id}
                    className={`${styles.panelButton} ${activeRightPanel === option.id ? styles.panelButtonActive : ''}`}
                    onClick={() => setActiveRightPanel(option.id)}
                  >
                    <span className={styles.panelLabel}>{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Right Panel Content */}
              <div className={styles.rightPanelContent}>
              {activeRightPanel === 'instructions' && (
                <div className={styles.instructionsPanel}>
                  <Suspense fallback={<div className={styles.loading}>Loading instructions...</div>}>
                    <div className={styles.instructionContent}>
                      <h3 className={styles.instructionTitle}>Advanced DFS Calculator</h3>
                      
                      <div className={styles.instructionSection}>
                        <h4 className={styles.instructionSubtitle}>What you're doing:</h4>
                        <p className={styles.instructionText}>
                          Use the advanced DFS calculator to analyze patient function scores, review MDS data, and explore covariates that influence discharge planning.
                        </p>
                      </div>
                      
                      <div className={styles.instructionSection}>
                        <h4 className={styles.instructionSubtitle}>How to use:</h4>
                        <ul className={styles.instructionList}>
                          <li>Upload an MDS XML file to get started</li>
                          <li>Review patient overview and facility information</li>
                          <li>Examine MDS data sections and item values</li>
                          <li>Explore covariates and their impact on expected scores</li>
                          <li>Adjust function scores using the modeling tools</li>
                          <li>Export comprehensive PDF reports</li>
                        </ul>
                      </div>
                      
                      <div className={styles.instructionSection}>
                        <h4 className={styles.instructionSubtitle}>Score Values:</h4>
                        <div className="score-values">
                          <div className="score-value-item">
                            <span className="score-number">6</span>
                            <span className="score-description">Independent</span>
                          </div>
                          <div className="score-value-item">
                            <span className="score-number">5</span>
                            <span className="score-description">Supervision or Setup</span>
                          </div>
                          <div className="score-value-item">
                            <span className="score-number">4</span>
                            <span className="score-description">Minimal Assistance</span>
                          </div>
                          <div className="score-value-item">
                            <span className="score-number">3</span>
                            <span className="score-description">Moderate Assistance</span>
                          </div>
                          <div className="score-value-item">
                            <span className="score-number">2</span>
                            <span className="score-description">Maximal Assistance</span>
                          </div>
                          <div className="score-value-item">
                            <span className="score-number">1</span>
                            <span className="score-description">Dependent</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Suspense>
                </div>
              )}

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
