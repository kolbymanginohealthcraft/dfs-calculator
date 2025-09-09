import React from 'react';
import styles from './AdvancedScoreBarChart.module.css';

const AdvancedScoreBarChart = ({ 
  startTotal, 
  expectedScore, 
  modeledTotal, 
  showStartBar = true,
  showExpectedLine = true,
  showGainBar = true,
  showRequiredBackground = false,
  title = "Score Progress"
}) => {
  const actualGain = modeledTotal ? modeledTotal - startTotal : 0;
  const requiredGain = expectedScore ? expectedScore - startTotal : 0;

  return (
    <div className={styles.scoreBarChart}>
      <h3 className={styles.chartTitle}>{title}</h3>
      
      <div className={styles.barChartTrack}>
        {/* Start Score Bar */}
        {showStartBar && (
          <div 
            className={styles.startBar} 
            style={{ width: `${(startTotal / 60) * 100}%` }}
          >
            <span className={styles.barValueText}>{startTotal}</span>
          </div>
        )}
        
        {/* Required Gain Background (Transparent) */}
        {showRequiredBackground && (
          <div 
            className={styles.requiredBackground} 
            style={{ 
              width: `${(requiredGain / 60) * 100}%`,
              left: `${(startTotal / 60) * 100}%`
            }} 
          />
        )}
        
        {/* Gain Bar */}
        {showGainBar && actualGain > 0 && (
          <div 
            className={styles.gainBar} 
            style={{ 
              width: `${(actualGain / 60) * 100}%`,
              left: `${(startTotal / 60) * 100}%`
            }}
          >
            {actualGain >= 1 && (
              <span className={styles.barValueText}>{Math.round(actualGain)}</span>
            )}
          </div>
        )}
        
        {/* Expected Line */}
        {showExpectedLine && expectedScore && (
          <div 
            className={styles.expectedLine} 
            style={{ left: `${(expectedScore / 60) * 100}%` }} 
          />
        )}
        
        {/* Modeled Total Label */}
        {modeledTotal && (
          <div 
            className={styles.endTotalLabel} 
            style={{ left: `${(modeledTotal / 60) * 100}%` }}
          >
            <span className={styles.endTotalText}>
              {Math.round(modeledTotal)}
            </span>
          </div>
        )}
      </div>
      
      {/* Labels */}
      <div className={styles.barChartLabels}>
        {showStartBar && (
          <div className={styles.barChartLabel}>
            <div className={styles.labelDot} style={{ backgroundColor: '#007cbb' }} />
            <span className={styles.labelText} style={{ color: '#007cbb' }}>
              Start: {startTotal}
            </span>
          </div>
        )}
        
        {showExpectedLine && expectedScore && (
          <div className={styles.barChartLabel}>
            <div className={styles.labelDot} style={{ backgroundColor: '#dc3545' }} />
            <span className={styles.labelText} style={{ color: '#dc3545' }}>
              Expected: {expectedScore.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      
      {/* Second Line - Gain and Modeled */}
      <div className={styles.barChartLabels}>
        {showGainBar && actualGain > 0 && (
          <div className={styles.barChartLabel}>
            <div className={styles.labelDot} style={{ backgroundColor: '#5bc0de' }} />
            <span className={styles.labelText} style={{ color: '#5bc0de' }}>
              Gain: {Math.round(actualGain)}
            </span>
          </div>
        )}
        
        {modeledTotal && (
          <div className={styles.barChartLabel}>
            <div className={styles.labelDot} style={{ backgroundColor: '#7fbc42' }} />
            <span className={styles.labelText} style={{ color: '#7fbc42' }}>
              Modeled: {Math.round(modeledTotal)}
            </span>
            {expectedScore && (
              <div 
                className={styles.comparisonIndicator} 
                style={{ 
                  backgroundColor: modeledTotal >= expectedScore ? '#d4edda' : '#f8d7da' 
                }}
              >
                <span 
                  className={styles.comparisonIcon} 
                  style={{ color: modeledTotal >= expectedScore ? '#155724' : '#721c24' }}
                >
                  {modeledTotal >= expectedScore ? '✓' : '✗'}
                </span>
                <span 
                  className={styles.comparisonText} 
                  style={{ color: modeledTotal >= expectedScore ? '#155724' : '#721c24' }}
                >
                  {modeledTotal >= expectedScore 
                    ? `+${(modeledTotal - expectedScore).toFixed(2)} over`
                    : `${(expectedScore - modeledTotal).toFixed(2)} under`
                  }
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Required Label on Separate Line */}
      {showExpectedLine && !showGainBar && expectedScore && (
        <div className={styles.barChartLabel}>
          <div className={styles.labelDot} style={{ backgroundColor: '#5bc0de' }} />
          <span className={styles.labelText} style={{ color: '#5bc0de' }}>
            Required Gain: {requiredGain.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
};

export default AdvancedScoreBarChart;
