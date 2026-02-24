import React from 'react';
import { getScoreTypeColor } from '../../utils/themeColors';
import styles from '../styles/ProgressIndicator.module.css';

const ProgressIndicator = ({ currentStep, onStepPress, startTotal, expectedScore, endTotal, hasInteracted, mode = 'basic' }) => {
  const steps = [
    { key: 'start', title: 'Step 1:Start Scores', color: getScoreTypeColor('start', 'primary') },
    { key: 'expected', title: 'Step 2: Expected Score', color: getScoreTypeColor('expected', 'primary') },
    { key: 'end', title: 'Step 3: End Scores', color: getScoreTypeColor('end', 'primary') },
  ];

  const getStepIndex = (stepKey) => {
    return steps.findIndex(step => step.key === stepKey);
  };

  const currentIndex = getStepIndex(currentStep);
  const nextStepIndex = currentIndex + 1;
  const hasNextStep = nextStepIndex < steps.length;

  return (
    <div className={styles.progressIndicator}>
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
          
          const isNextButton = index === nextStepIndex && hasNextStep;
          
                      return (
              <button
                key={step.key}
                className={`${styles.progressStep} ${isActive ? styles.activeStep : ''} ${isCompleted ? styles.completedStep : ''} ${!isClickable ? styles.disabledStep : ''}`}
                onClick={() => isClickable && onStepPress(step.key)}
                disabled={!isClickable}
                data-step={step.key}
                style={{
                  borderBottomColor: isActive ? step.color : 'transparent'
                }}
                title={currentStep === 'expected' && step.key === 'end' && (!expectedScore || expectedScore <= startTotal) ? 'Must set an expected score greater than start score' : ''}
              >
                <div 
                  className={`${styles.stepDot} ${isActive ? styles.activeDot : ''} ${isCompleted ? styles.completedDot : ''}`}
                  style={{ backgroundColor: step.color }}
                />
                <span className={`${styles.stepText} ${isActive ? styles.activeText : ''} ${isCompleted ? styles.completedText : ''} ${!isClickable ? styles.disabledText : ''}`}>
                  {step.title}
                </span>
              </button>
            );
        })}
      </div>
    </div>
  );
};

export default ProgressIndicator;
