import { useState, useEffect, useCallback, useRef } from "react";
import { scoreMap, GG_ITEMS, conditionMap } from "./utils/ggItems";
import {
  extractPatientSummary,
  determineMobilityType,
  calculateFunctionScore,
} from "./utils/calculations";
import { fetchFacilityInfo } from "./utils/facilityLookup";
import SummaryChart from "./components/SummaryChart";
import "./index.css";
import { handleFileUpload } from "./utils/fileParser";
import IntroPanel from "./components/IntroPanel";
import SummarySection from "./components/SummarySection";
import MdsSnapshot from "./components/MdsSnapshot";
import ModelEndScore from "./components/ModelEndScore";
import Covariates from "./components/Covariates";
import ExportView from "./components/ExportView";
import html2pdf from "html2pdf.js";

function App() {
  const [parsedValues, setParsedValues] = useState({});
  const [groupedSections, setGroupedSections] = useState({});
  const [modeledValues, setModeledValues] = useState({});
  const [startScores, setStartScores] = useState({});
  const [fileName, setFileName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");

  const exportRef = useRef();
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

  return (
    <div className="app-container">
      <header className="navbar">
        <h1>Discharge Function Score Modeler</h1>
      </header>

      <IntroPanel
        onDrop={onDrop}
        onExport={handleExport}
        hasFile={!!fileName}
      />

      <div className="topPanel">
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
        />
        {/* <SummaryChart start={startTotal} modeled={modeledTotal} /> */}
      </div>

      <div className="layout">
        <MdsSnapshot groupedSections={groupedSections} />
        <Covariates hasFile={!!fileName} />

        <ModelEndScore
          modeledValues={modeledValues}
          startScores={startScores}
          subtotal={subtotal}
          modeledTotal={modeledTotal}
          handleTick={handleTick}
          setModeledValues={setModeledValues}
          hasFile={!!fileName}
        />
      </div>

      <div style={{ display: "none" }}>
        <div ref={exportRef}>
          <ExportView
            patient={{
              name: `${firstName} ${lastName}`,
              facility: facilityName,
              dob,
              ard: ardDate,
            }}
            scores={{
              Start: startTotal,
              Modeled: modeledTotal,
              Expected: 16.4,
            }}
            covariates={[
              { name: "Comatose", value: -2.243 },
              { name: "Dialysis", value: -0.541 },
              { name: "Male", value: 0.043 },
              { name: "Hispanic", value: -0.215 },
              { name: "Pain interference", value: -0.121 },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
