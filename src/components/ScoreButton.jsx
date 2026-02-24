import React from 'react';
import styles from './ScoreButton.module.css';

const ScoreButton = ({ 
  type, // 'plus' or 'minus'
  onClick, 
  disabled = false, 
  color = '#007cbb', // default blue color
  outlineColor = null // outline color, defaults to button color if not specified
}) => {
  const finalOutlineColor = outlineColor || color;
  
  return (
    <button
      className={`${styles.scoreBtn} ${type === 'plus' ? styles.plusBtn : styles.minusBtn}`}
      onClick={onClick}
      disabled={disabled}
      style={{ 
        '--button-color': color,
        '--outline-color': finalOutlineColor
      }}
    >
      {type === 'plus' ? '+' : '-'}
    </button>
  );
};

export default ScoreButton;
