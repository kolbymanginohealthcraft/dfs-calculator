import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import styles from './DataLossWarningModal.module.css';

const DataLossWarningModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Yes, Clear All Data",
  cancelText = "Cancel"
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.warningIcon}>
            <AlertTriangle size={24} />
          </div>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <p className={styles.warningMessage}>{message}</p>
          
          <div className={styles.warningDetails}>
            {/* <div className={styles.warningItem}>
              <span className={styles.warningBullet}>⚠️</span>
              <span>All uploaded files will be removed</span>
            </div> */}
            <div className={styles.warningItem}>
              <span className={styles.warningBullet}>⚠️</span>
              <span>All progress will be lost</span>
            </div>
            <div className={styles.warningItem}>
              <span className={styles.warningBullet}>⚠️</span>
              <span>This action cannot be undone</span>
            </div>
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            className={styles.cancelButton}
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className={styles.confirmButton}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataLossWarningModal;
