import React from "react";
import styles from "./Navbar.module.css";

const Navbar = () => {
  return (
    <header className={styles.navbar}>
      <h1 className={styles.navbarTitle}>Discharge Function Score Modeler</h1>
      <div className={styles.logoContainer}>
        <img
          src="/AEGIS_T_White.png"
          alt="Aegis Logo"
          className={styles.navbarLogo}
        />
      </div>
    </header>
  );
};

export default Navbar;
