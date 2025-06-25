import React from "react";
import { useDropzone } from "react-dropzone";
import styles from "./IntroPanel.module.css";

const IntroPanel = ({ onDrop }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/xml": [".xml"] },
  });

  return (
    <section className={styles.introPanel}>
      <div className={styles.dropzone} {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>📂 Drop XML here</p>
        ) : (
          <p>Click or drag XML here</p>
        )}
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
  );
};

export default IntroPanel;
