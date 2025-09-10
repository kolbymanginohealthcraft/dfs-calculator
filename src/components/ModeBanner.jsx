import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ModeBanner.module.css';

const ModeBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isBasicRoute = location.pathname.startsWith('/basic');
  const isAdvancedRoute = location.pathname === '/advanced';

  const handleSwitchCalculator = () => {
    if (isBasicRoute) {
      navigate('/advanced');
    } else if (isAdvancedRoute) {
      navigate('/basic/start-score');
    }
  };

  // Don't show banner on home page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <div className={`${styles.modeBanner} ${isBasicRoute ? styles.basicMode : styles.advancedMode}`}>
      <div className={styles.bannerContent}>
        <div className={styles.modeInfo}>
          <div className={styles.modeIcon}>
            {isBasicRoute ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
            )}
          </div>
          <div className={styles.modeText}>
            <span className={styles.modeLabel}>Current Mode:</span>
            <span className={styles.modeName}>
              {isBasicRoute ? 'Basic Calculator' : 'Advanced Calculator'}
            </span>
          </div>
        </div>
        
        <button 
          className={styles.switchButton}
          onClick={handleSwitchCalculator}
          title={isBasicRoute ? "Switch to Advanced Mode" : "Switch to Basic Mode"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          {isBasicRoute ? 'Switch to Advanced' : 'Switch to Basic'}
        </button>
      </div>
    </div>
  );
};

export default ModeBanner;
