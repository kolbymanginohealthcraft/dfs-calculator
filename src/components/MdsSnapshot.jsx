import React, { useState } from "react";
import styles from "./MdsSnapshot.module.css";
import { useICD10Lookup } from "../utils/useICD10Lookup";

export default function MdsSnapshot({ groupedSections, descriptions }) {
  const [searchTerm, setSearchTerm] = useState("");
  const icd10Descriptions = useICD10Lookup(); // ✅ Load from hook

  const handleSearchChange = (e) => setSearchTerm(e.target.value.toLowerCase());

  const getDescription = (id, value) => {
  const key = `${id}|${value}`;
  const labelDesc = descriptions?.[key] || "";

  const isDiagnosisCode = /^I0020B$|^I8000[A-J]$/.test(id);
  const isTrulyBlank = value === "^";

  const cleanedValue = value?.replace(/\^|\./g, "").toUpperCase() || "";
  const icdDesc =
    isDiagnosisCode && !isTrulyBlank
      ? icd10Descriptions?.[cleanedValue] || null
      : null;

  // Strip carets for display but keep dots
  const displayValue = isDiagnosisCode && !isTrulyBlank
    ? value.replace(/\^/g, "")
    : value;

  if (isDiagnosisCode) {
    console.log("🔍 ICD Lookup:", {
      id,
      raw: value,
      cleaned: cleanedValue,
      display: displayValue,
      result: icdDesc,
    });
  }

  if (labelDesc) return `${displayValue}: ${labelDesc}`;
  if (icdDesc) return `${displayValue}: ${icdDesc}`;
  if (isDiagnosisCode && !isTrulyBlank) return `${displayValue}: Diagnosis not found`;

  return displayValue || "";
};


  const filtered = Object.entries(groupedSections)
    .map(([section, items]) => {
      const filteredItems = items.filter(
        ({ id, label }) =>
          id.toLowerCase().includes(searchTerm) ||
          label.toLowerCase().includes(searchTerm)
      );
      return [section, filteredItems];
    })
    .filter(([, items]) => items.length > 0);

  return (
    <div className={styles.leftPanel}>
      <div className={styles.sticky}>
        <div className={styles.headerRow}>
          <h2>📋 MDS Values</h2>
          <input
            type="text"
            placeholder="Search ID or label"
            className={styles.searchInput}
            onChange={handleSearchChange}
            value={searchTerm}
          />
        </div>
        <div className={styles.navButtons}>
          {filtered
            .map(([section]) => section)
            .sort()
            .map((section) => (
              <a
                key={section}
                href={`#section-${section}`}
                className={styles.sectionLink}
              >
                {section}
              </a>
            ))}
        </div>
      </div>

      <div className={styles.scrollArea}>
        {filtered
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([section, items]) => (
            <div
              key={section}
              className={styles.mdsSection}
              id={`section-${section}`}
            >
              <h3>{section}</h3>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Label</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ id, label, value }) => (
                    <tr key={id}>
                      <td>{id}</td>
                      <td>{label}</td>
                      <td>{getDescription(id, value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </div>
  );
}
