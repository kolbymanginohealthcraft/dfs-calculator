import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getScoreTypeColor } from '../utils/themeColors';
import { useAuth } from '../contexts/AuthContext';
import { useDataLossWarning } from '../contexts/DataLossWarningContext';
import CustomerAccessModal from './CustomerAccessModal';
import DataLossWarningModal from './DataLossWarningModal';
import styles from './ModeBanner.module.css';

const ModeBanner = ({ 
  currentStep, 
  onStepPress, 
  startTotal, 
  expectedScore, 
  endTotal, 
  mode = 'basic',
  // Navigation props for advanced mode
  showBackToSummary,
  onBackToSummary,
  onPreviousFile,
  onNextFile,
  canGoPrevious,
  canGoNext,
  showViewSummary,
  onViewSummary,
  // Data loss warning props
  uploadedFiles = [],
  onSwitchToBasic,
  onSwitchToAdvanced
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { hasDataToLose: hasBasicDataToLose, clearDataStatus } = useDataLossWarning();
  const [showModal, setShowModal] = useState(false);
  const [showDataLossWarning, setShowDataLossWarning] = useState(false);
  
  const isBasicRoute = location.pathname.startsWith('/basic');
  const isAdvancedRoute = location.pathname.startsWith('/advanced');
  const isSummaryRoute = location.pathname === '/advanced/summary';


  const handleSwitchCalculator = () => {
    if (isBasicRoute) {
      // First check if user has access to advanced mode
      if (!isAuthenticated) {
        // Show modal for public users (no access to advanced mode)
        setShowModal(true);
        return;
      }
      
      // User has portal access, now check for data loss
      if (hasBasicDataToLose) {
        if (onSwitchToAdvanced) {
          onSwitchToAdvanced();
        } else {
          setShowDataLossWarning(true);
        }
      } else {
        // No data to lose, proceed to advanced mode
        navigate('/advanced');
      }
    } else if (isAdvancedRoute) {
      // Check if there are files that would be lost when switching to basic
      if (uploadedFiles.length > 0 && onSwitchToBasic) {
        onSwitchToBasic();
      } else {
        // No files to lose, clear data status and switch to basic
        clearDataStatus();
        navigate('/basic/start-score');
      }
    }
  };

  const handleConfirmSwitch = () => {
    setShowDataLossWarning(false);
    clearDataStatus(); // Clear the data status when user confirms the switch
    navigate('/advanced');
  };

  const handleCancelSwitch = () => {
    setShowDataLossWarning(false);
  };

  // Don't show banner on home page
  if (location.pathname === '/') {
    return null;
  }

  // Progress steps for basic mode
  const steps = [
    { key: 'start', title: 'Step 1: Start GG Scores', color: getScoreTypeColor('start', 'primary') },
    { key: 'expected', title: 'Step 2: Expected DFS', color: getScoreTypeColor('expected', 'primary') },
    { key: 'end', title: 'Step 3: Interim/End GG Scores', color: getScoreTypeColor('end', 'primary') },
  ];

  const getStepIndex = (stepKey) => {
    return steps.findIndex(step => step.key === stepKey);
  };

  const currentIndex = getStepIndex(currentStep);
  const nextStepIndex = currentIndex + 1;
  const hasNextStep = nextStepIndex < steps.length;

  return (
    <div className={`${styles.modeBanner} ${isBasicRoute ? styles.basicMode : styles.advancedMode}`}>
      <div className={styles.bannerContent}>
        <div className={styles.modeInfo}>
          <div className={styles.modeIcon}>
            {isBasicRoute ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
            )}
          </div>
          <div className={styles.modeText}>
            <span className={styles.modeLabel}>Current Mode:</span>
            <span className={styles.modeName}>
              {isBasicRoute ? 'Basic Calculator' : 'Advanced Calculator'}
            </span>
          </div>
        </div>

        {/* Progress Navigation for Basic Mode */}
        {isBasicRoute && onStepPress && (
          <div className={styles.progressNavigation}>
            <div className={styles.progressBar}>
              {steps.map((step, index) => {
                const isActive = step.key === currentStep;
                const isCompleted = index < currentIndex;
                
                // Special logic for expected step: end step is only clickable if required gain > 0
                let isClickable;
                if (mode === 'advanced') {
                  // In advanced mode, only the current step (end) is clickable
                  isClickable = step.key === currentStep;
                } else if (currentStep === 'expected' && step.key === 'end') {
                  const requiredGain = expectedScore ? expectedScore - startTotal : 0;
                  isClickable = requiredGain > 0;
                } else {
                  isClickable = index <= currentIndex + 1; // Allow navigation to next step or completed steps
                }
                
                return (
                  <React.Fragment key={step.key}>
                    <button
                      className={`${styles.progressStep} ${isActive ? styles.activeStep : ''} ${isCompleted ? styles.completedStep : ''} ${!isClickable ? styles.disabledStep : ''}`}
                      onClick={() => isClickable && onStepPress(step.key)}
                      disabled={!isClickable}
                      data-step={step.key}
                      title={currentStep === 'expected' && step.key === 'end' && (!expectedScore || expectedScore <= startTotal) ? 'Must set an expected score greater than start score' : step.title}
                    >
                      <div 
                        className={`${styles.stepDot} ${isActive ? styles.activeDot : ''} ${isCompleted ? styles.completedDot : ''}`}
                        style={{ backgroundColor: step.color }}
                      />
                      <div className={styles.stepText}>
                        <span className={styles.stepNumber}>Step {index + 1}</span>
                        <span className={styles.stepColon}>:</span>
                        <span className={styles.stepLabel}>
                          {step.title.replace('Step ' + (index + 1) + ': ', '')}
                        </span>
                      </div>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={`${styles.progressLine} ${isCompleted ? styles.completedLine : ''}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Advanced Mode Navigation */}
        {isAdvancedRoute && (
          <div className={styles.advancedNavigation}>
            {showBackToSummary && (
              <>
                <button
                  className={styles.navButton}
                  onClick={onBackToSummary}
                  title="Back to Summary"
                >
                  Back to Summary
                </button>
                <div className={styles.fileNavigation}>
                  <button
                    className={`${styles.navButton} ${!canGoPrevious ? styles.navButtonDisabled : ''}`}
                    onClick={onPreviousFile}
                    disabled={!canGoPrevious}
                    title="Previous File"
                  >
                    Previous
                  </button>
                  <button
                    className={`${styles.navButton} ${!canGoNext ? styles.navButtonDisabled : ''}`}
                    onClick={onNextFile}
                    disabled={!canGoNext}
                    title="Next File"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
            {showViewSummary && !showBackToSummary && (
              <button
                className={styles.navButton}
                onClick={onViewSummary}
                title="View Summary Table"
              >
                📊 View Summary
              </button>
            )}
          </div>
        )}

        
        <button 
          className={`${styles.switchButton} ${isBasicRoute && !isAuthenticated ? styles.restrictedButton : ''}`}
          onClick={handleSwitchCalculator}
          title={
            isBasicRoute 
              ? (isAuthenticated ? "Switch to Advanced Mode" : "Advanced Mode - Customer Only")
              : "Switch to Basic Mode"
          }
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          <span className={styles.buttonText}>
            {isBasicRoute 
              ? (isAuthenticated ? 'Switch to Advanced' : 'Advanced (Customer Only)')
              : 'Switch to Basic'
            }
          </span>
        </button>
      </div>
      
      {/* Customer Access Modal */}
      <CustomerAccessModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
      
      {/* Data Loss Warning Modal */}
      <DataLossWarningModal
        isOpen={showDataLossWarning}
        onClose={handleCancelSwitch}
        onConfirm={handleConfirmSwitch}
        title="Switch to Advanced Mode"
        message="You have entered data that will be lost if you switch to advanced mode. Are you sure you want to continue?"
        confirmText="Yes, Switch"
        cancelText="Stay in Basic"
      />
      
    </div>
  );
};

export default ModeBanner;
