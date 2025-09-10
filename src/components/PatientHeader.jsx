import React from "react";
import { formatDOB } from "../utils/calculations";
import styles from "./PatientHeader.module.css";
import { Eye, EyeOff, User } from "lucide-react";

const PatientHeader = ({
  firstName,
  lastName,
  dob,
  age,
  hasFile,
  isRedacted,
  onToggleRedaction,
}) => {
  if (!hasFile) {
    return (
      <div className={styles.headerBlock}>
        <p className={styles.placeholder}>
          Upload a file to see patient details.
        </p>
      </div>
    );
  }

  const displayFirstName = isRedacted ? "REDACTED" : (firstName || "Unknown");
  const displayLastName = isRedacted ? "REDACTED" : (lastName || "");

  return (
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
        </div>
      </div>
    </div>
  );
};

export default PatientHeader;
