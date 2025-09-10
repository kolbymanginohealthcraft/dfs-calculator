import React from "react";
import { formatDOB } from "../utils/calculations";
import { redactFacility, redactAddress } from "../utils/redactionUtils";
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

  const displayFacilityName = isRedacted ? redactFacility(facilityName || `CCN: ${facility || "Unknown"}`) : (facilityName || `CCN: ${facility || "Unknown"}`);
  const displayFacilityAddress = isRedacted ? redactAddress(facilityAddress || "Unknown") : (facilityAddress || "Unknown");

  return (
    <div className={styles.overviewBlock}>
      <div className={styles.summaryDetails}>
        <div className={styles.summaryCol}>
          <h3 className={styles.sectionHeading}><ClipboardList size={20} /> Patient Characteristics</h3>
          <div className={styles.summaryItem}>
            <strong>Primary Condition</strong>
            <span>{conditionCategory || "Unknown"}</span>
          </div>
          <div className={styles.summaryItem}>
            <strong>Mobility Type</strong>
            <span>{mobilityType || "Unknown"}</span>
          </div>
        </div>

        <div className={styles.summaryCol}>
          <h3 className={styles.sectionHeading}><Building2 size={20} /> Facility Information</h3>
          <div className={styles.summaryItem}>
            <strong>Facility Name</strong>
            <span>{displayFacilityName}</span>
          </div>
          <div className={styles.summaryItem}>
            <strong>Address</strong>
            <span>{displayFacilityAddress}</span>
          </div>
        </div>

        <div className={styles.summaryCol}>
          <h3 className={styles.sectionHeading}><Calendar size={20} /> Episode Timeline</h3>
          <div className={styles.summaryItem}>
            <strong>Admit Date</strong>
            <span>{formatDOB(admitDate) || "Unknown"}</span>
          </div>
          <div className={styles.summaryItem}>
            <strong>Assessment Reference Date</strong>
            <span>
              {formatDOB(ardDate) || "Unknown"}
              {ardGapDays != null ? ` (Day ${ardGapDays})` : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientOverview;
