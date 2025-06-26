import React, { useState } from "react";
import styles from "./MdsSnapshot.module.css";

export default function MdsSnapshot({ groupedSections }) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (e) => setSearchTerm(e.target.value.toLowerCase());

  // Filter groupedSections based on search
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
          <h2>📋 MDS Snapshot</h2>
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
                      <td>{value}</td>
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
