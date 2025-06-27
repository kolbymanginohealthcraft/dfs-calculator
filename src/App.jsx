import { useState, useEffect, useCallback, useRef } from "react";
import { scoreMap, GG_ITEMS, conditionMap } from "./utils/calculations";
import {
  extractPatientSummary,
  determineMobilityType,
  calculateFunctionScore,
  getFunctionCovariates,
} from "./utils/calculations";
import { fetchFacilityInfo } from "./utils/facilityLookup";
import { handleFileUpload } from "./utils/fileParser";
import { functionMultipliers } from "./utils/functionMultipliers";
// import { covariateRelatedItems } from "./utils/covariateRelatedItems";
import { useICD10Lookup } from "./utils/useICD10Lookup";
import useValueDescriptions from "./utils/useValueDescriptions";
import html2pdf from "html2pdf.js";

import Navbar from "./components/Navbar";
import IntroPanel from "./components/IntroPanel";
import SummarySection from "./components/SummarySection";
import MdsSnapshot from "./components/MdsSnapshot";
import ModelEndScore from "./components/ModelEndScore";
import Covariates from "./components/Covariates";
import ExportView from "./components/ExportView";

import "./index.css";

function App() {
  const [parsedValues, setParsedValues] = useState({});
  const [groupedSections, setGroupedSections] = useState({});
  const [modeledValues, setModeledValues] = useState({});
  const [startScores, setStartScores] = useState({});
  const [fileName, setFileName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const icd10Descriptions = useICD10Lookup();
  const exportRef = useRef();

  const descriptions = useValueDescriptions();
  const ardDate = parsedValues["A2300"];

  const onDrop = useCallback((acceptedFiles) => {
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

    console.log("[App.jsx] Setting selectedItems to:", newSelection);
    setSelectedItems(newSelection);
  };

  return (
    <div className="app-container">
      <Navbar />
      <IntroPanel onDrop={onDrop} onExport={handleExport} hasFile={hasFile} />

      <div className="mainContent">
        <div className="mainLeft">
          <div className="summaryContainer">
            <div className="summaryInner">
              <SummarySection
                firstName={firstName}
                lastName={lastName}
                dob={dob}
                age={age}
                admitDate={admitDate}
                ardDate={ardDate}
                ardGapDays={ardGapDays}
                facility={facility}
                facilityName={facilityName}
                facilityAddress={facilityAddress}
                fileName={fileName}
                conditionCode={conditionCode}
                conditionCategory={conditionCategory}
                mobilityType={mobilityType}
                startScore={startTotal}
                modeledScore={modeledTotal}
                hasFile={hasFile}
              />
            </div>
          </div>
          <div className="summarySeparator" />

          <div className="snapshotCovariateRow">
            <div className="snapshotPanel scrollableContent">
              <MdsSnapshot
                groupedSections={groupedSections}
                descriptions={descriptions}
                icd10Descriptions={icd10Descriptions}
                selectedItems={selectedItems}
              />
            </div>
            <div className="covariatesPanel scrollableContent">
              <Covariates
                hasFile={hasFile}
                covariates={covariates}
                multipliers={functionMultipliers}
                onCovariateClick={handleCovariateClick}
              />
            </div>
          </div>
        </div>

        <div className="mainRight scrollableContent">
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
        </div>
      </div>

      <div style={{ display: "none" }}>
        <div ref={exportRef}>
          <ExportView
            patient={{
              name: `${firstName} ${lastName}`,
              dob,
              age,
              admitDate,
              ard: ardDate,
              dischargeDate,
              facility: facilityName,
              address: facilityAddress,
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
        </div>
      </div>
    </div>
  );
}

export default App;
