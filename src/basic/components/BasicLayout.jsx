import React from 'react';
import Navbar from '../../components/Navbar';
import ModeBanner from '../../components/ModeBanner';
import '../styles/BasicLayout.css';

const BasicLayout = ({ 
  children, 
  rightPanel, 
  navbar, 
  fullWidth = false, 
  expandedRight = false, 
  showNavbar = true,
  // Progress indicator props
  currentStep,
  onStepPress,
  startTotal,
  expectedScore,
  endTotal,
  hasInteracted,
  mode = 'basic'
}) => {
  return (
    <div className="score-screen">
      {showNavbar && (navbar || <Navbar />)}
      {!navbar && (
        <ModeBanner 
          currentStep={currentStep}
          onStepPress={onStepPress}
          startTotal={startTotal}
          expectedScore={expectedScore}
          endTotal={endTotal}
          hasInteracted={hasInteracted}
          mode={mode}
        />
      )}
      
      <div className={`main-content ${fullWidth ? 'full-width' : ''} ${expandedRight ? 'expanded-right' : ''}`}>
        {!fullWidth ? (
          <>
            <div className="content-left">
              <div className="left-content-container">
                {children}
              </div>
            </div>
            
            <div className="content-right">
              {rightPanel}
            </div>
          </>
        ) : (
          <div className="content-full-width">
            {rightPanel}
          </div>
        )}
      </div>
    </div>
  );
};

export default BasicLayout;
