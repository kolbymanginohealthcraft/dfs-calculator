import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import styles from "./IntroPanel.module.css";

const IntroPanel = ({ onDrop, onExport, hasFile }) => {
  const [dragActive, setDragActive] = useState(false);

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
      e.stopPropagation();
      dragCounter++;
      setDragActive(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter === 0) setDragActive(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      dragCounter = 0;
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) onDrop(files);
    };

    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
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

      <section className={styles.introPanel}>
        <div className={styles.actionsGroup}>
          <div className={styles.dropzone} {...getRootProps()} onClick={open}>
            <input {...getInputProps()} />
            <p>Click or drag XML here</p>
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
            This calculator estimates a patient's expected and modeled Discharge
            Function Score (DFS) using MDS Section GG values. Upload an XML file
            to explore self-care and mobility performance, adjust outcomes with
            tick controls, and review covariates that affect expected scoring.
          </p>
        </div>
      </section>
    </>
  );
};

export default IntroPanel;
