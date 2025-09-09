import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Navbar.module.css";

const Navbar = () => {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className={styles.navbar}>
      <div className="navbar-left">
        <button 
          className={styles.backButton}
          onClick={handleBackToHome}
        >
          Back to Home
        </button>
      </div>
      <div className="navbar-center">
        <h1 className={styles.navbarTitle}>DFS Calculator</h1>
      </div>
      <div className={styles.logoContainer}>
        <img
          src="/AEGIS_T_White.png"
          alt="Aegis Logo"
          className={styles.navbarLogo}
        />
      </div>
    </div>
  );
};

export default Navbar;
