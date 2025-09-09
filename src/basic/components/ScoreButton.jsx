import React from 'react';
import '../styles/ScoreButton.css';

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
      className={`score-btn ${type}-btn`}
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
