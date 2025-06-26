import React from "react";
import styles from "./Covariates.module.css";

export default function Covariates({ hasFile }) {
  return (
    <div className={styles.middlePanel}>
      <div className={styles.sticky}>
        <h2>📊 Covariates</h2>
        <p>
          The following covariates adjust the expected Discharge Function Score.
          Logic to trigger these will be added soon.
        </p>
      </div>

      <div className={styles.scrollArea}>
        {hasFile ? (
          <table className={styles.covariateTable}>
            <thead>
              <tr>
                <th>Covariate</th>
                <th>Value (Update ID 2)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Comatose</td><td>-2.243</td></tr>
              <tr><td>Hemiplegia/Hemiparesis</td><td>0.136</td></tr>
              <tr><td>Cognitive Impairment</td><td>-0.342</td></tr>
              <tr><td>Delirium</td><td>-0.147</td></tr>
              <tr><td>Wandering</td><td>-0.227</td></tr>
              <tr><td>Shortness of Breath</td><td>-0.092</td></tr>
              <tr><td>Daily Pain</td><td>-0.145</td></tr>
              <tr><td>Severe Pain</td><td>-0.151</td></tr>
              <tr><td>High-Risk Pressure Ulcers</td><td>-0.201</td></tr>
              <tr><td>Weight Loss</td><td>-0.142</td></tr>
              <tr><td>Low BMI</td><td>-0.191</td></tr>
              <tr><td>Swallowing Disorder</td><td>-0.168</td></tr>
              <tr><td>Tube Feeding</td><td>-0.608</td></tr>
              <tr><td>Dialysis</td><td>-0.541</td></tr>
              <tr><td>IV Medication</td><td>-0.337</td></tr>
              <tr><td>Oxygen Therapy</td><td>-0.242</td></tr>
              <tr><td>Ventilator</td><td>-1.421</td></tr>
              <tr><td>UTI</td><td>-0.189</td></tr>
              <tr><td>Pneumonia</td><td>-0.199</td></tr>
              <tr><td>Septicemia</td><td>-0.230</td></tr>
              <tr><td>Surgical Wound</td><td>-0.126</td></tr>
              <tr><td>Hospice</td><td>-0.177</td></tr>
              <tr><td>Age 85+</td><td>-0.254</td></tr>
              <tr><td>Male</td><td>0.043</td></tr>
              <tr><td>Black</td><td>-0.144</td></tr>
              <tr><td>Hispanic</td><td>-0.077</td></tr>
              <tr><td>Asian</td><td>-0.144</td></tr>
              <tr><td>Other Race</td><td>-0.150</td></tr>
              <tr><td>Dual Eligible</td><td>-0.160</td></tr>
              <tr><td>Primary Diagnosis: Stroke</td><td>-0.311</td></tr>
              <tr><td>Primary Diagnosis: TBI</td><td>-0.461</td></tr>
              <tr><td>Primary Diagnosis: SCI</td><td>-0.313</td></tr>
              <tr><td>Primary Diagnosis: Ortho</td><td>-0.054</td></tr>
              <tr><td>Primary Diagnosis: Neuro</td><td>-0.230</td></tr>
              <tr><td>Primary Diagnosis: Debility</td><td>-0.173</td></tr>
              <tr><td>Primary Diagnosis: Med Complex</td><td>-0.282</td></tr>
              <tr><td>Start Score</td><td>0.551</td></tr>
            </tbody>
          </table>
        ) : (
          <div className={styles.placeholder}></div>
        )}
      </div>
    </div>
  );
}
