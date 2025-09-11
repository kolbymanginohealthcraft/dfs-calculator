import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HomeScreen.module.css';

const HomeScreen = () => {
  const navigate = useNavigate();

  const handleBasicMode = () => {
    navigate('/basic/start-score');
  };

  const handleAdvancedMode = () => {
    navigate('/advanced');
  };

  return (
    <div className={styles['home-screen']}>
      {/* Hero Section */}
      <section className={styles['hero']}>
        <div className={styles['hero-background']}></div>
        <div className={styles['hero-container']}>
          <div className={styles['hero-content']}>
            <div className={styles['hero-logo']}>
              <img 
                src="/AEGIS_T_White.png" 
                alt="Aegis Therapies Logo" 
                className={styles['logo']}
              />
            </div>
            <h1 className={styles['hero-title']}>
              DFS Calculator
              <span className={styles['hero-subtitle']}>Discharge Function Score</span>
            </h1>
            <p className={styles['hero-description']}>
              Patient function assessment and discharge planning tool for healthcare professionals
            </p>
            <div className={styles['hero-badges']}>
              <span className={styles['badge']}>Clinical Tool</span>
              <span className={styles['badge']}>Two Versions</span>
              <span className={styles['badge']}>Easy Export</span>
            </div>
          </div>
          
          <div className={styles['hero-modes']}>
            <h2 className={styles['hero-modes-title']}>Choose Your Calculator Mode</h2>
            <div className={styles['hero-mode-cards']}>
              <div className={`${styles['hero-mode-card']} ${styles['hero-basic-mode']}`}>
                <div className={styles['hero-mode-icon']}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                </div>
                <div className={styles['hero-mode-content']}>
                  <h3 className={styles['hero-mode-title']}>Basic Mode</h3>
                  <p className={styles['hero-mode-description']}>
                    Quick manual entry for straightforward assessments
                  </p>
                </div>
                <button 
                  className={`${styles['hero-mode-button']} ${styles['hero-basic-button']}`}
                  onClick={handleBasicMode}
                >
                  Start Basic
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>

              <div className={`${styles['hero-mode-card']} ${styles['hero-advanced-mode']}`}>
                <div className={styles['hero-mode-icon']}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </div>
                <div className={styles['hero-mode-content']}>
                  <h3 className={styles['hero-mode-title']}>Advanced Mode</h3>
                  <p className={styles['hero-mode-description']}>
                    Upload MDS XML files for comprehensive analysis
                  </p>
                </div>
                <button 
                  className={`${styles['hero-mode-button']} ${styles['hero-advanced-button']}`}
                  onClick={handleAdvancedMode}
                >
                  Start Advanced
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section className={styles['features-section']}>
        <div className={styles['container']}>
          <div className={styles['section-header']}>
            <h2 className={styles['section-title']}>Why Choose DFS Calculator?</h2>
            <p className={styles['section-description']}>
              Built by healthcare professionals for healthcare professionals
            </p>
          </div>

          <div className={styles['features-grid']}>
            <div className={styles['feature-card']}>
              <div className={styles['feature-icon']}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m0-7v7m0-7h10a2 2 0 0 1 2 2v3c0 1.1-.9 2-2 2H9m0-7V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
              <h3 className={styles['feature-title']}>CMS Compliant</h3>
              <p className={styles['feature-description']}>
                Based on CMS legislation and regulatory requirements for discharge planning
              </p>
            </div>

            <div className={styles['feature-card']}>
              <div className={styles['feature-icon']}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <h3 className={styles['feature-title']}>MDS File Upload</h3>
              <p className={styles['feature-description']}>
                Upload exported MDS XML files from your EMR for automated calculations
              </p>
            </div>


            <div className={styles['feature-card']}>
              <div className={styles['feature-icon']}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h3 className={styles['feature-title']}>Fast & Accurate</h3>
              <p className={styles['feature-description']}>
                Quick calculations with precise results for efficient discharge planning
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className={styles['about-section']}>
        <div className={styles['container']}>
          <div className={styles['about-content']}>
            <div className={styles['about-text']}>
              <h2 className={styles['about-title']}>About DFS Calculator</h2>
              <p className={styles['about-description']}>
                The DFS Calculator is a comprehensive tool designed to help healthcare professionals 
                assess and model patient function scores for discharge planning. Whether you need 
                a quick manual calculation or detailed analysis with uploaded MDS files, our tool 
                provides the flexibility and accuracy you need.
              </p>
              <div className={styles['about-highlights']}>
                <div className={styles['highlight']}>
                  <strong>Created by Aegis Therapies</strong>
                  <span>Leading healthcare solutions provider</span>
                </div>
                <div className={styles['highlight']}>
                  <strong>Trusted by Professionals</strong>
                  <span>Used in clinical settings nationwide</span>
                </div>
              </div>
            </div>
            <div className={styles['about-visual']}>
              <div className={styles['visual-card']}>
                <div className={styles['visual-icon']}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m0-7v7m0-7h10a2 2 0 0 1 2 2v3c0 1.1-.9 2-2 2H9m0-7V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                  </svg>
                </div>
                <h4>Clinical Excellence</h4>
                <p>Built with clinical expertise and real-world validation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className={styles['disclaimer-section']}>
        <div className={styles['container']}>
          <div className={styles['disclaimer']}>
            <div className={styles['disclaimer-icon']}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <div className={styles['disclaimer-content']}>
              <h4 className={styles['disclaimer-title']}>Clinical Disclaimer</h4>
              <p className={styles['disclaimer-text']}>
                This calculator provides estimates based on available data and should not replace 
                clinical judgment. Results are for informational purposes only. Always consult 
                with qualified healthcare professionals for patient care decisions and treatment planning.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeScreen;
