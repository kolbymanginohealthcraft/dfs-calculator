import React, { useState } from "react";
import styles from "./Covariates.module.css";

export default function Covariates({ hasFile, covariates = {}, multipliers = {} }) {
  const [searchTerm, setSearchTerm] = useState("");

  const activeCovariates = Object.entries(covariates)
    .filter(([key, value]) => value !== 0 && value !== undefined && value !== null)
    .filter(([key]) => key.toLowerCase().includes(searchTerm.toLowerCase()));

  const formatNumber = (n) => Number(n).toFixed(3);

  return (
    <div className={styles.middlePanel}>
      <div className={styles.sticky}>
        <div className={styles.headerRow}>
          <h2>📊 Covariates</h2>
          <input
            type="text"
            placeholder="Search covariates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchBar}
          />
        </div>
        <p>
          The following covariates were active and contributed to the expected Discharge Function Score.
        </p>
      </div>

      <div className={styles.scrollArea}>
        {hasFile ? (
          <table className={styles.covariateTable}>
            <thead>
              <tr>
                <th>Covariate</th>
                <th>Value</th>
                <th>Multiplier</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {activeCovariates.map(([key, value]) => {
                const multiplier = multipliers[key] ?? 0;
                const subtotal = value * multiplier;
                return (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{value}</td>
                    <td>{formatNumber(multiplier)}</td>
                    <td>{formatNumber(subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={styles.placeholder}></div>
        )}
      </div>
    </div>
  );
}
