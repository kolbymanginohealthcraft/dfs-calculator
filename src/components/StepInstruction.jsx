import React from 'react';
import { getScoreTypeColor } from '../utils/themeColors';
import styles from './StepInstruction.module.css';

const StepInstruction = ({ 
  currentStep,
  stepInfo = {
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
  },
  stepNumber = null,
  className = ''
}) => {
  const getStepColor = (stepKey) => {
    const stepColors = {
      'start': getScoreTypeColor('start', 'primary'),
      'expected': getScoreTypeColor('expected', 'primary'), 
      'end': getScoreTypeColor('end', 'primary')
    };
    return stepColors[stepKey] || getScoreTypeColor('start', 'primary');
  };

  const getStepInfo = (stepKey) => {
    return stepInfo[stepKey] || stepInfo['start'];
  };

  const stepColor = getStepColor(currentStep);
  const currentStepInfo = getStepInfo(currentStep);
  const displayStepNumber = stepNumber || (currentStep === 'start' ? '1' : currentStep === 'expected' ? '2' : '3');

  return (
    <div 
      className={`${styles.stepInstruction} ${className}`}
      style={{ 
        backgroundColor: stepColor + '20',
        borderLeftColor: stepColor,
      }}
    >
      <div className={styles.stepIcon} style={{ backgroundColor: stepColor + '20' }}>
        <span className={styles.stepIconText} style={{ color: stepColor }}>
          {displayStepNumber}
        </span>
      </div>
      <div className={styles.stepTextContainer}>
        <h3 className={styles.stepTitle} style={{ color: stepColor }}>
          {currentStepInfo.title}
        </h3>
        <p className={styles.stepDescription}>
          {currentStepInfo.description}
        </p>
      </div>
    </div>
  );
};

export default StepInstruction;
