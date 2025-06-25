import React from "react";
import styles from "./MdsSnapshot.module.css";

export default function MdsSnapshot({ groupedSections }) {
  return (
    <div className={styles.leftPanel}>
      <div className={styles.sticky}>
        <h2>📋 MDS Snapshot</h2>
        <div className={styles.navButtons}>
          {Object.keys(groupedSections)
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
        {Object.entries(groupedSections)
          .sort()
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
