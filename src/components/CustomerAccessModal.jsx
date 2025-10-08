import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './CustomerAccessModal.module.css';

const CustomerAccessModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeIcon} onClick={onClose} aria-label="Close modal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h3 className={styles.modalTitle}>Advanced Features - Customer Access</h3>
        <p className={styles.modalDescription}>
          Advanced features including MDS file upload and automated calculations are available to Aegis Therapies customers.
        </p>
        
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Already a customer?</h4>
          <p className={styles.sectionDescription}>
            Access the full DFS Calculator through your customer portal:
          </p>
          <button 
            className={styles.portalButton}
            onClick={() => window.open('https://www.mycare.com/', '_blank')}
          >
            Go to myCare Portal
          </button>
        </div>
        
        <div className={styles.separator}></div>
        
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Not a customer yet?</h4>
          <p className={styles.sectionDescription}>
            Contact us to learn more about becoming an Aegis Therapies customer and accessing advanced features.
          </p>
          <button 
            className={styles.websiteButton}
            onClick={() => window.open('https://aegistherapies.com/', '_blank')}
          >
            Visit Aegis Therapies
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CustomerAccessModal;
