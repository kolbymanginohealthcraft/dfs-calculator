import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import styles from "./IntroPanel.module.css";

const IntroPanel = ({ onDrop, onExport, hasFile, fileName }) => {
  const [dragActive, setDragActive] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { "text/xml": [".xml"] },
    noClick: true,
    noKeyboard: true,
  });

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e) => {
      e.preventDefault();
      dragCounter++;
      setDragActive(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) setDragActive(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      dragCounter = 0;
      setDragActive(false);
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) onDrop(files);
    };

    const preventDefaults = (e) => {
      e.preventDefault();
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", preventDefaults);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", preventDefaults);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [onDrop]);

  return (
    <>
      {dragActive && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragOverlayMessage}>📄 Drop XML to upload</div>
        </div>
      )}

      <div className={styles.ribbonWrapper}>
        {collapsed ? (
          <div className={styles.ribbonCollapsed}>
            <button
              className={styles.caretToggle}
              onClick={() => setCollapsed(false)}
              aria-label="Show intro panel"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        ) : (
          <section className={styles.introPanel}>
            <div className={styles.actionsGroup}>
              <div
                className={`${styles.dropzone} ${
                  !hasFile ? styles.noFile : ""
                }`}
                {...getRootProps()}
                onClick={open}
              >
                <input {...getInputProps()} />
                <p>Click or drag XML here</p>
                {hasFile && fileName && (
                  <div className={styles.fileName}>📂 {fileName}</div>
                )}
              </div>
              <button
                className={styles.exportBtn}
                onClick={onExport}
                disabled={!hasFile}
              >
                📄 Export to PDF
              </button>
            </div>
            <div className={styles.description}>
              <p>
                This calculator estimates a patient's expected Discharge
                Function Score (DFS) as well as allows you to model the interim
                or hypothetical end score. Upload an XML file to get started.
              </p>
            </div>
            <button
              className={styles.caretToggle}
              onClick={() => setCollapsed(true)}
              aria-label="Hide intro panel"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
          </section>
        )}
      </div>
    </>
  );
};

export default IntroPanel;
