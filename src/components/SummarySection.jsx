import React from "react";
import { formatDOB } from "../utils/calculations";
// import SummaryChart from "./SummaryChart";
import styles from "./SummarySection.module.css";

const SummarySection = ({
  firstName,
  lastName,
  dob,
  age,
  admitDate,
  ardDate,
  ardGapDays,
  facility,
  facilityName,
  facilityAddress,
  fileName,
  conditionCode,
  conditionCategory,
  mobilityType,
  startScore,
  modeledScore,
  hasFile,
}) => {
  const displayValue = (value, fallback = "Not available") =>
    value ? value : fallback;

  if (!hasFile) {
    return (
      <div className={styles.summaryBlock}>
        <p className={styles.placeholderText}>
          💡 Patient summary details will appear here once an MDS XML file is uploaded.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.summaryBlock}>
      <h2 className={styles.summaryName}>
        👤 {displayValue(firstName, "First name missing")}{" "}
        {lastName || ""}, {formatDOB(dob) || "DOB not available"}{" "}
        {age ? `(Age: ${age})` : ""}
      </h2>

      <div className={styles.summaryDetails}>
        <div className={styles.sectionGroup}>
          <h3 className={styles.sectionHeading}>📋 Patient Characteristics</h3>
          <div
            className={styles.summaryItem}
            title={`I0020 = ${conditionCode || "?"}`}
          >
            <strong>Primary Condition:</strong>{" "}
            {displayValue(conditionCategory, "Not specified")}
          </div>
          <div className={styles.summaryItem}>
            <strong>Mobility Type:</strong>{" "}
            {displayValue(mobilityType, "Not assessed")}
          </div>
        </div>

        <div className={styles.sectionGroup}>
          <h3 className={styles.sectionHeading}>🏥 Facility Info</h3>
          <div className={styles.summaryItem}>
            <strong>Name:</strong>{" "}
            {facilityName
              ? facilityName
              : facility
              ? `CCN: ${facility}`
              : "Not available"}
          </div>
          <div className={styles.summaryItem}>
            <strong>Address:</strong>{" "}
            {displayValue(facilityAddress, "Not available")}
          </div>
        </div>

        <div className={styles.sectionGroup}>
          <h3 className={styles.sectionHeading}>📆 Episode Timeline</h3>
          <div className={styles.summaryItem}>
            <strong>Admit Date:</strong>{" "}
            {formatDOB(admitDate) || "Not available"}
          </div>
          <div className={styles.summaryItem}>
            <strong>ARD:</strong> {formatDOB(ardDate) || "Not available"}{" "}
            {ardGapDays != null ? `(day ${ardGapDays})` : ""}
          </div>
        </div>

        <div className={styles.sectionGroup}>
          <h3 className={styles.sectionHeading}>📎 File Info</h3>
          <div className={styles.summaryItem}>
            <strong>File:</strong> {fileName}
          </div>
        </div>

        {/* <div className={styles.chartSection}>
          <SummaryChart start={startScore} modeled={modeledScore} />
        </div> */}
      </div>
    </div>
  );
};

export default SummarySection;
