import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { scoreMap, GG_ITEMS, conditionMap } from "./utils/ggItems";
import {
  extractPatientSummary,
  determineMobilityType,
} from "./utils/calculations";
import { fetchFacilityInfo } from "./utils/facilityLookup";
import SummaryChart from "./components/SummaryChart";
import "./index.css";
import mdsItemLookup from "./data/mds_item_lookup.json";
import { handleFileUpload } from "./utils/fileParser";
import IntroPanel from "./components/IntroPanel";
import SummarySection from "./components/SummarySection";
import MdsSnapshot from "./components/MdsSnapshot";
import ModelEndScore from "./components/ModelEndScore";

function App() {
  const [parsedValues, setParsedValues] = useState({});
  const [groupedSections, setGroupedSections] = useState({});
  const [modeledValues, setModeledValues] = useState({});
  const [startScores, setStartScores] = useState({});
  const [fileName, setFileName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");

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

  const modeledTotal = GG_ITEMS.reduce(
    (sum, i) => sum + (scoreMap[modeledValues[i.id]] || 0),
    0
  );
  const startTotal = GG_ITEMS.reduce(
    (sum, i) => sum + (scoreMap[startScores[i.id]] || 0),
    0
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/xml": [".xml"] },
  });

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

  return (
    <div className="app-container">

      {/* Navbar */}
      <header className="navbar">
        <h1>Discharge Function Score Modeler</h1>
      </header>
      <IntroPanel onDrop={onDrop} />


      {/* Summary section */}
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
          fileName={fileName}
          conditionCode={conditionCode}
          conditionCategory={conditionCategory}
          mobilityType={mobilityType}
        />

        <SummaryChart start={startTotal} modeled={modeledTotal} />
      </div>

      {/* Main content area */}
      <div className="layout">
        {/* Left panel */}
        <MdsSnapshot groupedSections={groupedSections} />

        {/* Middle panel */}
        <div className="middlePanel">
          <div className="sticky">
            <h2>📊 Covariates</h2>
            <p>
              Coming soon: logic that explains how patient characteristics
              adjust the expected score.
            </p>
          </div>
          <div className="scrollArea">{/* Future: Covariate factors */}</div>
        </div>

        {/* Right panel */}
        <ModelEndScore
          modeledValues={modeledValues}
          startScores={startScores}
          subtotal={subtotal}
          modeledTotal={modeledTotal}
          handleTick={handleTick}
          setModeledValues={setModeledValues}
          hasFile={!!fileName} // ✅ add this line
        />
      </div>
    </div>
  );
}

export default App;
