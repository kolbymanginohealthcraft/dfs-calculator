import React, { useState, useMemo } from "react";
import styles from "./ImputationTab.module.css";
import { Calculator } from "lucide-react";
import { getImputationMultipliers } from "../utils/coefficientLoader";
import { getImputationThresholds } from "../utils/imputationCalculations";
import { getFunctionCovariates, GG_ITEMS, determineMobilityType } from "../utils/calculations";

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
  const getCovariateValue = (covariateName, parsedValues, summary, icdList, startScores, ardDate) => {
    // First check for GG item-specific covariates
    const ggItemSpecificValue = getGGItemSpecificCovariate(covariateName, parsedValues);
    if (ggItemSpecificValue !== null) {
      return ggItemSpecificValue;
    }
    
    // Use the existing covariate calculation logic for general covariates
    const result = getFunctionCovariates(parsedValues, summary, icdList, startScores, ardDate);
    return result?.covariates?.[covariateName] || 0;
  };

  // Helper function to calculate GG item-specific covariates
  const getGGItemSpecificCovariate = (covariateName, parsedValues) => {
    // Check if this is a GG item-specific covariate (contains "Valid Score", "Not Attempted", or "Skipped")
    if (covariateName.includes(" - Valid Score") || 
        covariateName.includes(" - Not Attempted") || 
        covariateName.includes(" - Skipped")) {
      
      // Extract the GG item ID from the covariate name (e.g., "Walk 150 Feet (GG0170K1) - Valid Score" -> "GG0170K1")
      const match = covariateName.match(/\(GG[0-9]+[A-Z][0-9]\)/);
      if (match) {
        const ggItemId = match[0].slice(1, -1); // Remove parentheses
        const rawValue = parsedValues[ggItemId];
        
        if (covariateName.includes(" - Valid Score")) {
          // Valid Score: return the numeric value if valid (01-06), else 0
          if (rawValue && ['01', '02', '03', '04', '05', '06'].includes(rawValue)) {
            return parseInt(rawValue, 10);
          }
          return 0;
        } else if (covariateName.includes(" - Not Attempted")) {
          // Not Attempted: return 1 if value is any ANA value (07, 08, 09, 10, 88), else 0
          return ['07', '08', '09', '10', '88'].includes(rawValue) ? 1 : 0;
        } else if (covariateName.includes(" - Skipped")) {
          // Skipped: return 1 if value is ^ (skip pattern), else 0
          return rawValue === '^' ? 1 : 0;
        }
      }
    }
    
    return null; // Not a GG item-specific covariate
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

    // Get ARD date and version-specific multipliers
    const ardDate = parsedValues['A2300'];
    const imputationMultipliers = getImputationMultipliers(ardDate);

    // Determine mobility type
    const mobilityType = determineMobilityType(parsedValues);
    
    // Define which items are walker-specific vs wheelchair-specific
    const walkerItems = new Set(['GG0170I1', 'GG0170J1', 'GG0170K1', 'GG0170L1', 'GG0170M1', 'GG0170N1', 'GG0170O1']);
    const wheelchairItems = new Set(['GG0170R1', 'GG0170S1']);
    
    const data = {};
    const ggItems = Object.keys(imputationMultipliers);

    for (const ggItemId of ggItems) {
      // Filter items based on mobility type
      if (walkerItems.has(ggItemId) && mobilityType !== 'Walk') {
        continue; // Skip walker items if not a walker
      }
      if (wheelchairItems.has(ggItemId) && mobilityType !== 'Wheel') {
        continue; // Skip wheelchair items if not a wheelchair user
      }
      
      const multipliers = imputationMultipliers[ggItemId];
      const thresholds = getImputationThresholds(ggItemId);
      
      // Get covariates for this specific GG item
      const covariates = {};
      let imputationScore = 0;

      // Calculate imputation score using covariate * multiplier
      for (const [covariateName, multiplier] of Object.entries(multipliers)) {
        // Get covariate value from the main covariate calculation
        const covariateValue = getCovariateValue(covariateName, parsedValues, summary, icdList, startScores, ardDate);
        
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
                <th style={{ textAlign: "center" }}>Needs Imputation</th>
                <th style={{ textAlign: "right" }}>Imputation Score</th>
                <th style={{ textAlign: "right" }}>Value</th>
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
                      <td style={{ textAlign: "center" }}>
                        {data.needsImputation ? (
                          <span className={styles.needsImputation}>Yes</span>
                        ) : (
                          <span className={styles.noImputation}>No</span>
                        )}
                      </td>
                      <td>{data.needsImputation ? formatNumber(data.imputationScore) : "—"}</td>
                      <td>{data.imputedValue || "—"}</td>
                    </tr>
                    
                    {/* Expanded covariate details */}
                    {isSelected && canExpand && (
                      <tr className={styles.expandedRow}>
                        <td colSpan="5">
                          <div className={styles.covariateDetails}>
                            <h4>Covariate Breakdown for {getGGItemLabel(ggItemId)} ({ggItemId})</h4>
                            {/* Threshold Visualization */}
                            <div className={styles.thresholdVisualization}>
                              <h5>Imputation Score: {formatNumber(data.imputationScore)} → Value {data.imputedValue}</h5>
                              
                              {/* Simplified Horizontal Bar */}
                              <div className={styles.simpleBarContainer}>
                                <div className={styles.barChart}>
                                  {/* Value labels above the bar */}
                                  <div className={styles.valueLabelsAbove}>
                                    {(() => {
                                      const minThreshold = Math.min(...data.thresholds);
                                      const maxThreshold = Math.max(...data.thresholds);
                                      const range = maxThreshold - minThreshold;
                                      const extendedMin = minThreshold - (range * 0.2);
                                      const extendedMax = maxThreshold + (range * 0.2);
                                      const extendedRange = extendedMax - extendedMin;
                                      const valueLabels = [];
                                      
                                      // Value 1: center of first segment
                                      const value1Center = (data.thresholds[0] - extendedMin) / extendedRange / 2 * 100;
                                      valueLabels.push(
                                        <div key={0} className={styles.valueLabelAbove} style={{ left: `${value1Center}%` }}>
                                          1
                                        </div>
                                      );
                                      
                                      // Values 2-5: centers of middle segments
                                      for (let i = 0; i < data.thresholds.length - 1; i++) {
                                        const startThreshold = data.thresholds[i];
                                        const endThreshold = data.thresholds[i + 1];
                                        const segmentCenter = ((startThreshold + endThreshold) / 2 - extendedMin) / extendedRange * 100;
                                        
                                        valueLabels.push(
                                          <div key={i + 1} className={styles.valueLabelAbove} style={{ left: `${segmentCenter}%` }}>
                                            {i + 2}
                                          </div>
                                        );
                                      }
                                      
                                      // Value 6: center of last segment
                                      const value6Center = (data.thresholds[data.thresholds.length - 1] + extendedMax) / 2;
                                      const value6Position = (value6Center - extendedMin) / extendedRange * 100;
                                      valueLabels.push(
                                        <div key={5} className={styles.valueLabelAbove} style={{ left: `${value6Position}%` }}>
                                          6
                                        </div>
                                      );
                                      
                                      return valueLabels;
                                    })()}
                                  </div>

                                  {/* Background bar with threshold lines */}
                                  <div className={styles.backgroundBar}>
                                    {/* Threshold lines inside the bar */}
                                    <div className={styles.thresholdLines}>
                                      {data.thresholds.map((threshold, index) => {
                                        const minThreshold = Math.min(...data.thresholds);
                                        const maxThreshold = Math.max(...data.thresholds);
                                        const range = maxThreshold - minThreshold;
                                        const extendedMin = minThreshold - (range * 0.2);
                                        const extendedMax = maxThreshold + (range * 0.2);
                                        const extendedRange = extendedMax - extendedMin;
                                        const position = ((threshold - extendedMin) / extendedRange) * 100;
                                        
                                        return (
                                          <div 
                                            key={index} 
                                            className={styles.thresholdLine} 
                                            style={{ left: `${position}%` }}
                                          ></div>
                                        );
                                      })}
                                    </div>
                                    
                                    {/* Score line marker */}
                                    <div 
                                      className={styles.scoreMarker}
                                      style={{
                                        left: `${(() => {
                                          const minThreshold = Math.min(...data.thresholds);
                                          const maxThreshold = Math.max(...data.thresholds);
                                          const range = maxThreshold - minThreshold;
                                          const extendedMin = minThreshold - (range * 0.2);
                                          const extendedMax = maxThreshold + (range * 0.2);
                                          const extendedRange = extendedMax - extendedMin;
                                          
                                          const position = ((data.imputationScore - extendedMin) / extendedRange) * 100;
                                          return Math.max(0, Math.min(100, position));
                                        })()}%`
                                      }}
                                    >
                                      <div className={styles.scoreLine}></div>
                                      <div className={styles.scoreLabel}>
                                        {formatNumber(data.imputationScore)}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Threshold labels */}
                                  <div className={styles.thresholdLabels}>
                                    {/* First threshold label */}
                                    <div 
                                      className={styles.thresholdLabel} 
                                      style={{ 
                                        left: `${(() => {
                                          const minThreshold = Math.min(...data.thresholds);
                                          const maxThreshold = Math.max(...data.thresholds);
                                          const range = maxThreshold - minThreshold;
                                          const extendedMin = minThreshold - (range * 0.2);
                                          const extendedMax = maxThreshold + (range * 0.2);
                                          const extendedRange = extendedMax - extendedMin;
                                          return ((data.thresholds[0] - extendedMin) / extendedRange) * 100;
                                        })()}%` 
                                      }}
                                    >
                                      {formatNumber(data.thresholds[0])}
                                    </div>
                                    
                                    {/* Middle threshold labels */}
                                    {data.thresholds.slice(1, -1).map((threshold, index) => {
                                      const minThreshold = Math.min(...data.thresholds);
                                      const maxThreshold = Math.max(...data.thresholds);
                                      const range = maxThreshold - minThreshold;
                                      const extendedMin = minThreshold - (range * 0.2);
                                      const extendedMax = maxThreshold + (range * 0.2);
                                      const extendedRange = extendedMax - extendedMin;
                                      const position = ((threshold - extendedMin) / extendedRange) * 100;
                                      
                                      return (
                                        <div 
                                          key={index + 1} 
                                          className={styles.thresholdLabel} 
                                          style={{ left: `${position}%` }}
                                        >
                                          {formatNumber(threshold)}
                                        </div>
                                      );
                                    })}
                                    
                                    {/* Last threshold label */}
                                    <div 
                                      className={styles.thresholdLabel} 
                                      style={{ 
                                        left: `${(() => {
                                          const minThreshold = Math.min(...data.thresholds);
                                          const maxThreshold = Math.max(...data.thresholds);
                                          const range = maxThreshold - minThreshold;
                                          const extendedMin = minThreshold - (range * 0.2);
                                          const extendedMax = maxThreshold + (range * 0.2);
                                          const extendedRange = extendedMax - extendedMin;
                                          return ((data.thresholds[data.thresholds.length - 1] - extendedMin) / extendedRange) * 100;
                                        })()}%`,
                                        transform: 'translateX(-50%)'
                                      }}
                                    >
                                      {formatNumber(data.thresholds[data.thresholds.length - 1])}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <table className={styles.covariateTable}>
                              <thead>
                                <tr>
                                  <th>Covariate</th>
                                  <th style={{ textAlign: "right" }}>Coefficient</th>
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
                                      <td title={covariateName}>{covariateName}</td>
                                      <td>{value}</td>
                                      <td>{formatNumber(multiplier)}</td>
                                      <td>{formatNumber(contribution)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className={styles.totalRow}>
                                  <td colSpan="3" style={{ textAlign: "right", fontWeight: "bold" }}>
                                    Total Imputation Score:
                                  </td>
                                  <td style={{ fontWeight: "bold", color: "#dc3545" }}>
                                    {formatNumber(data.imputationScore)}
                                  </td>
                                </tr>
                              </tfoot>
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
