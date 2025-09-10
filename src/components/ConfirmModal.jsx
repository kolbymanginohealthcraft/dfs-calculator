import React from 'react';
import styles from './ConfirmModal.module.css';

const ConfirmModal = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title, 
  message,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  className = ''
}) => {
  if (!isOpen) return null;

  return (
    <div className={`${styles.modalOverlay} ${className}`}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalMessage}>{message}</p>
        </div>
        <div className={styles.modalActions}>
          <button className={`${styles.modalBtn} ${styles.modalBtnCancel}`} onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`${styles.modalBtn} ${styles.modalBtnConfirm}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
