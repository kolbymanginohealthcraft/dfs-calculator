import React, { useState, useMemo } from "react";
import styles from "./Covariates.module.css";
import { BarChart3 } from "lucide-react";
import { covariateRelatedItems } from "../utils/covariateRelatedItems";
import { getVersionFromArdDate } from "../utils/coefficientLoader";

export default function Covariates({
  hasFile,
  covariates = {},
  multipliers = {},
  onCovariateClick,
  selectedItems = [],
  selectedCovariate = null,
  ardDate = null,
  manualOverrides = {},
  onManualOverrideChange = () => {},
  parsedValues = {},
}) {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Determine if we're using FY 2026 (Update ID 3) which has the discharge therapy covariate
  const version = getVersionFromArdDate(ardDate);
  
  // Check if discharge therapy data (O0425 items) is populated
  const therapyItems = ["O0425B1", "O0425B2", "O0425B3", "O0425C1", "O0425C2", "O0425C3"];
  const hasTherapyData = therapyItems.some(item => {
    const value = parsedValues[item];
    return value && value !== "^" && value !== "";
  });
  
  // Only show toggle for FY 2026 AND when therapy data is NOT available
  const showDischargeTherapyToggle = version?.updateId === "3" && !hasTherapyData;

  const formatNumber = (n) => Number(n).toFixed(2);
  const formatNumberDetailed = (n) => Number(n).toFixed(4);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (searchTerm) {
        // If there's a search term, clear it first
        setSearchTerm("");
      } else {
        // If search is empty, blur the input to exit focus
        e.target.blur();
      }
    }
  };

  const highlightMatch = (text, term) => {
    if (!term) return text;
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return text;

    return (
      <>
        {text.slice(0, index)}
        <mark>{text.slice(index, index + term.length)}</mark>
        {text.slice(index + term.length)}
      </>
    );
  };

  const activeCovariates = Object.entries(covariates)
    .filter(
      ([_, value]) => value !== 0 && value !== undefined && value !== null
    )
    .filter(([key]) => key.toLowerCase().includes(searchTerm.toLowerCase()));

  const groupedCovariates = {};
  for (const [key, value] of activeCovariates) {
    const group = covariateRelatedItems[key]?.group || "Other";
    if (!groupedCovariates[group]) groupedCovariates[group] = [];
    groupedCovariates[group].push([key, value]);
  }

  const handleRowClick = (key) => {
    const itemsUsed = covariateRelatedItems?.[key]?.items ?? [];
    if (itemsUsed.length === 0) return;

    if (onCovariateClick) {
      onCovariateClick(key, itemsUsed);
    }
  };

  const total = activeCovariates.reduce(
    (sum, [key, value]) => sum + value * (multipliers[key] ?? 0),
    0
  );
  
  const dischargeTherapyKey = "No Physical or Occupational Therapy - Discharge";
  const isDischargeTherapyActive = manualOverrides[dischargeTherapyKey] === 1;
  
  const handleDischargeTherapyToggle = () => {
    const newValue = isDischargeTherapyActive ? 0 : 1;
    onManualOverrideChange({
      ...manualOverrides,
      [dischargeTherapyKey]: newValue
    });
  };

  return (
    <div className={styles.covariatesPanel}>
      <div className={styles.sticky}>
        <div className={styles.covariatesHeader}>
          <h2><BarChart3 className={styles.headerIcon} /> Covariates</h2>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search covariates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.searchBar}
            />
            {searchTerm && (
              <button className={styles.clearButton} onClick={() => setSearchTerm("")}>
                ✕
              </button>
            )}
          </div>
        </div>
        {hasFile && (
          <>
            <p className={styles.covariateNote}>
              These items contributed to the expected discharge function score.
              Click a row to view its related MDS items in the MDS Data tab.
            </p>
            
            {showDischargeTherapyToggle && (
              <div className={styles.manualToggleSection}>
                <div className={styles.toggleLabel}>
                  <span className={styles.toggleTitle}>Manual Override (FY 2026)</span>
                  <span className={styles.toggleDescription}>
                    Discharge therapy data not available until patient discharge
                  </span>
                </div>
                <div className={styles.toggleControl}>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={isDischargeTherapyActive}
                      onChange={handleDischargeTherapyToggle}
                    />
                    <span className={styles.toggleSlider}></span>
                  </label>
                  <span className={styles.toggleText}>
                    {isDischargeTherapyActive ? "Applied" : "Not Applied"}
                  </span>
                </div>
                <div className={styles.toggleCovariateName}>
                  No PT/OT on Discharge
                  {isDischargeTherapyActive && multipliers[dischargeTherapyKey] && (
                    <span className={styles.toggleImpact}>
                      ({(multipliers[dischargeTherapyKey] > 0 ? "+" : "")}{multipliers[dischargeTherapyKey].toFixed(2)})
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

       <div className={styles.scrollArea}>
        {hasFile ? (
          <table className={styles.covariateTable}>
            <thead>
              <tr>
                <th>Covariate</th>
                <th style={{ textAlign: "right" }}>Coefficient</th>
                <th style={{ textAlign: "right" }}>Multiplier</th>
                <th style={{ textAlign: "right" }}>Contribution</th>
              </tr>
            </thead>
            {Object.entries(groupedCovariates)
              .sort(([groupA], [groupB]) => {
                if (groupA === "Baseline") return -1;
                if (groupB === "Baseline") return 1;
                return groupA.localeCompare(groupB);
              })

              .map(([group, covariates]) => (
                <tbody key={group}>
                  <tr className={styles.groupRow}>
                    <td colSpan="4">{group}</td>
                  </tr>
                  {covariates.map(([key, value]) => {
                    const multiplier = multipliers[key] ?? 0;
                    const subtotal = value * multiplier;
                    const itemsUsed = covariateRelatedItems?.[key]?.items ?? [];
                    const isClickable = itemsUsed.length > 0;
                    const isSelected = selectedCovariate === key;
                    const isDischargeTherapyRow = key === dischargeTherapyKey;

                    return (
                      <tr
                        key={key}
                        onClick={() => isClickable && handleRowClick(key)}
                        className={`${styles.row} ${
                          isSelected ? styles.selectedRow : ""
                        } ${!isClickable ? styles.disabledRow : ""} ${
                          isDischargeTherapyRow ? styles.dischargeTherapyRow : ""
                        }`}
                        title={!isClickable ? "No related MDS items" : ""}
                      >
                        <td>{highlightMatch(key, searchTerm)}</td>
                        <td>{value}</td>
                        <td>{formatNumberDetailed(multiplier)}</td>
                        <td>{formatNumberDetailed(subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}

            <tfoot>
              <tr className={styles.totalRow}>
                <td
                  colSpan="3"
                  style={{ textAlign: "right", fontWeight: "bold" }}
                >
                  Expected Discharge Function Score:
                </td>
                <td style={{ fontWeight: "bold" }}>{formatNumber(total)}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div className={styles.placeholder}></div>
        )}
      </div>
    </div>
  );
}
