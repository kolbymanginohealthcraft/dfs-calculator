import React from "react";
import { formatDOB } from "../utils/calculations";
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
  hasFile,
}) => {
  if (!hasFile) {
    return (
      <div className={styles.summaryBlock}>
        <h2 className={styles.summaryName}>👤 Patient Summary</h2>
        <p className={styles.placeholder}>Upload a file to see patient details.</p>
      </div>
    );
  }

  return (
    <div className={styles.summaryBlock}>
      <h2 className={styles.summaryName}>
        👤 {firstName || "Unknown"} {lastName || ""}, {formatDOB(dob) || "Unknown"}{" "}
        {age ? `(Age: ${age})` : ""}
      </h2>
      <p className={styles.fileInfo}>📎 File: {fileName || "Unknown file"}</p>

      <div className={styles.summaryDetails}>
        <div className={styles.summaryCol}>
          <h3 className={styles.sectionHeading}>📋 Patient Characteristics</h3>
          <div className={styles.summaryItem}>
            <strong>Primary Condition:</strong> {conditionCategory || "Unknown"}
          </div>
          <div className={styles.summaryItem}>
            <strong>Mobility Type:</strong> {mobilityType || "Unknown"}
          </div>
        </div>

        <div className={styles.summaryCol}>
          <h3 className={styles.sectionHeading}>🏥 Facility Info</h3>
          <div className={styles.summaryItem}>
            <strong>Name:</strong> {facilityName || `CCN: ${facility || "Unknown"}`}
          </div>
          <div className={styles.summaryItem}>
            <strong>Address:</strong> {facilityAddress || "Unknown"}
          </div>
        </div>

        <div className={styles.summaryCol}>
          <h3 className={styles.sectionHeading}>📆 Episode Timeline</h3>
          <div className={styles.summaryItem}>
            <strong>Admit Date:</strong> {formatDOB(admitDate) || "Unknown"}
          </div>
          <div className={styles.summaryItem}>
            <strong>ARD:</strong> {formatDOB(ardDate) || "Unknown"}{" "}
            {ardGapDays != null ? `(day ${ardGapDays})` : ""}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummarySection;
