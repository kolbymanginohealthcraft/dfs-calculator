import React from 'react';
import { getScoreTypeColor } from '../utils/themeColors';
import '../styles/ScoreBarChart.css';

const ScoreBarChart = ({ 
  startTotal, 
  expectedScore, 
  endTotal, 
  showStartBar = true,
  showExpectedLine = false,
  showGainBar = false,
  showRequiredBackground = false,
  showExpectedPlaceholder = true,
  title = "Score Progress",
  paddingTop = 0,
  showComparisonIndicator = false
}) => {
  const actualGain = endTotal ? endTotal - startTotal : 0;
  const requiredGain = expectedScore ? expectedScore - startTotal : 0;

  return (
    <div className="score-bar-chart" style={{ paddingTop }}>
      <h3 className="chart-title">{title}</h3>
      
      <div className="bar-chart-track">
        {/* Start Score Bar */}
        {showStartBar && (
          <div 
            className="start-bar" 
            style={{ width: `${(startTotal / 60) * 100}%` }}
          >
            <span className="bar-value-text">{startTotal}</span>
          </div>
        )}
        
        {/* Required Gain Background (Transparent) */}
        {showRequiredBackground && (
          <div 
            className="required-background" 
            style={{ 
              width: `${(requiredGain / 60) * 100}%`,
              left: `${(startTotal / 60) * 100}%`
            }} 
          />
        )}
        
        {/* Gain Bar */}
        {showGainBar && (
          <div 
            className="gain-bar" 
            style={{ 
              width: `${(actualGain / 60) * 100}%`,
              left: `${(startTotal / 60) * 100}%`
            }}
          >
            {actualGain >= 1 && (
              <span className="bar-value-text">{Math.round(actualGain)}</span>
            )}
          </div>
        )}
        
        {/* Expected Line */}
        {showExpectedLine && (
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
              {Math.round(endTotal)}
            </span>
          </div>
        )}
        
        {/* Required Gain Label */}
        {showRequiredBackground && !showGainBar && requiredGain > 6 && (
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
      
      {/* Labels */}
      <div className="bar-chart-labels">
        {showStartBar && (
          <div className="bar-chart-label">
            <div 
              className="label-dot" 
              style={{ backgroundColor: getScoreTypeColor('start', 'primary') }} 
            />
            <span 
              className="label-text" 
              style={{ color: getScoreTypeColor('start', 'primary') }}
            >
              Start: {startTotal}
            </span>
          </div>
        )}
        
        {showExpectedLine && (
          <div className="bar-chart-label">
            <div 
              className="label-dot" 
              style={{ backgroundColor: getScoreTypeColor('expected', 'primary') }} 
            />
            <span 
              className="label-text" 
              style={{ color: getScoreTypeColor('expected', 'primary') }}
            >
              Expected: {expectedScore.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      
      {/* Second Line - Gain and End */}
      <div className="bar-chart-labels">
        {showGainBar && (
          <div className="bar-chart-label">
            <div 
              className="label-dot" 
              style={{ backgroundColor: '#5bc0de' }} 
            />
            <span 
              className="label-text" 
              style={{ color: '#5bc0de' }}
            >
              Gain: {Math.round(actualGain)}
            </span>
          </div>
        )}
        
        {endTotal && (
          <div className="bar-chart-label">
            <div 
              className="label-dot" 
              style={{ backgroundColor: getScoreTypeColor('end', 'primary') }} 
            />
            <span 
              className="label-text" 
              style={{ color: getScoreTypeColor('end', 'primary') }}
            >
              End: {Math.round(endTotal)}
            </span>
            {showComparisonIndicator && expectedScore && (
              <div 
                className="comparison-indicator" 
                style={{ 
                  backgroundColor: endTotal >= expectedScore ? '#d4edda' : '#f8d7da' 
                }}
              >
                <span 
                  className="comparison-icon" 
                  style={{ color: endTotal >= expectedScore ? '#155724' : '#721c24' }}
                >
                  {endTotal >= expectedScore ? '✓' : '✗'}
                </span>
                <span 
                  className="comparison-text" 
                  style={{ color: endTotal >= expectedScore ? '#155724' : '#721c24' }}
                >
                  {endTotal >= expectedScore 
                    ? `+${(endTotal - expectedScore).toFixed(2)} over`
                    : `${(expectedScore - endTotal).toFixed(2)} under`
                  }
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Required Label on Separate Line */}
      {showExpectedLine && !showGainBar && (
        <div className="bar-chart-label">
          <div 
            className="label-dot" 
            style={{ backgroundColor: '#5bc0de' }} 
          />
          <span 
            className="label-text" 
            style={{ color: '#5bc0de' }}
          >
            Required Gain: {requiredGain.toFixed(2)}
          </span>
        </div>
      )}
      
      {/* Placeholder for Expected - Only show if we have start bar but no expected line */}
      {showStartBar && !showExpectedLine && showExpectedPlaceholder && (
        <div className="bar-chart-label">
          <div 
            className="label-dot" 
            style={{ backgroundColor: getScoreTypeColor('expected', 'primary') }} 
          />
          <span 
            className="label-text" 
            style={{ color: getScoreTypeColor('expected', 'primary') }}
          >
            Expected: Set in next step
          </span>
        </div>
      )}
    </div>
  );
};

export default ScoreBarChart;
