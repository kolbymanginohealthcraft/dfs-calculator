import React from 'react';
import logoImage from '../assets/logo.png';
import styles from './LogoHeader.module.css';

const LogoHeader = ({ 
  size = 'medium', 
  showTitle = false,
  className = ''
}) => {
  const getLogoStyle = () => {
    switch (size) {
      case 'small':
        return { width: '100px', height: '100px' };
      case 'large':
        return { width: '230px', height: '150px' };
      case 'medium':
      default:
        return { width: '150px', height: '150px' };
    }
  };

  return (
    <div className={`${styles.logoHeader} ${className}`}>
      <div className={styles.logoContainer} style={getLogoStyle()}>
        <img 
          src={logoImage} 
          alt="Aegis Therapies Logo" 
          className={styles.logoImage}
          style={getLogoStyle()}
        />
      </div>
      {showTitle && (
        <h2 className={styles.logoTitle}>Aegis Therapies</h2>
      )}
    </div>
  );
};

export default LogoHeader;
