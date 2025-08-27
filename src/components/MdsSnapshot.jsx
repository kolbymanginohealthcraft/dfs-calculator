import React, { useState } from "react";
import styles from "./MdsSnapshot.module.css";
import { useICD10Lookup } from "../utils/useICD10Lookup";
import { formatDate } from "../utils/calculations";
import { ClipboardList } from "lucide-react";

export default function MdsSnapshot({
  groupedSections,
  descriptions,
  selectedItems = [],
  isRedacted = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const icd10Descriptions = useICD10Lookup();

  const handleSearchChange = (e) => setSearchTerm(e.target.value.toLowerCase());
  const clearSearch = () => setSearchTerm("");

  const highlightMatch = (text) => {
    if (!searchTerm || typeof text !== "string") return text;
    const regex = new RegExp(`(${searchTerm})`, "ig");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i}>{part}</mark>
      ) : (
        part
      )
    );
  };

  const getDescription = (id, value) => {
    // Redact patient names, sensitive identifiers, and facility information when isRedacted is true
    if (isRedacted && (id === "A0500A" || id === "A0500B" || id === "A0500C" || id === "A0500D" || 
        id === "A0600A" || id === "A0600B" || id === "A0700" || id === "A1300A" ||
        id === "X0200A" || id === "X0200C" || id === "A0100A" || id === "A0100B" || id === "A0100C")) {
      if (id === "A0600A") {
        return "***-**-****"; // SSN format
      }
      return "REDACTED";
    }

    // List of known date-related MDS items
    const dateItems = [
      "A0900", "A1600", "A1900", "A2000", "A2200", "A2300", "A2400B", "A2400C",
      "TARGET_DATE", "SUBMISSION_DATE", "SUBMISSION_COMPLETE_DATE"
    ];

    // Check if this is a date item and format it
    const isDateItem = dateItems.includes(id);
    const isDateValue = value && value.length === 8 && /^\d{8}$/.test(value);
    
    if (isDateItem && isDateValue) {
      const formattedDate = formatDate(value);
      return highlightMatch(formattedDate);
    }

    const key = `${id}|${value}`;
    const labelDesc = descriptions?.[key] || "";

    const isDiagnosisCode = /^I0020B$|^I8000[A-J]$/.test(id);
    const isTrulyBlank = value === "^";

    const cleanedValue = value?.replace(/\^|\./g, "").toUpperCase() || "";
    const icdDesc =
      isDiagnosisCode && !isTrulyBlank
        ? icd10Descriptions?.[cleanedValue] || null
        : null;

    const displayValue =
      isDiagnosisCode && !isTrulyBlank ? value.replace(/\^/g, "") : value;

    if (labelDesc) {
      return (
        <>
          <span className={styles.valueCode}>
            {highlightMatch(displayValue)}
          </span>
          :{" "}
          <span className={styles.valueDescription}>
            {highlightMatch(labelDesc)}
          </span>
        </>
      );
    }

    if (icdDesc) {
      return (
        <>
          <span className={styles.valueCode}>
            {highlightMatch(displayValue)}
          </span>
          :{" "}
          <span className={styles.valueDescription}>
            {highlightMatch(icdDesc)}
          </span>
        </>
      );
    }

    if (isDiagnosisCode && !isTrulyBlank) {
      return (
        <>
          <span className={styles.valueCode}>
            {highlightMatch(displayValue)}
          </span>
          : <span className={styles.valueDescription}>Diagnosis not found</span>
        </>
      );
    }

    return highlightMatch(displayValue || "");
  };

  const filtered = Object.entries(groupedSections)
    .map(([sectionKey, group]) => {
      const { fullName, items } = group;

      const filteredItems = items.filter(({ id, label, value }) => {
        const search = searchTerm.toLowerCase();
        const rawValue = value?.toString().toLowerCase() || "";

        const key = `${id}|${value}`;
        const labelDesc = descriptions?.[key]?.toLowerCase() || "";

        const isDiagnosisCode = /^I0020B$|^I8000[A-J]$/.test(id);
        const cleanedValue = value?.replace(/\^|\./g, "").toUpperCase();
        const icdDesc = isDiagnosisCode
          ? icd10Descriptions?.[cleanedValue]?.toLowerCase() || ""
          : "";

        const matchesSearch =
          id.toLowerCase().includes(search) ||
          label.toLowerCase().includes(search) ||
          rawValue.includes(search) ||
          labelDesc.includes(search) ||
          icdDesc.includes(search);

        const matchesHighlight =
          selectedItems.length === 0 || selectedItems.includes(id);

        return matchesSearch && matchesHighlight;
      });

      return [sectionKey, fullName, filteredItems];
    })
    .filter(([, , items]) => items.length > 0);

    return (
    <div className={styles.leftPanel}>
      <div className={styles.sticky}>
        <div className={styles.headerRow}>
          <h2>
            <ClipboardList size={20} className={styles.headerIcon} />
            MDS Values
          </h2>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search MDS values..."
              className={styles.searchInput}
              onChange={handleSearchChange}
              value={searchTerm}
            />
            {searchTerm && (
              <button className={styles.clearButton} onClick={clearSearch}>
                ✕
              </button>
            )}
          </div>
        </div>

        <div className={styles.navButtons}>
          {filtered
            .map(([sectionKey]) => sectionKey)
            .sort((a, b) => {
              if (a.toLowerCase() === "control") return 1;
              if (b.toLowerCase() === "control") return -1;
              return a.localeCompare(b);
            })
            .map((sectionKey) => (
              <button
                key={sectionKey}
                type="button"
                className={styles.sectionLink}
                onClick={() => {
                  const el = document.getElementById(`section-${sectionKey}`);
                  if (el)
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {sectionKey}
              </button>
            ))}
        </div>
      </div>

      <div className={styles.scrollArea}>
        {filtered
          .sort(([a], [b]) => {
            if (a.toLowerCase() === "control") return 1;
            if (b.toLowerCase() === "control") return -1;
            return a.localeCompare(b);
          })
          .map(([sectionKey, fullName, items]) => (
            <div
              key={sectionKey}
              className={styles.mdsSection}
              id={`section-${sectionKey}`}
            >
              <h3>{fullName}</h3>
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
                    <tr
                      key={id}
                      className={
                        selectedItems.includes(id)
                          ? styles.highlightedRow
                          : undefined
                      }
                    >
                      <td>{highlightMatch(id)}</td>
                      <td>{highlightMatch(label)}</td>
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
