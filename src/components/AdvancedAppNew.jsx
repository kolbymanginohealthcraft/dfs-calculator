import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useDropzone } from "react-dropzone";
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

function AdvancedAppNew() {
  const [parsedValues, setParsedValues] = useState({});
  const [groupedSections, setGroupedSections] = useState({});
  const [modeledValues, setModeledValues] = useState({});
  const [startScores, setStartScores] = useState({});
  const [imputedItems, setImputedItems] = useState(new Set());
  const [fileName, setFileName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [isRedacted, setIsRedacted] = useState(true);
  const [activeRightPanel, setActiveRightPanel] = useState('instructions');
  const [covariates, setCovariates] = useState({});
  const [weightedScore, setWeightedScore] = useState(0);
  const uploadOpenFunctionRef = useRef(null);
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
      setImputedItems(new Set());
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
      setStartScores,
      setImputedItems
    );
  }, []);

  // Callback to receive the open function from navbar
  const handleUploadClick = useCallback((openFunction) => {
    uploadOpenFunctionRef.current = openFunction;
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
    { id: 'mds', label: 'MDS Data' },
    { id: 'covariates', label: 'Covariates' },
    { id: 'imputation', label: 'Imputation' }
  ];

  const advancedNavbar = (
    <>
      <Navbar onDrop={onDrop} onExport={handleExport} hasFile={hasFile} fileName={fileName} onUploadClick={handleUploadClick} />
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
                  <h2 className={styles.uploadTitle}>Upload Your MDS XML File</h2>
                  <p className={styles.uploadDescription}>
                    <strong>Drag and drop anywhere on the page</strong> or <strong>click here to upload</strong> your MDS XML file and begin comprehensive patient function analysis.
                  </p>
                  <div className={styles.fileTypeNote}>
                    <span className={styles.fileTypeIcon}>📄</span>
                    <span>XML files only • Standard MDS format supported</span>
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
                      This lightweight application is designed with your privacy and HIPAA compliance in mind
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
                        <p>Upload your file, analyze the data, and export results. The moment you refresh the page or leave the site, all data is gone.</p>
                      </div>
                    </div>
                    
                    <div className={styles.privacyItem}>
                      <div className={styles.privacyItemIcon}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <strong>HIPAA Compliant Design</strong>
                        <p>This intentional design ensures maximum privacy protection and compliance with healthcare data regulations.</p>
                      </div>
                    </div>
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
                    onClick={() => setActiveRightPanel(option.id)}
                  >
                    <span className={styles.panelLabel}>{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Right Panel Content */}
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

              <div className={styles.rightPanelContent}>
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

export default AdvancedAppNew;
