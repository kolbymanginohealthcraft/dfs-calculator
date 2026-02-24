import React from "react";
import { formatDOB } from "../utils/calculations";
import { getBasicContributingItems, getContributingGGItemsForDisplay } from "../utils/itemAdapters";
import { getContributingKeys } from "../utils/itemDefinitions";
import { GG_ITEMS, scoreMap, resolveScore } from "../utils/calculations";
import styles from "./ExportView.module.css";
import { BarChart3 } from "lucide-react";

const ExportView = ({ patient, scores, functionItems, mobilityType = 'Walk' }) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Get function items data based on whether we have functionItems prop or need to derive it
  const getFunctionItemsData = () => {
    if (functionItems && functionItems.scores) {
      // Advanced app - derive items from GG_ITEMS and filter by contributing items
      const actualMobilityType = functionItems.mobilityType || mobilityType;
      const contributingGGItems = getContributingGGItemsForDisplay(actualMobilityType);
      
      const contributingItems = GG_ITEMS.filter(item => {
        return contributingGGItems.has(item.id);
      });
      
      // Group by domain
      const grouped = {
        selfCare: contributingItems.filter(item => item.domain === 'selfCare'),
        mobility: contributingItems.filter(item => item.domain === 'mobility')
      };
      
      return grouped;
    } else {
      // Basic app - derive from scores and mobilityType
      const contributingItems = getBasicContributingItems(mobilityType);
      return {
        selfCare: contributingItems.selfCare,
        mobility: contributingItems.mobility
      };
    }
  };

  const functionItemsData = getFunctionItemsData();

  // Helper function to get score for an item
  const getItemScore = (item, domain) => {
    if (functionItems && functionItems.scores) {
      return resolveScore(functionItems.scores[item.id]);
    } else {
      // Basic app structure - scores passed separately
      const key = item.key || item.id;
      return scores[domain] ? scores[domain][key] : 0;
    }
  };

  // Helper function to get start score for an item
  const getItemStartScore = (item, domain) => {
    if (functionItems && functionItems.startScores) {
      return resolveScore(functionItems.startScores[item.id]);
    } else {
      // Basic app structure - startScores passed separately
      const key = item.key || item.id;
      return scores.startScores && scores.startScores[domain] ? scores.startScores[domain][key] : 0;
    }
  };

  return (
    <div className={styles.exportContainer}>
      <h1 className={styles.reportTitle}>DFS Report</h1>

      <section className={styles.section}>
        <p className={styles.patientLine}>
          <span className={styles.label}>Patient:</span> {patient.name}
          {(patient.age || patient.ard) && (
            <span>
              {" "}
              (age: {patient.age}, ARD{" "}
              {formatDOB(patient.ard)})
            </span>
          )}
        </p>

        <p className={styles.facilityLine}>
          <span className={styles.label}>Facility:</span> {patient.facility}
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionSubheading}>Summary</h3>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCell}>
            <div className={styles.summaryLabel}>Start Score</div>
            <div className={styles.summaryValue}>{scores.start ?? "—"}</div>
          </div>
          <div className={styles.summaryCell}>
            <div className={styles.summaryLabel}>Expected Score</div>
            <div className={styles.summaryValue}>
              {scores.expected !== undefined
                ? Number(scores.expected).toFixed(2)
                : "—"}
            </div>
          </div>
          <div className={styles.summaryCell}>
            <div className={styles.summaryLabel}>End Score</div>
            <div className={`${styles.summaryValue} ${(() => {
              if (scores.expected === undefined || scores.modeled === undefined) return '';
              const diff = scores.modeled - scores.expected;
              return diff >= 0 ? styles.overAchieved : styles.underAchieved;
            })()}`}>
              {(() => {
                if (scores.modeled === undefined) return "—";
                const endScore = Number(scores.modeled).toFixed(0);
                if (scores.expected !== undefined) {
                  const diff = scores.modeled - scores.expected;
                  if (diff >= 0) {
                    return `${endScore} (${diff.toFixed(2)} over)`;
                  } else {
                    return `${endScore} (${Math.abs(diff).toFixed(2)} under)`;
                  }
                }
                return endScore;
              })()}
            </div>
          </div>
          <div className={styles.summaryCell}>
            <div className={styles.summaryLabel}>Gain</div>
            <div className={`${styles.summaryValue} ${(() => {
              if (scores.start === undefined || scores.modeled === undefined) return '';
              const gain = scores.modeled - scores.start;
              return gain >= 0 ? styles.overAchieved : styles.underAchieved;
            })()}`}>
              {(() => {
                if (scores.start === undefined || scores.modeled === undefined) return "—";
                const gain = scores.modeled - scores.start;
                if (scores.expected !== undefined) {
                  const required = scores.expected - scores.start;
                  return `+${gain.toFixed(0)} (required ${required.toFixed(2)})`;
                }
                return gain >= 0 ? `+${gain.toFixed(0)}` : `${gain.toFixed(0)}`;
              })()}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionSubheading}>Function Items Analysis</h3>
        <div className={styles.functionItemsContainer}>
          {Object.entries(functionItemsData).map(([domain, items]) => (
            <div key={domain} className={styles.domainSection}>
              <h4 className={styles.domainTitle}>
                {domain === 'selfCare' ? 'Self-Care Items' : 'Mobility Items'}
                {domain === 'mobility' && (functionItems?.mobilityType || mobilityType) && (
                  <span className={styles.mobilityType}> ({functionItems?.mobilityType === 'Wheel' ? 'Wheelchair' : functionItems?.mobilityType || (mobilityType === 'Wheel' ? 'Wheelchair' : mobilityType)})</span>
                )}
                {domain === 'mobility' && (functionItems?.mobilityType === 'Wheel' || mobilityType === 'Wheel') && (
                  <span className={styles.footnote}>Item R counts double</span>
                )}
              </h4>
              <table className={styles.functionItemsTable}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Start Score</th>
                    <th>End Score</th>
                    <th>Gain</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const startScore = getItemStartScore(item, domain);
                    const endScore = getItemScore(item, domain);
                    const gain = endScore - startScore;
                    
                    return (
                      <tr key={item.key || item.id}>
                        <td className={styles.itemName}>{item.label}</td>
                        <td className={styles.scoreCell}>{startScore}</td>
                        <td className={styles.scoreCell}>{endScore}</td>
                        <td className={`${styles.gainCell} ${gain > 0 ? styles.positive : gain < 0 ? styles.negative : ''}`}>
                          {gain > 0 ? `+${gain}` : gain === 0 ? '—' : gain}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <p className={styles.footerNote}>
        Generated by DFS Calculator · Aegis Therapies · {today}
      </p>
    </div>
  );
};

export default ExportView;
