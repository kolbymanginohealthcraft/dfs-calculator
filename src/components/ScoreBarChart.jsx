import React from 'react';
import { getScoreTypeColor } from '../utils/themeColors';
import styles from './ScoreBarChart.module.css';

const ScoreBarChart = React.memo(({ 
  startTotal, 
  expectedScore, 
  endTotal, 
  showStartBar = true,
  showExpectedLine = false,
  showGainBar = false,
  showRequiredBackground = false,
  showExpectedPlaceholder = true,
  title = "DFS Calculation Summary",
  paddingTop = 0,
  showComparisonIndicator = false,
  mode = 'basic',
  variant = 'start',
  endLabel = 'End',
  gainLabel = 'Gain'
}) => {
  const actualGain = endTotal ? endTotal - startTotal : 0;
  const requiredGain = expectedScore ? expectedScore - startTotal : 0;

  // Determine which elements to show based on variant
  const shouldShowStartBar = showStartBar;
  const shouldShowExpectedLine = showExpectedLine || variant === 'expected' || variant === 'end';
  const shouldShowGainBar = showGainBar || variant === 'end';
  const shouldShowRequiredBackground = showRequiredBackground || variant === 'expected';
  const shouldShowComparisonIndicator = showComparisonIndicator || variant === 'end';
  
  // Always show all legend entries for consistency
  const shouldShowAllLegends = true;

  return (
    <div className={styles.scoreBarChart} style={{ paddingTop }}>
      <div className={styles.chartTitleContainer}>
        <h3 className={styles.chartTitle}>{title}</h3>
        {shouldShowComparisonIndicator && expectedScore && endTotal && (
          <div 
            className={styles.comparisonIndicator} 
            style={{ 
              backgroundColor: endTotal >= expectedScore 
                ? 'linear-gradient(135deg, #10b981, #059669)' 
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              background: endTotal >= expectedScore 
                ? 'linear-gradient(135deg, #10b981, #059669)' 
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              borderColor: endTotal >= expectedScore ? '#059669' : '#dc2626'
            }}
          >
            <span 
              className={styles.comparisonText} 
              style={{ color: '#ffffff' }}
            >
              {endTotal >= expectedScore 
                ? `+${(endTotal - expectedScore).toFixed(2)} over`
                : `${(expectedScore - endTotal).toFixed(2)} under`
              }
            </span>
          </div>
        )}
      </div>
      
      <div className={styles.barChartTrack}>
        {/* Start Score Bar */}
        {shouldShowStartBar && (
          <div 
            className={styles.startBar} 
            style={{ width: `${(startTotal / 60) * 100}%` }}
          >
            <span className={styles.barValueText}>{Number.isInteger(startTotal) ? startTotal : startTotal.toFixed(2)}</span>
          </div>
        )}
        
        {/* Required Gain Background (Transparent) */}
        {shouldShowRequiredBackground && (
          <div 
            className={styles.requiredBackground} 
            style={{ 
              width: `${(requiredGain / 60) * 100}%`,
              left: `${(startTotal / 60) * 100}%`
            }} 
          />
        )}
        
        {/* Gain Bar */}
        {shouldShowGainBar && actualGain > 0 && (
          <div 
            className={styles.gainBar} 
            style={{ 
              width: `${(actualGain / 60) * 100}%`,
              left: `${(startTotal / 60) * 100}%`
            }}
          >
            {actualGain >= 1 && (
              <span className={styles.barValueText}>{Number.isInteger(actualGain) ? actualGain : actualGain.toFixed(2)}</span>
            )}
          </div>
        )}
        
        {/* Expected Line */}
        {shouldShowExpectedLine && expectedScore && (
          <div 
            className={styles.expectedLine} 
            style={{ left: `${(expectedScore / 60) * 100}%` }} 
          />
        )}
        
        {/* End Total Label */}
        {endTotal && (
          <div 
            className={styles.endTotalLabel} 
            style={{ left: `${(endTotal / 60) * 100}%` }}
          >
            <span 
              className={styles.endTotalText} 
              style={{ color: getScoreTypeColor('end', 'primary') }}
            >
              {Number.isInteger(endTotal) ? endTotal : endTotal.toFixed(2)}
            </span>
          </div>
        )}
        
        {/* Required Gain Label */}
        {shouldShowRequiredBackground && !shouldShowGainBar && requiredGain > 6 && (
          <div 
            className={styles.requiredGainLabel} 
            style={{ 
              left: `${(startTotal / 60) * 100}%`,
              width: `${(requiredGain / 60) * 100}%`
            }}
          >
            <span className={styles.requiredGainText}>{requiredGain.toFixed(2)}</span>
          </div>
        )}
      </div>
      
      {/* Labels - Always show all entries for consistency */}
      <div className={styles.barChartLabels}>
        {/* Start Label - Always show */}
        <div className={styles.barChartLabel}>
          <div 
            className={styles.labelDot} 
            style={{ backgroundColor: getScoreTypeColor('start', 'primary') }} 
          />
          <span 
            className={styles.labelText} 
            style={{ color: getScoreTypeColor('start', 'primary') }}
          >
            Start: {Number.isInteger(startTotal) ? startTotal : startTotal.toFixed(2)}
          </span>
        </div>
        
        {/* Expected Label - Show if we have expected score, otherwise show TBD */}
        <div className={styles.barChartLabel}>
          <div 
            className={styles.labelDot} 
            style={{ backgroundColor: getScoreTypeColor('expected', 'primary') }} 
          />
          <span 
            className={styles.labelText} 
            style={{ color: getScoreTypeColor('expected', 'primary') }}
          >
            {expectedScore ? `Expected: ${expectedScore.toFixed(2)}` : 'Expected: TBD'}
          </span>
        </div>
      </div>
      
      {/* Second Line - Gain and End */}
      <div className={styles.barChartLabels}>
        {/* Gain Label - Always show, with required gain info if available */}
        <div className={styles.barChartLabel}>
          <div 
            className={styles.labelDot} 
            style={{ backgroundColor: '#5bc0de' }} 
          />
          <span 
            className={styles.labelText} 
            style={{ color: '#5bc0de' }}
          >
            {expectedScore ? (
              <>
                {gainLabel}: {endTotal ? (Number.isInteger(actualGain) ? actualGain : actualGain.toFixed(2)) : 'TBD'}
                {requiredGain > 0 && (
                  <span style={{ fontSize: '0.9em', opacity: 0.8 }}>
                    {' '}(required {requiredGain.toFixed(2)})
                  </span>
                )}
              </>
            ) : (
              `${gainLabel}: TBD`
            )}
          </span>
        </div>
        
        {/* End Label - Always show */}
        <div className={styles.barChartLabel}>
          <div 
            className={styles.labelDot} 
            style={{ backgroundColor: getScoreTypeColor('end', 'primary') }} 
          />
          <span 
            className={styles.labelText} 
            style={{ color: getScoreTypeColor('end', 'primary') }}
          >
            {endTotal ? `${endLabel}: ${Number.isInteger(endTotal) ? endTotal : endTotal.toFixed(2)}` : `${endLabel}: TBD`}
          </span>
        </div>
      </div>
    </div>
  );
});

export default ScoreBarChart;