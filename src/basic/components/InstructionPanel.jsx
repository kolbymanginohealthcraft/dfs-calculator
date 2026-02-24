import React from 'react';
import layoutStyles from '../styles/BasicLayout.module.css';

const InstructionPanel = ({ 
  title, 
  whatYoureDoing, 
  howToUse, 
  scoreValues = null,
  noContainer = false
}) => {
  return (
    <div className={noContainer ? layoutStyles.instructionsContent : layoutStyles.instructionsPanel}>
      <h3 className={layoutStyles.instructionsTitle}>{title}</h3>
      
      <div className={layoutStyles.instructionSection}>
        <h4 className={layoutStyles.instructionSubtitle}>What you're doing:</h4>
        <p className={layoutStyles.instructionText}>
          {whatYoureDoing}
        </p>
      </div>
      
      <div className={layoutStyles.instructionSection}>
        <h4 className={layoutStyles.instructionSubtitle}>How to use:</h4>
        <ul className={layoutStyles.instructionList}>
          {howToUse.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
      
      {scoreValues && (
        <div className={layoutStyles.instructionSection}>
          <h4 className={layoutStyles.instructionSubtitle}>Score Values:</h4>
          <div className={layoutStyles.scoreValues}>
            {scoreValues.map((scoreValue, index) => (
              <div key={index} className={layoutStyles.scoreValueItem}>
                <span className={layoutStyles.scoreNumber}>{scoreValue.number}</span>
                <span className={layoutStyles.scoreDescription}>{scoreValue.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructionPanel;
