import React, { useState } from "react";
import styles from "./ModelEndScore.module.css";
import {
  GG_ITEMS,
  scoreMap,
  calculateFunctionScore,
  getContributingItemIds,
} from "../utils/calculations";
import AdvancedScoreBarChart from "./AdvancedScoreBarChart";
import BarbellChart from "./BarbellChart";
import ScoreButton from "./ScoreButton";
import { getScoreTypeColor } from "../utils/themeColors";
import { Wrench, BarChart3, Target, HandHeart, User, Settings } from "lucide-react";

const ModelEndScore = ({
  modeledValues,
  startScores,
  subtotal,
  modeledTotal,
  handleTick,
  setModeledValues,
  hasFile,
  parsedValues,
  weightedScore,
}) => {
  const [filterContributing, setFilterContributing] = useState(false);
  const startTotal = calculateFunctionScore(startScores);
  const contributingIds = getContributingItemIds(modeledValues);

  const toggleFilter = () => {
    setFilterContributing((prev) => !prev);
  };

  return (
    <div className={styles.rightPanel}>
      <div className={styles.sticky}>
        <div className={styles.modelHeader}>
          <h2><Settings size={20} /> Model End Score</h2>
          <div className={styles.buttonRow}>
            <button
              className={styles.resetBtn}
              onClick={() => setModeledValues({ ...startScores })}
            >
              Reset All
            </button>
            <button
              className={styles.filterBtn}
              onClick={toggleFilter}
              aria-pressed={filterContributing}
            >
              {filterContributing ? "Show All Items" : "Show Only Contributing"}
            </button>
          </div>
        </div>

        {hasFile && (
          <>
            <div className={styles.scoreSummaryBox}>
              <div className={styles.summaryRow}>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>
                    <BarChart3 size={16} />
                    Start Score
                  </div>
                  <div className={styles.summaryValue}>{startTotal}</div>
                </div>
                <div className={styles.summaryDivider}></div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>
                    <Target size={16} />
                    Expected Score
                  </div>
                  <div className={styles.summaryValue}>
                    {weightedScore !== undefined && !isNaN(weightedScore) 
                      ? Number(weightedScore).toFixed(2) 
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.chartBox}>
              <AdvancedScoreBarChart
                startTotal={startTotal}
                modeledTotal={modeledTotal}
                expectedScore={weightedScore}
                title="Score Progress"
              />
            </div>
          </>
        )}
      </div>

      <div className={styles.scrollArea}>
        {hasFile &&
          ["selfCare", "mobility"].map((domain) => {
            const domainItems = GG_ITEMS.filter((i) => i.domain === domain);
            const filteredItems = filterContributing
              ? domainItems.filter(({ id }) =>
                  contributingIds.has(id.replace(/[0-9]$/, ""))
                )
              : domainItems;

            const contributingSubtotal = domainItems.reduce((sum, { id }) => {
              const baseId = id.replace(/[0-9]$/, "");
              if (!contributingIds.has(baseId)) return sum;
              const modeled = modeledValues[id];
              return modeled in scoreMap ? sum + scoreMap[modeled] : sum;
            }, 0);

            return (
              <div className={styles.scoreSubsection} key={domain}>
                <div className={styles.subsectionHeader}>
                  <div className={styles.sectionHeader}>
                                         <h3>
                       {domain === "selfCare" ? "Self-Care" : "Mobility"}
                     </h3>

                  </div>

                  <div className={styles.contributeSummary}>
                    <span className={styles.contributingDot} />
                    <span className={styles.contributeLabel}>
                      Item contributes to function score
                    </span>
                  </div>
                </div>

                {filteredItems.map(({ id, label }) => {
                  const modeled =
                    modeledValues[id] in scoreMap
                      ? scoreMap[modeledValues[id]]
                      : 0;
                  const rawStart = startScores[id];
                  const start = rawStart in scoreMap ? scoreMap[rawStart] : 0;
                  const delta = modeled - start;

                  const rowClasses = [
                    styles.scoreRow,
                    modeled > start ? styles.gain : "",
                    modeled < start ? styles.loss : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const cleanId = id.replace(/[0-9]$/, "");
                  const isContributing = contributingIds.has(cleanId);

                  return (
                    <div key={id} className={rowClasses}>
                      <span className={styles.contributeSlot}>
                        {isContributing && (
                          <span className={styles.contributingDot}></span>
                        )}
                      </span>

                      <div className={styles.itemLabel}>
                        <span className={styles.labelText} title={id}>
                          {label}{" "}
                          <span className={styles.itemId}>[{cleanId}]</span>
                          {delta !== 0 && (
                            <span
                              className={`${styles.delta} ${
                                delta > 0 ? styles.positive : styles.negative
                              }`}
                            >
                              ({delta > 0 ? "+" : ""}
                              {delta})
                            </span>
                          )}
                        </span>
                      </div>
                      
                      <div className={styles.itemProgress}>
                        <BarbellChart
                          startScore={start}
                          endScore={modeled}
                          showEndNode={true}
                          width={120}
                          height={30}
                        />
                      </div>
                      
                      <div className={styles.scoreControls}>
                        <ScoreButton
                          type="minus"
                          onClick={() => handleTick(id, -1)}
                          color={getScoreTypeColor('end', 'primary')}
                          outlineColor={getScoreTypeColor('end', 'primary')}
                        />
                        
                        <ScoreButton
                          type="plus"
                          onClick={() => handleTick(id, 1)}
                          color={getScoreTypeColor('end', 'primary')}
                          outlineColor={getScoreTypeColor('end', 'primary')}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ModelEndScore;
