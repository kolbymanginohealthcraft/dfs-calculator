import React from "react";
import { formatDOB } from "../utils/calculations";
import { redactName, redactFacility, redactAddress } from "../utils/redactionUtils";
import styles from "./PatientHeader.module.css";
import { Eye, EyeOff, User, Building2, Calendar, ClipboardList } from "lucide-react";

const PatientHeader = ({
  firstName,
  lastName,
  dob,
  age,
  hasFile,
  isRedacted,
  onToggleRedaction,
  // Overview data
  admitDate,
  ardDate,
  ardGapDays,
  facility,
  facilityName,
  facilityAddress,
  conditionCategory,
  mobilityType,
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

  const displayFirstName = isRedacted ? redactName(firstName || "Unknown") : (firstName || "Unknown");
  const displayLastName = isRedacted ? redactName(lastName || "") : (lastName || "");
  const displayFacilityName = isRedacted ? redactFacility(facilityName || `CCN: ${facility || "Unknown"}`) : (facilityName || `CCN: ${facility || "Unknown"}`);
  const displayFacilityAddress = isRedacted ? redactAddress(facilityAddress || "Unknown") : (facilityAddress || "Unknown");

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
            {isRedacted ? <><EyeOff className={styles.buttonIcon} /> Names are redacted</> : <><Eye className={styles.buttonIcon} /> Names are showing</>}
          </button>
        </div>
      </div>
      
      {/* Compact Overview Information */}
      <div className={styles.compactOverview}>
        <div className={styles.overviewColumn}>
          <div className={styles.overviewItem}>
            <Calendar size={14} />
            <span className={styles.overviewLabel}>Episode Start:</span>
            <span className={styles.overviewValue}>
              {formatDOB(admitDate) || "Unknown"}
              {ardGapDays != null && (
                <span className={styles.ardDayInfo}> (ARD on day {ardGapDays})</span>
              )}
            </span>
          </div>
          <div className={styles.overviewItem}>
            <ClipboardList size={14} />
            <span className={styles.overviewLabel}>Condition:</span>
            <span className={styles.overviewValue}>{conditionCategory || "Unknown"}</span>
          </div>
        </div>
        
        <div className={styles.overviewColumn}>
          <div className={styles.overviewItem}>
            <Building2 size={14} />
            <span className={styles.overviewLabel}>Facility:</span>
            <div className={styles.facilityInfo}>
              <span className={styles.overviewValue}>{displayFacilityName}</span>
              <span className={styles.facilityAddress}>{displayFacilityAddress}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientHeader;
