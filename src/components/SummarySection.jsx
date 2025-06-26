import React from "react";
import { formatDOB } from "../utils/calculations";
import SummaryChart from "./SummaryChart";
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
}) => {
  return (
    <div className={styles.summaryBlock}>
      <h2 className={styles.summaryName}>
        👤 {firstName || "?"} {lastName || ""}, {formatDOB(dob)}{" "}
        {age ? `(Age: ${age})` : ""}
      </h2>

      <div className={styles.summaryDetails}>
        <div className={styles.sectionGroup}>
          <h3 className={styles.sectionHeading}>📋 Patient Characteristics</h3>
          <div
            className={styles.summaryItem}
            title={`I0020 = ${conditionCode || "?"}`}
          >
            <strong>Primary Condition:</strong> {conditionCategory}
          </div>
          <div className={styles.summaryItem}>
            <strong>Mobility Type:</strong> {mobilityType}
          </div>
        </div>

        <div className={styles.sectionGroup}>
          <h3 className={styles.sectionHeading}>🏥 Facility Info</h3>
          <div className={styles.summaryItem}>
            <strong>Name:</strong> {facilityName || `CCN: ${facility || "?"}`}
          </div>
          {facilityAddress && (
            <div className={styles.summaryItem}>
              <strong>Address:</strong> {facilityAddress}
            </div>
          )}
        </div>

        <div className={styles.sectionGroup}>
          <h3 className={styles.sectionHeading}>📆 Stay Timeline</h3>
          <div className={styles.summaryItem}>
            <strong>Admit Date:</strong> {formatDOB(admitDate)}
          </div>
          <div className={styles.summaryItem}>
            <strong>ARD:</strong> {formatDOB(ardDate)}{" "}
            {ardGapDays != null ? `(day ${ardGapDays})` : ""}
          </div>
        </div>

        <div className={styles.sectionGroup}>
          <h3 className={styles.sectionHeading}>📎 File Info</h3>
          <div className={styles.summaryItem}>
            <strong>File:</strong> {fileName}
          </div>
        </div>

        {/* 📊 Chart at the same level */}
        <div className={styles.sectionGroup}>
          <SummaryChart start={startScore} modeled={modeledScore} />
        </div>
      </div>
    </div>
  );
};

export default SummarySection;
