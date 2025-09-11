import React, { useState, useMemo } from "react";
import styles from "./ImputationTab.module.css";
import { Calculator } from "lucide-react";
import { imputationMultipliers } from "../utils/imputationMultipliers";
import { getImputationThresholds } from "../utils/imputationCalculations";
import { getFunctionCovariates, GG_ITEMS } from "../utils/calculations";

export default function ImputationTab({
  hasFile,
  parsedValues = {},
  startScores = {},
  summary = {},
  icdList = [],
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGGItem, setSelectedGGItem] = useState(null);

  const formatNumber = (n) => Number(n).toFixed(4);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (searchTerm) {
        setSearchTerm("");
      } else {
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
        {text.slice(index + index + term.length)}
      </>
    );
  };

  // Helper function to get covariate value
  const getCovariateValue = (covariateName, parsedValues, summary, icdList, startScores) => {
    // Use the existing covariate calculation logic
    const result = getFunctionCovariates(parsedValues, summary, icdList, startScores);
    return result?.covariates?.[covariateName] || 0;
  };

  // Helper function to get GG item label (following FunctionItemsList.jsx pattern)
  const getGGItemLabel = (ggItemId) => {
    // Remove the "1" suffix from the GG item ID to match GG_ITEMS format
    const baseId = ggItemId.replace(/1$/, '');
    const ggItem = GG_ITEMS.find(item => item.id === baseId);
    
    if (ggItem) {
      // Extract the letter from the ID (e.g., "GG0130A" -> "A") - same as FunctionItemsList.jsx
      const letter = baseId.slice(-1);
      return `${letter}. ${ggItem.label}`;
    }
    
    return ggItemId;
  };

  // Calculate imputation data for each GG item
  const imputationData = useMemo(() => {
    if (!hasFile || !parsedValues || !startScores) return {};

    const data = {};
    const ggItems = Object.keys(imputationMultipliers);

    for (const ggItemId of ggItems) {
      const multipliers = imputationMultipliers[ggItemId];
      const thresholds = getImputationThresholds(ggItemId);
      
      // Get covariates for this specific GG item
      const covariates = {};
      let imputationScore = 0;

      // Calculate imputation score using covariate * multiplier
      for (const [covariateName, multiplier] of Object.entries(multipliers)) {
        // Get covariate value from the main covariate calculation
        const covariateValue = getCovariateValue(covariateName, parsedValues, summary, icdList, startScores);
        
        if (covariateValue !== 0) {
          covariates[covariateName] = covariateValue;
          imputationScore += covariateValue * multiplier;
        }
      }

      // Determine which threshold range the score falls into
      let imputedValue = 1; // Default to 1
      for (let i = 0; i < thresholds.length; i++) {
        if (imputationScore > thresholds[i]) {
          imputedValue = i + 2; // 2, 3, 4, 5, 6
        }
      }

      // Check raw MDS value to determine if imputation is needed
      const rawValue = parsedValues[ggItemId];
      const isValidValue = rawValue && ['01', '02', '03', '04', '05', '06'].includes(rawValue);
      const needsImputation = !rawValue || !isValidValue;

      data[ggItemId] = {
        covariates,
        multipliers,
        imputationScore,
        thresholds,
        imputedValue: needsImputation ? imputedValue : null,
        originalValue: rawValue || null,
        needsImputation
      };
    }

    return data;
  }, [hasFile, parsedValues, startScores, summary, icdList]);

  // Filter GG items based on search term
  const filteredGGItems = Object.entries(imputationData)
    .filter(([ggItemId]) => {
      const label = getGGItemLabel(ggItemId);
      const searchLower = searchTerm.toLowerCase();
      return (
        ggItemId.toLowerCase().includes(searchLower) ||
        ggItemId.replace('GG', '').toLowerCase().includes(searchLower) ||
        label.toLowerCase().includes(searchLower)
      );
    });

  const handleRowClick = (ggItemId) => {
    setSelectedGGItem(selectedGGItem === ggItemId ? null : ggItemId);
  };

  return (
    <div className={styles.imputationPanel}>
      <div className={styles.sticky}>
        <div className={styles.imputationHeader}>
          <h2><Calculator className={styles.headerIcon} /> Imputation Analysis</h2>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search GG items..."
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
          <p className={styles.imputationNote}>
            This shows how missing or invalid GG items are imputed using covariates and thresholds.
            Click a row to see detailed covariate breakdown.
          </p>
        )}
      </div>

      <div className={styles.scrollArea}>
        {hasFile ? (
          <table className={styles.imputationTable}>
            <thead>
              <tr>
                <th>GG Item</th>
                <th style={{ textAlign: "right" }}>Raw MDS</th>
                <th style={{ textAlign: "right" }}>Imputed</th>
                <th style={{ textAlign: "right" }}>Score</th>
                <th style={{ textAlign: "center" }}>Needs Imputation</th>
              </tr>
            </thead>
            <tbody>
              {filteredGGItems.map(([ggItemId, data]) => {
                const isSelected = selectedGGItem === ggItemId;
                const hasCovariates = Object.keys(data.covariates).length > 0;
                const canExpand = data.needsImputation && hasCovariates;

                return (
                  <React.Fragment key={ggItemId}>
                    <tr
                      onClick={() => canExpand && handleRowClick(ggItemId)}
                      className={`${styles.row} ${
                        isSelected ? styles.selectedRow : ""
                      } ${!canExpand ? styles.disabledRow : ""}`}
                      title={!canExpand ? (data.needsImputation ? "No covariates available" : "No imputation needed") : "Click to see covariate details"}
                    >
                      <td>{highlightMatch(getGGItemLabel(ggItemId), searchTerm)}</td>
                      <td>{data.originalValue || "—"}</td>
                      <td>{data.imputedValue || "—"}</td>
                      <td>{data.needsImputation ? formatNumber(data.imputationScore) : "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        {data.needsImputation ? (
                          <span className={styles.needsImputation}>Yes</span>
                        ) : (
                          <span className={styles.noImputation}>No</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Expanded covariate details */}
                    {isSelected && canExpand && (
                      <tr className={styles.expandedRow}>
                        <td colSpan="5">
                          <div className={styles.covariateDetails}>
                            <h4>Covariate Breakdown for {getGGItemLabel(ggItemId)} ({ggItemId})</h4>
                            <div className={styles.thresholdInfo}>
                              <strong>Thresholds:</strong> {data.thresholds.map(t => formatNumber(t)).join(', ')}
                            </div>
                            <div className={styles.scoreInfo}>
                              <strong>Imputation Score:</strong> {formatNumber(data.imputationScore)} → <strong>Value {data.imputedValue}</strong>
                            </div>
                            <table className={styles.covariateTable}>
                              <thead>
                                <tr>
                                  <th>Covariate</th>
                                  <th style={{ textAlign: "right" }}>Value</th>
                                  <th style={{ textAlign: "right" }}>Multiplier</th>
                                  <th style={{ textAlign: "right" }}>Contribution</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(data.covariates).map(([covariateName, value]) => {
                                  const multiplier = data.multipliers[covariateName] || 0;
                                  const contribution = value * multiplier;
                                  
                                  return (
                                    <tr key={covariateName}>
                                      <td>{covariateName}</td>
                                      <td>{value}</td>
                                      <td>{formatNumber(multiplier)}</td>
                                      <td>{formatNumber(contribution)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={styles.placeholder}>
            <p>Upload an MDS XML file to see imputation analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}
