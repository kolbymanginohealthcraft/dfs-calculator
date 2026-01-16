import React from 'react';
import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';
import styles from './ValidationError.module.css';

const ValidationError = ({ 
  error, 
  warning, 
  onDismissError, 
  onDismissWarning 
}) => {
  if (!error && !warning) return null;

  const renderMessage = (message, type, onDismiss) => {
    const isError = type === 'error';
    const isWarning = type === 'warning';
    const isSuccess = type === 'success';

    const iconMap = {
      error: <AlertTriangle size={20} />,
      warning: <Info size={20} />,
      success: <CheckCircle size={20} />
    };

    const className = isError ? styles.error : isWarning ? styles.warning : styles.success;

    return (
      <div className={`${styles.validationMessage} ${className}`}>
        <div className={styles.messageHeader}>
          <div className={styles.messageIcon}>
            {iconMap[type]}
          </div>
          <div className={styles.messageContent}>
            <h4 className={styles.messageTitle}>{message.title}</h4>
            <p className={styles.messageText}>{message.message}</p>
            {message.suggestion && (
              <p className={styles.messageSuggestion}>{message.suggestion}</p>
            )}
            {message.warnings && message.warnings.length > 0 && (
              <div className={styles.warningList}>
                <p className={styles.warningListTitle}>Additional warnings:</p>
                <ul>
                  {message.warnings.map((warning, index) => (
                    <li key={index} className={styles.warningItem}>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button 
            className={styles.dismissButton}
            onClick={onDismiss}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.validationContainer}>
      {error && renderMessage(error, 'error', onDismissError)}
      {warning && renderMessage(warning, 'warning', onDismissWarning)}
    </div>
  );
};

export default ValidationError;
