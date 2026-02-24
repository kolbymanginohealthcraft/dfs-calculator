import React from 'react';
import { getScoreTypeColor } from '../utils/themeColors';
import styles from './BarbellChart.module.css';

const formatNodeLabel = (val) => Number.isInteger(val) ? val : val.toFixed(2);

const BarbellChart = ({ 
  startScore, 
  endScore = null, 
  showEndNode = false,
  width = 120,
  height = 24
}) => {
  // Calculate positions based on scores (1-6 continuous scale)
  const basePosition = ((startScore - 1) / 5) * (width - 24);
  const startPosition = basePosition;
  const endPosition = endScore ? ((endScore - 1) / 5) * (width - 24) + 2 : null;

  const startIsFloat = !Number.isInteger(startScore);
  const endIsFloat = endScore != null && !Number.isInteger(endScore);

  return (
    <div className={styles.barbellChart} style={{ width, height }}>
      {/* Background track */}
      <div className={styles.barbellTrack} />
      
      {/* Start node */}
      <div 
        className={`${styles.barbellNode} ${styles.barbellStartNode}${startIsFloat ? ` ${styles.barbellNodeWide}` : ''}`}
        style={{ 
          left: startPosition,
          backgroundColor: getScoreTypeColor('start', 'primary')
        }}
      >
        <span className={styles.barbellNodeText}>{formatNodeLabel(startScore)}</span>
      </div>
      
      {/* End node (if applicable) */}
      {showEndNode && endScore && (
        <div 
          className={`${styles.barbellNode} ${styles.barbellEndNode}${endIsFloat ? ` ${styles.barbellEndNodeWide}` : ''}`}
          style={{ 
            left: endPosition,
            backgroundColor: getScoreTypeColor('end', 'primary')
          }}
        >
          <span className={styles.barbellEndNodeText}>{formatNodeLabel(endScore)}</span>
        </div>
      )}
      
      {/* Connection line (if both nodes exist) */}
      {showEndNode && endScore && (
        <div 
          className={styles.barbellConnectionLine}
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
