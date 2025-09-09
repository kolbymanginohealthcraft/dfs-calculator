import React from 'react';
import { getScoreTypeColor } from '../utils/themeColors';
import '../styles/BarbellChart.css';

const BarbellChart = ({ 
  startScore, 
  endScore = null, 
  showEndNode = false,
  width = 120,
  height = 24
}) => {
  // Calculate positions based on scores (1-6 scale)
  const startPosition = ((startScore - 1) / 5) * (width - 24); // 24px for start node width
  const endPosition = endScore ? ((endScore - 1) / 5) * (width - 20) + 2 : null; // 20px for end node width, offset by 2px to center

  return (
    <div className="barbell-chart" style={{ width, height }}>
      {/* Background track */}
      <div className="barbell-track" />
      
      {/* Start node */}
      <div 
        className="barbell-node barbell-start-node"
        style={{ 
          left: startPosition,
          backgroundColor: getScoreTypeColor('start', 'primary')
        }}
      >
        <span className="barbell-node-text">{startScore}</span>
      </div>
      
      {/* End node (if applicable) */}
      {showEndNode && endScore && (
        <div 
          className="barbell-node barbell-end-node"
          style={{ 
            left: endPosition,
            backgroundColor: getScoreTypeColor('end', 'primary')
          }}
        >
          <span className="barbell-end-node-text">{endScore}</span>
        </div>
      )}
      
      {/* Connection line (if both nodes exist) */}
      {showEndNode && endScore && (
        <div 
          className="barbell-connection-line"
          style={{
            left: Math.min(startPosition + 12, endPosition + 10),
            width: Math.abs(endPosition - startPosition),
          }}
        />
      )}
    </div>
  );
};

export default BarbellChart;
