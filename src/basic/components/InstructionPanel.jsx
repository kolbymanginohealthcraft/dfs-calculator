import React from 'react';
import '../styles/BasicLayout.css';

const InstructionPanel = ({ 
  title, 
  whatYoureDoing, 
  howToUse, 
  scoreValues = null,
  noContainer = false
}) => {
  return (
    <div className={noContainer ? "instructions-content" : "instructions-panel"}>
      <h3 className="instructions-title">{title}</h3>
      
      <div className="instruction-section">
        <h4 className="instruction-subtitle">What you're doing:</h4>
        <p className="instruction-text">
          {whatYoureDoing}
        </p>
      </div>
      
      <div className="instruction-section">
        <h4 className="instruction-subtitle">How to use:</h4>
        <ul className="instruction-list">
          {howToUse.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
      
      {scoreValues && (
        <div className="instruction-section">
          <h4 className="instruction-subtitle">Score Values:</h4>
          <div className="score-values">
            {scoreValues.map((scoreValue, index) => (
              <div key={index} className="score-value-item">
                <span className="score-number">{scoreValue.number}</span>
                <span className="score-description">{scoreValue.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructionPanel;
