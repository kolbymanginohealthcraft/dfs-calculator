import React from 'react';
import { useNavigate } from 'react-router-dom';
import LogoHeader from '../components/LogoHeader';
import '../styles/HomeScreen.css';

const HomeScreen = () => {
  const navigate = useNavigate();

  const handleStartCalculator = () => {
    navigate('/basic/start-score');
  };

  return (
    <div className="home-screen">
      <div className="home-container">
        <div className="header">
          <LogoHeader size="large" />
          <h1 className="title">DFS Calculator</h1>
          <p className="subtitle">Created by Aegis Therapies</p>
        </div>

        <div className="card card-green">
          <h2 className="section-title">About</h2>
          <p className="description">
            This app helps you simulate component-wise gains needed to achieve an expected <strong>Discharge Function Score (DFS)</strong>. 
            Enter your start scores and expected score (from other tools or clinical judgment), then model what gains are needed across Section GG items in order to reach that target.
          </p>
        </div>

        <button 
          className="start-button"
          onClick={handleStartCalculator}
        >
          Start Calculator
        </button>

        <div className="card card-blue">
          <h2 className="section-title">Mobile App</h2>
          <p className="description">
            Get the DFS Calculator on your mobile device for easy access on the go.
          </p>
          <div className="qr-codes-container">
            <div className="qr-code-section">
              <div className="qr-code-placeholder">
                <div className="qr-code-grid">
                  {/* Placeholder QR code pattern */}
                  <div className="qr-corner qr-corner-tl"></div>
                  <div className="qr-corner qr-corner-tr"></div>
                  <div className="qr-corner qr-corner-bl"></div>
                  <div className="qr-dots">
                    {[...Array(25)].map((_, i) => (
                      <div key={i} className={`qr-dot ${Math.random() > 0.5 ? 'qr-dot-filled' : ''}`}></div>
                    ))}
                  </div>
                </div>
                <div className="coming-soon-overlay">
                  <div className="coming-soon-content">
                    <span className="coming-soon-text">COMING SOON</span>
                  </div>
                </div>
              </div>
              <p className="qr-code-text">iOS App</p>
              <p className="qr-code-note">Scan to download for iPhone/iPad</p>
            </div>

            <div className="qr-code-section">
              <div className="qr-code-placeholder">
                <div className="qr-code-grid">
                  {/* Placeholder QR code pattern */}
                  <div className="qr-corner qr-corner-tl"></div>
                  <div className="qr-corner qr-corner-tr"></div>
                  <div className="qr-corner qr-corner-bl"></div>
                  <div className="qr-dots">
                    {[...Array(25)].map((_, i) => (
                      <div key={i} className={`qr-dot ${Math.random() > 0.5 ? 'qr-dot-filled' : ''}`}></div>
                    ))}
                  </div>
                </div>
                <div className="coming-soon-overlay">
                  <div className="coming-soon-content">
                    <span className="coming-soon-text">COMING SOON</span>
                  </div>
                </div>
              </div>
              <p className="qr-code-text">Android App</p>
              <p className="qr-code-note">Scan to download for Android</p>
            </div>
          </div>
        </div>

        <div className="card card-red">
          <h3 className="disclaimer-title">Disclaimer</h3>
          <p className="disclaimer-text">
            Calculator outputs are just estimates and do not guarantee results. This tool is not intended to be used as a substitute for clinical judgment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
