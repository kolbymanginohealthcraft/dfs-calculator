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
  fileName,
  conditionCode,
  conditionCategory,
  mobilityType,
}) => {
  return (
    <div className={styles.summaryBlock}>
      <h2 className={styles.summaryName}>
        👤 {firstName || "?"} {lastName || ""}
      </h2>

      <div className={styles.summaryDetails}>
        <div className={styles.summaryCol}>
          <div className={styles.summaryItem}>
            🎂 DOB: {formatDOB(dob)} {age ? `(Age: ${age})` : ""}
          </div>
          <div className={styles.summaryItem}>
            🛬 Admit Date: {formatDOB(admitDate)}
          </div>
          <div className={styles.summaryItem}>
            📅 ARD: {formatDOB(ardDate)}{" "}
            {ardGapDays != null ? `(day ${ardGapDays})` : ""}
          </div>
        </div>

        <div className={styles.summaryCol}>
          <div className={styles.summaryItem}>
            🏥 Facility: {facilityName || `CCN: ${facility || "?"}`}
          </div>
          <div className={styles.summaryItem}>🗂️ File: {fileName}</div>
          <div className={styles.summaryItem} title={`I0020 = ${conditionCode || "?"}`}>
            🧠 Primary Condition: {conditionCategory}
          </div>
          <div className={styles.summaryItem}>
            🚶 Mobility Type: {mobilityType}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummarySection;
