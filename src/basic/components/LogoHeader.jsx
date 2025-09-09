import React from 'react';
import logoImage from '../assets/logo.png';
import '../styles/LogoHeader.css';

const LogoHeader = ({ size = 'medium', showTitle = false }) => {
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
    <div className="logo-header">
      <div className="logo-container" style={getLogoStyle()}>
        <img 
          src={logoImage} 
          alt="Aegis Therapies Logo" 
          className="logo-image"
          style={getLogoStyle()}
        />
      </div>
      {showTitle && (
        <h2 className="logo-title">Aegis Therapies</h2>
      )}
    </div>
  );
};

export default LogoHeader;
