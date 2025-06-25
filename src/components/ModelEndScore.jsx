import React from "react";
import styles from "./ModelEndScore.module.css";
import { GG_ITEMS, scoreMap } from "../utils/ggItems";

const ModelEndScore = ({
  modeledValues,
  startScores,
  subtotal,
  modeledTotal,
  handleTick,
  setModeledValues,
  hasFile,
}) => {
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
          <div className={styles.scoreBox}>
            📈 Modeled Total: <strong>{modeledTotal}</strong>
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
                const modeled = scoreMap[modeledValues[id]] || 0;
                const start = scoreMap[startScores[id]] || 0;
                const delta = modeled - start;

                const rowClasses = [
                  styles.tickRow,
                  modeled > start ? styles.gain : "",
                  modeled < start ? styles.loss : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div key={id} className={rowClasses}>
                    <label title={id}>
                      {label}
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
                    <span className={styles.startScore}>Start: {start}</span>
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
