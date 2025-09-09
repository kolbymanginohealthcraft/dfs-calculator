import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HomeScreen.module.css';

const HomeScreen = () => {
  const navigate = useNavigate();

  const handleBasicMode = () => {
    navigate('/basic');
  };

  const handleAdvancedMode = () => {
    navigate('/advanced');
  };

  return (
    <div className={styles['home-screen']}>
      <div className={styles['home-container']}>
        <div className={styles['header']}>
          <div className={styles['logo-section']}>
            <img 
              src="/AEGIS_T_White.png" 
              alt="Aegis Therapies Logo" 
              className={styles['logo']}
            />
          </div>
          <h1 className={styles['title']}>DFS Calculator</h1>
          <p className={styles['subtitle']}>DFS Calculator</p>
          <p className={styles['subtitle-secondary']}>Created by Aegis Therapies</p>
        </div>

        <div className={styles['mode-selection']}>
          <h2 className={styles['mode-title']}>Choose Your Calculator Mode</h2>
          
          <div className={styles['mode-cards']}>
            <div className={`${styles['mode-card']} ${styles['basic-card']}`}>
              <div className={styles['card-header']}>
                <h3 className={styles['card-title']}>Basic Mode</h3>
              </div>
              <div className={styles['card-content']}>
                <p className={styles['card-description']}>
                  Simple step-by-step calculator for quick DFS calculations. 
                  Perfect for straightforward assessments and basic modeling.
                </p>
                <p className={styles['card-description']}>
                  Manual entry for users without MDS access. Enter start scores, estimate expected score, and model end scores.
                </p>
              </div>
              <button 
                className="btn btn-secondary"
                onClick={handleBasicMode}
              >
                Start Basic Calculator
              </button>
            </div>

            <div className={`${styles['mode-card']} ${styles['advanced-card']}`}>
              <div className={styles['card-header']}>
                <h3 className={styles['card-title']}>Advanced Mode</h3>
              </div>
              <div className={styles['card-content']}>
                <p className={styles['card-description']}>
                  Full-featured calculator with MDS file upload, detailed analysis, 
                  and comprehensive reporting capabilities.
                </p>
                <p className={styles['card-description']}>
                  Import MDS XML file to automatically extract start scores and calculate expected score using complex methodology.
                </p>
              </div>
              <button 
                className="btn btn-accent"
                onClick={handleAdvancedMode}
              >
                Start Advanced Calculator
              </button>
            </div>
          </div>
        </div>

        <div className={styles['info-section']}>
          <div className={styles['info-card']}>
            <h3 className={styles['info-title']}>About DFS Calculator</h3>
            <p className={styles['info-description']}>
              The DFS Calculator helps healthcare professionals 
              assess and model patient function scores for discharge planning. Choose the 
              mode that best fits your needs and workflow.
            </p>
          </div>
        </div>

        <div className={styles['disclaimer']}>
          <h4 className={styles['disclaimer-title']}>Disclaimer</h4>
          <p className={styles['disclaimer-text']}>
            Calculator outputs are estimates and do not guarantee results. This tool is 
            not intended to be used as a substitute for clinical judgment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
