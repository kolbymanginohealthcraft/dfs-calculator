import React, { useState, useEffect } from "react";
import styles from "./MdsSnapshot.module.css";
import { useICD10Lookup } from "../utils/useICD10Lookup";
import { formatDate } from "../utils/calculations";
import { redactName } from "../utils/redactionUtils";
import { getHccDisplayForIcd } from "../utils/hccMapping";
import { ClipboardList, X, ArrowLeft } from "lucide-react";
import mdsItemLookup from "../data/mds_item_lookup.json";

export default function MdsSnapshot({
  groupedSections,
  descriptions,
  selectedItems = [],
  selectedCovariate = null,
  onClearSelection,
  onClearFilter,
  isRedacted = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState(null);
  const [hasBeenInitialized, setHasBeenInitialized] = useState(false);
  const icd10Descriptions = useICD10Lookup();

  const handleSearchChange = (e) => setSearchTerm(e.target.value.toLowerCase());
  const clearSearch = () => setSearchTerm("");
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (searchTerm) {
        // If there's a search term, clear it first
        setSearchTerm("");
      } else {
        // If search is empty, blur the input to exit focus
        e.target.blur();
      }
    }
  };

  // Auto-select first section when component first loads
  useEffect(() => {
    if (!hasBeenInitialized && Object.keys(groupedSections).length > 0) {
      const firstSection = Object.keys(groupedSections)
        .sort((a, b) => {
          if (a.toLowerCase() === "control") return 1;
          if (b.toLowerCase() === "control") return -1;
          return a.localeCompare(b);
        })[0];
      
      if (firstSection) {
        setActiveSection(firstSection);
        setHasBeenInitialized(true);
      }
    }
  }, [groupedSections, hasBeenInitialized]);

  // Clear active section when a covariate is selected to show all sections
  // Reset to first section when covariate is cleared
  useEffect(() => {
    if (selectedCovariate) {
      setActiveSection(null);
    } else if (hasBeenInitialized && Object.keys(groupedSections).length > 0) {
      // Reset to first section when covariate filter is cleared
      const firstSection = Object.keys(groupedSections)
        .sort((a, b) => {
          if (a.toLowerCase() === "control") return 1;
          if (b.toLowerCase() === "control") return -1;
          return a.localeCompare(b);
        })[0];
      
      if (firstSection) {
        setActiveSection(firstSection);
      }
    }
  }, [selectedCovariate, groupedSections, hasBeenInitialized]);

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
      // For name fields, use partial redaction instead of full REDACTED
      if (id === "A0500A" || id === "A0500B" || id === "A0500C" || id === "A0500D") {
        return redactName(value || "");
      }
      return "REDACTED";
    }

    // Get item type from lookup
    const itemType = mdsItemLookup[id]?.itm_type_cd;
    
    // Format dates automatically based on item type
    if (itemType === "Date" && value && value.length === 8 && /^\d{8}$/.test(value)) {
      const formattedDate = formatDate(value);
      return highlightMatch(formattedDate);
    }
    
    // Format numbers automatically - remove leading zeros
    if (itemType === "Number" && value && /^\d+$/.test(value)) {
      const numericValue = parseInt(value, 10).toString();
      return highlightMatch(numericValue);
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

    // Get HCC mapping for diagnosis codes
    const hccDisplay = isDiagnosisCode && !isTrulyBlank 
      ? getHccDisplayForIcd(cleanedValue) 
      : "";

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
          {hccDisplay && (
            <span className={styles.hccMappingDisplay}>
              {" "}({hccDisplay})
            </span>
          )}
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
          {hccDisplay && (
            <span className={styles.hccMappingDisplay}>
              {" "}({hccDisplay})
            </span>
          )}
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
          {hccDisplay && (
            <span className={styles.hccMappingDisplay}>
              {" "}({hccDisplay})
            </span>
          )}
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
          searchTerm === "" || // If no search term, match everything
          id.toLowerCase().includes(search) ||
          label.toLowerCase().includes(search) ||
          rawValue.includes(search) ||
          labelDesc.includes(search) ||
          icdDesc.includes(search);

        const matchesHighlight =
          selectedItems.length === 0 || selectedItems.includes(id);

        // If we have selected items (covariate filter), only show those items
        // If no selected items, show items based on search
        return selectedItems.length > 0 ? matchesHighlight : matchesSearch;
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
              onKeyDown={handleKeyDown}
              value={searchTerm}
            />
            {searchTerm && (
              <button className={styles.clearButton} onClick={clearSearch}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Covariate Selection Indicator */}
        {selectedCovariate && (
          <div className={styles.covariateIndicator}>
            <div className={styles.covariateIndicatorContent}>
              <button 
                className={styles.covariateIndicatorBack}
                onClick={onClearSelection}
                title="Back to Covariates tab"
              >
                <ArrowLeft size={16} />
                <span>Back to Covariates</span>
              </button>
              <div className={styles.covariateIndicatorText}>
                <span className={styles.covariateIndicatorLabel}>Showing MDS items for:</span>
                <span className={styles.covariateIndicatorName}>{selectedCovariate}</span>
              </div>
              <button 
                className={styles.covariateIndicatorClear}
                onClick={onClearFilter}
                title="Clear filter and show all MDS items"
              >
                <X size={16} />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}

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
                className={`${styles.sectionLink} ${activeSection === sectionKey ? styles.sectionLinkActive : ''}`}
                onClick={() => setActiveSection(activeSection === sectionKey ? null : sectionKey)}
              >
                {sectionKey}
              </button>
            ))}
        </div>
      </div>

      <div className={styles.scrollArea}>
        {(searchTerm || selectedCovariate) ? (
          // When searching or covariate selected, show all sections with results
          filtered
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
            ))
        ) : activeSection ? (
          // When not searching, show only the active section
          (() => {
            const activeSectionData = filtered.find(([sectionKey]) => sectionKey === activeSection);
            if (!activeSectionData) return null;
            
            const [sectionKey, fullName, items] = activeSectionData;
            return (
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
            );
          })()
        ) : (
          // Show message when no section is selected and no search
          <div className={styles.noSectionSelected}>
            <p>Select a section above to view MDS data</p>
          </div>
        )}
      </div>
    </div>
  );
}
