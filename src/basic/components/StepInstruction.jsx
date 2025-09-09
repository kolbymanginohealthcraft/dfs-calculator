import React from 'react';
import { getScoreTypeColor } from '../utils/themeColors';
import '../styles/StepInstruction.css';

const StepInstruction = ({ currentStep }) => {
  const getStepColor = (stepKey) => {
    const stepColors = {
      'start': getScoreTypeColor('start', 'primary'),
      'expected': getScoreTypeColor('expected', 'primary'), 
      'end': getScoreTypeColor('end', 'primary')
    };
    return stepColors[stepKey] || getScoreTypeColor('start', 'primary');
  };

  const getStepInfo = (stepKey) => {
    const stepInfo = {
      'start': {
        title: 'Set Initial Scores',
        description: 'Enter scores for all components below ↓'
      },
      'expected': {
        title: 'Set Expected Score', 
        description: 'Enter target score below ↓'
      },
      'end': {
        title: 'Adjust Final Scores',
        description: 'Modify scores below to reach target ↓'
      }
    };
    return stepInfo[stepKey] || stepInfo['start'];
  };

  const stepColor = getStepColor(currentStep);
  const stepInfo = getStepInfo(currentStep);
  const stepNumber = currentStep === 'start' ? '1' : currentStep === 'expected' ? '2' : '3';

  return (
    <div 
      className="step-instruction"
      style={{ 
        backgroundColor: stepColor + '20',
        borderLeftColor: stepColor,
      }}
    >
      <div className="step-icon" style={{ backgroundColor: stepColor + '20' }}>
        <span className="step-icon-text" style={{ color: stepColor }}>
          {stepNumber}
        </span>
      </div>
      <div className="step-text-container">
        <h3 className="step-title" style={{ color: stepColor }}>
          {stepInfo.title}
        </h3>
        <p className="step-description">
          {stepInfo.description}
        </p>
      </div>
    </div>
  );
};

export default StepInstruction;
