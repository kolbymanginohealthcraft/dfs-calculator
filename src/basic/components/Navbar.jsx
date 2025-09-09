import React, { useState } from 'react';
import logo from '../assets/logo.png';
import ConfirmModal from './ConfirmModal';
import '../styles/Navbar.css';

const Navbar = ({ 
  title, 
  onHomeClick, 
  hasUnsavedChanges, 
  actionButton,
  currentStep,
  onStepPress,
  startTotal,
  expectedScore,
  endTotal,
  hasInteracted
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleHomeClick = () => {
    if (hasUnsavedChanges) {
      setShowConfirmModal(true);
    } else {
      onHomeClick();
    }
  };

  const handleConfirmHome = () => {
    setShowConfirmModal(false);
    onHomeClick();
  };

  const handleCancelHome = () => {
    setShowConfirmModal(false);
  };

  // Format the title to include "DFS Calculator - " prefix
  const formattedTitle = `DFS Calculator - ${title}`;

  // Navigation logic (same as ProgressIndicator)
  const steps = [
    { key: 'start', title: 'Start Scores' },
    { key: 'expected', title: 'Expected Score' },
    { key: 'end', title: 'End Scores' },
  ];

  const getStepIndex = (stepKey) => {
    return steps.findIndex(step => step.key === stepKey);
  };

  const currentIndex = getStepIndex(currentStep);
  const nextStepIndex = currentIndex + 1;
  const hasNextStep = nextStepIndex < steps.length;
  const hasPreviousStep = currentIndex > 0;

  // Determine if Next button should be enabled
  const isNextEnabled = () => {
    if (!hasNextStep) return false;
    
    // Special logic for expected step: end step is only enabled if required gain > 0
    if (currentStep === 'expected' && hasNextStep) {
      const requiredGain = expectedScore ? expectedScore - startTotal : 0;
      return requiredGain > 0;
    }
    
    return true;
  };

  // Determine if Back button should be enabled
  const isBackEnabled = () => {
    return hasPreviousStep;
  };

  const handleNextClick = () => {
    if (isNextEnabled() && onStepPress) {
      const nextStep = steps[nextStepIndex];
      onStepPress(nextStep.key);
    }
  };

  const handleBackClick = () => {
    if (isBackEnabled() && onStepPress) {
      const prevStep = steps[currentIndex - 1];
      onStepPress(prevStep.key);
    }
  };

  return (
    <>
      <div className="navbar">
        <div className="navbar-left">
          <button className="header-btn home-btn" onClick={handleHomeClick}>
            Home
          </button>
          {currentStep && isBackEnabled() && (
            <button 
              className={`header-btn nav-btn ${isBackEnabled() ? 'enabled' : 'disabled'}`}
              onClick={handleBackClick}
              disabled={!isBackEnabled()}
            >
              Back
            </button>
          )}
          {currentStep && hasNextStep && (
            <button 
              className={`header-btn nav-btn ${isNextEnabled() ? 'enabled' : 'disabled'}`}
              onClick={handleNextClick}
              disabled={!isNextEnabled()}
            >
              Next
            </button>
          )}
          {actionButton && (
            <div className="navbar-action-button">
              {actionButton}
            </div>
          )}
        </div>
        <div className="navbar-center">
          <h1 className="navbar-title">{formattedTitle}</h1>
        </div>
        <div className="navbar-right">
          <img src={logo} alt="DFS Calculator Logo" className="navbar-logo" />
        </div>
      </div>
      
      <ConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmHome}
        onCancel={handleCancelHome}
        title="Return to Home"
        message="Are you sure you want to return to the home screen? All current progress will be lost."
      />
    </>
  );
};

export default Navbar;
