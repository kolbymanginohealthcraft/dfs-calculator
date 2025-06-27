import React, { useState } from "react";
import styles from "./Covariates.module.css";
import { functionMultipliers } from "../utils/functionMultipliers";
import { covariateRelatedItems } from "../utils/covariateRelatedItems";

export default function Covariates({
  hasFile,
  covariates = {},
  multipliers = {},
  onCovariateClick,
  selectedItems = [],
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCovariate, setSelectedCovariate] = useState(null);

  const formatNumber = (n) => Number(n).toFixed(2);

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

    const isAlreadySelected = selectedCovariate === key;
    setSelectedCovariate(isAlreadySelected ? null : key);

    if (onCovariateClick) {
      onCovariateClick(isAlreadySelected ? [] : itemsUsed);
    }
  };

  const total = activeCovariates.reduce(
    (sum, [key, value]) => sum + value * (multipliers[key] ?? 0),
    0
  );

  return (
    <div className={styles.middlePanel}>
      <div className={styles.sticky}>
        <div className={styles.headerRow}>
          <h2>📊 Covariates</h2>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search covariates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchBar}
            />
            {searchTerm && (
              <button
                className={styles.clearButton}
                onClick={() => setSearchTerm("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {hasFile && (
          <p className={styles.covariateNote}>
            These items contributed to the expected discharge function score.
            Click a row to view its related MDS items (if available).
          </p>
        )}
      </div>

      <div className={styles.scrollArea}>
        {hasFile ? (
          <table className={styles.covariateTable}>
            <thead>
              <tr>
                <th>Covariate</th>
                <th style={{ textAlign: "right" }}>Value</th>
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

                    return (
                      <tr
                        key={key}
                        onClick={() => isClickable && handleRowClick(key)}
                        className={`${styles.row} ${
                          isSelected ? styles.selectedRow : ""
                        } ${!isClickable ? styles.disabledRow : ""}`}
                        title={!isClickable ? "No related MDS items" : ""}
                      >
                        <td>{highlightMatch(key, searchTerm)}</td>
                        <td>{value}</td>
                        <td>{formatNumber(multiplier)}</td>
                        <td>{formatNumber(subtotal)}</td>
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
