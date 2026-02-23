import React from 'react';
import { getScoreTypeColor } from '../utils/themeColors';
import './ScoreBarChart.css';

const ScoreBarChart = ({ 
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
  // New props for flexibility
  mode = 'basic', // 'basic' or 'advanced'
  variant = 'start', // 'start', 'expected', 'end'
  endLabel = 'End', // 'End' or 'Modeled'
  gainLabel = 'Gain' // 'Gain' or 'Gain'
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
    <div className="score-bar-chart" style={{ paddingTop }}>
      <div className="chart-title-container">
        <h3 className="chart-title">{title}</h3>
        {shouldShowComparisonIndicator && expectedScore && endTotal && (
          <div 
            className="comparison-indicator" 
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
              className="comparison-text" 
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
      
      <div className="bar-chart-track">
        {/* Start Score Bar */}
        {shouldShowStartBar && (
          <div 
            className="start-bar" 
            style={{ width: `${(startTotal / 60) * 100}%` }}
          >
            <span className="bar-value-text">{Number.isInteger(startTotal) ? startTotal : startTotal.toFixed(2)}</span>
          </div>
        )}
        
        {/* Required Gain Background (Transparent) */}
        {shouldShowRequiredBackground && (
          <div 
            className="required-background" 
            style={{ 
              width: `${(requiredGain / 60) * 100}%`,
              left: `${(startTotal / 60) * 100}%`
            }} 
          />
        )}
        
        {/* Gain Bar */}
        {shouldShowGainBar && actualGain > 0 && (
          <div 
            className="gain-bar" 
            style={{ 
              width: `${(actualGain / 60) * 100}%`,
              left: `${(startTotal / 60) * 100}%`
            }}
          >
            {actualGain >= 1 && (
              <span className="bar-value-text">{Number.isInteger(actualGain) ? actualGain : actualGain.toFixed(2)}</span>
            )}
          </div>
        )}
        
        {/* Expected Line */}
        {shouldShowExpectedLine && expectedScore && (
          <div 
            className="expected-line" 
            style={{ left: `${(expectedScore / 60) * 100}%` }} 
          />
        )}
        
        {/* End Total Label */}
        {endTotal && (
          <div 
            className="end-total-label" 
            style={{ left: `${(endTotal / 60) * 100}%` }}
          >
            <span 
              className="end-total-text" 
              style={{ color: getScoreTypeColor('end', 'primary') }}
            >
              {Number.isInteger(endTotal) ? endTotal : endTotal.toFixed(2)}
            </span>
          </div>
        )}
        
        {/* Required Gain Label */}
        {shouldShowRequiredBackground && !shouldShowGainBar && requiredGain > 6 && (
          <div 
            className="required-gain-label" 
            style={{ 
              left: `${(startTotal / 60) * 100}%`,
              width: `${(requiredGain / 60) * 100}%`
            }}
          >
            <span className="required-gain-text">{requiredGain.toFixed(2)}</span>
          </div>
        )}
      </div>
      
      {/* Labels - Always show all entries for consistency */}
      <div className="bar-chart-labels">
        {/* Start Label - Always show */}
        <div className="bar-chart-label">
          <div 
            className="label-dot" 
            style={{ backgroundColor: getScoreTypeColor('start', 'primary') }} 
          />
          <span 
            className="label-text" 
            style={{ color: getScoreTypeColor('start', 'primary') }}
          >
            Start: {Number.isInteger(startTotal) ? startTotal : startTotal.toFixed(2)}
          </span>
        </div>
        
        {/* Expected Label - Show if we have expected score, otherwise show TBD */}
        <div className="bar-chart-label">
          <div 
            className="label-dot" 
            style={{ backgroundColor: getScoreTypeColor('expected', 'primary') }} 
          />
          <span 
            className="label-text" 
            style={{ color: getScoreTypeColor('expected', 'primary') }}
          >
            {expectedScore ? `Expected: ${expectedScore.toFixed(2)}` : 'Expected: TBD'}
          </span>
        </div>
      </div>
      
      {/* Second Line - Gain and End */}
      <div className="bar-chart-labels">
        {/* Gain Label - Always show, with required gain info if available */}
        <div className="bar-chart-label">
          <div 
            className="label-dot" 
            style={{ backgroundColor: '#5bc0de' }} 
          />
          <span 
            className="label-text" 
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
        <div className="bar-chart-label">
          <div 
            className="label-dot" 
            style={{ backgroundColor: getScoreTypeColor('end', 'primary') }} 
          />
          <span 
            className="label-text" 
            style={{ color: getScoreTypeColor('end', 'primary') }}
          >
            {endTotal ? `${endLabel}: ${Number.isInteger(endTotal) ? endTotal : endTotal.toFixed(2)}` : `${endLabel}: TBD`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ScoreBarChart;