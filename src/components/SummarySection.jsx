import React from "react";
import { formatDOB } from "../utils/calculations";
import styles from "./SummarySection.module.css";
import { Eye, EyeOff, User, FileText, ClipboardList, Building2, Calendar } from "lucide-react";

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
  conditionCategory,
  mobilityType,
  hasFile,
  isRedacted,
  onToggleRedaction,
}) => {
  if (!hasFile) {
    return (
      <div className={styles.summaryBlock}>
        <p className={styles.placeholder}>
          Upload a file to see patient details.
        </p>
      </div>
    );
  }

  const displayFirstName = isRedacted ? "REDACTED" : (firstName || "Unknown");
  const displayLastName = isRedacted ? "REDACTED" : (lastName || "");
  const displayFacilityName = isRedacted ? "REDACTED" : (facilityName || `CCN: ${facility || "Unknown"}`);
  const displayFacilityAddress = isRedacted ? "REDACTED" : (facilityAddress || "Unknown");

  return (
    <div className={styles.summaryBlock}>
      <div className={styles.headerBlock}>
        <div className={styles.headerRow}>
          <h2 className={styles.summaryName}>
            <User size={16} fill="currentColor" /> {displayFirstName} {displayLastName}
            {dob && (
              <span className={styles.inlineDetails}>
                {" "} (age: {age}, DOB {formatDOB(dob)})
              </span>
            )}
          </h2>
          <div className={styles.headerControls}>
            <button
              className={styles.toggleButton}
              onClick={() => onToggleRedaction(!isRedacted)}
            >
              {isRedacted ? <><Eye className={styles.buttonIcon} /> Show Info</> : <><EyeOff className={styles.buttonIcon} /> Hide Info</>}
            </button>
            <p className={styles.fileInfo}><FileText size={16} /> {fileName || "Unknown file"}</p>
          </div>
        </div>
      </div>

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

export default SummarySection;
