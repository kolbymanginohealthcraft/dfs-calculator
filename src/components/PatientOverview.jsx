import React from "react";
import { formatDOB } from "../utils/calculations";
import styles from "./PatientOverview.module.css";
import { ClipboardList, Building2, Calendar } from "lucide-react";

const PatientOverview = ({
  admitDate,
  ardDate,
  ardGapDays,
  facility,
  facilityName,
  facilityAddress,
  conditionCategory,
  mobilityType,
  hasFile,
  isRedacted,
}) => {
  if (!hasFile) {
    return (
      <div className={styles.overviewBlock}>
        <p className={styles.placeholder}>
          Upload a file to see patient overview.
        </p>
      </div>
    );
  }

  const displayFacilityName = isRedacted ? "REDACTED" : (facilityName || `CCN: ${facility || "Unknown"}`);
  const displayFacilityAddress = isRedacted ? "REDACTED" : (facilityAddress || "Unknown");

  return (
    <div className={styles.overviewBlock}>
      <div className={styles.summaryDetails}>
        <div className={styles.summaryCol}>
          <h3 className={styles.sectionHeading}><ClipboardList size={16} /> Patient Characteristics</h3>
          <div className={styles.summaryItem}>
            <strong>Primary Condition:</strong> {conditionCategory || "Unknown"}
          </div>
          <div className={styles.summaryItem}>
            <strong>Mobility Type:</strong> {mobilityType || "Unknown"}
          </div>
        </div>

        <div className={styles.summaryCol}>
          <h3 className={styles.sectionHeading}><Building2 size={16} /> Facility Info</h3>
          <div className={styles.summaryItem}>
            <strong>Name:</strong>{" "}
            {displayFacilityName}
          </div>
          <div className={styles.summaryItem}>
            <strong>Address:</strong> {displayFacilityAddress}
          </div>
        </div>

        <div className={styles.summaryCol}>
          <h3 className={styles.sectionHeading}><Calendar size={16} /> Episode Timeline</h3>
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

export default PatientOverview;
