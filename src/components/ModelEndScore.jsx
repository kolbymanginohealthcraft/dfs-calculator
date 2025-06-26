import React from "react";
import styles from "./ModelEndScore.module.css";
import { GG_ITEMS, scoreMap } from "../utils/calculations";
import SummaryChart from "./SummaryChart";
import {
  calculateFunctionScore,
  getContributingItemIds,
  ANA,
} from "../utils/calculations";

const ModelEndScore = ({
  modeledValues,
  startScores,
  subtotal,
  modeledTotal,
  handleTick,
  setModeledValues,
  hasFile,
}) => {
  const startTotal = calculateFunctionScore(startScores);
  const contributingIds = getContributingItemIds(modeledValues);

  return (
    <div className={styles.rightPanel}>
      <div className={styles.sticky}>
        <div className={styles.modelHeader}>
          <h2>🛠️ Model End Score</h2>
          <button
            className={styles.resetBtn}
            onClick={() => setModeledValues({ ...startScores })}
          >
            Reset All
          </button>
        </div>

        {hasFile && (
          <div className={styles.chartBox}>
            <SummaryChart start={startTotal} modeled={modeledTotal} />
          </div>
        )}
      </div>

      <div className={styles.scrollArea}>
        {hasFile &&
          ["selfCare", "mobility"].map((domain) => (
            <div className={styles.scoreSubsection} key={domain}>
              <h3>
                {domain === "selfCare" ? "🧼 Self-Care" : "🧍 Mobility"} — Subtotal:{" "}
                {subtotal(domain)}
              </h3>
              {GG_ITEMS.filter((i) => i.domain === domain).map(({ id, label }) => {
                const modeled = modeledValues[id] in scoreMap ? scoreMap[modeledValues[id]] : 0;
                const rawStart = startScores[id];
                const start = rawStart in scoreMap ? scoreMap[rawStart] : 0;
                const delta = modeled - start;

                const rowClasses = [
                  styles.tickRow,
                  modeled > start ? styles.gain : "",
                  modeled < start ? styles.loss : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                const cleanId = id.replace(/[0-9]$/, "");
                const isContributing = contributingIds.has(cleanId);

                return (
                  <div key={id} className={rowClasses}>
                    <label title={id}>
                      {label} <span className={styles.itemId}>[{cleanId}]</span>
                      {isContributing && (
                        <span className={styles.contributingIcon}>✅</span>
                      )}
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
                    </label>

                    <div className={styles.tickControls}>
                      <button onClick={() => handleTick(id, -1)}>-</button>
                      <span className={styles.tickValue}>{modeled}</span>
                      <button onClick={() => handleTick(id, 1)}>+</button>
                    </div>
                    <span className={styles.startScore}>
                      Start:{" "}
                      {ANA.has(rawStart) ? "ANA" : start}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
};

export default ModelEndScore;
