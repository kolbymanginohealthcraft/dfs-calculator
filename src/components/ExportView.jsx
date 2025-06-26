// components/ExportView.jsx
import React from "react";
import "./ExportView.css"; // Optional, custom print-friendly styles

const ExportView = ({ patient, scores, covariates }) => {
  return (
    <div className="exportContainer">
      <h1>Discharge Function Score Report</h1>

      <section>
        <h2>Patient Summary</h2>
        <p><strong>Name:</strong> {patient.name}</p>
        <p><strong>Facility:</strong> {patient.facility}</p>
        <p><strong>DOB:</strong> {patient.dob}</p>
        <p><strong>ARD:</strong> {patient.ard}</p>
      </section>

      <section>
        <h2>Scores</h2>
        <ul>
          {Object.entries(scores).map(([label, val]) => (
            <li key={label}>
              {label}: <strong>{val}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Covariates</h2>
        <table>
          <thead>
            <tr>
              <th>Covariate</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {covariates.map(({ name, value }) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default ExportView;
