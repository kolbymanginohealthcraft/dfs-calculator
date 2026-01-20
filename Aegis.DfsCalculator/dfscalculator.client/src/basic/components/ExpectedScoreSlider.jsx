import React from 'react';
import './ExpectedScoreSlider.css';

const ExpectedScoreSlider = ({ 
  startTotal, 
  expectedScore, 
  sliderValue, 
  onSliderChange, 
  onFineAdjustment 
}) => {
  return (
    <div className="expected-score-slider">
      <div className="slider-header">
        <h2>Adjust Expected Score</h2>
        <p>Drag the slider or use the fine adjustment buttons</p>
      </div>
      
      <div className="slider-wrapper">
        <input
          type="range"
          min={startTotal}
          max="60"
          step="0.01"
          value={sliderValue}
          onChange={onSliderChange}
          className="score-slider"
        />
        <div className="slider-labels">
          <span>{startTotal}</span>
          <span>{(startTotal + (60 - startTotal) / 2).toFixed(1)}</span>
          <span>60</span>
        </div>
      </div>

      <div className="fine-adjustment">
        <button 
          className="adjust-btn"
          onClick={() => onFineAdjustment(-0.01)}
        >
          -0.01
        </button>
        <button 
          className="adjust-btn"
          onClick={() => onFineAdjustment(-0.1)}
        >
          -0.1
        </button>
        <span className="current-value">{expectedScore.toFixed(2)}</span>
        <button 
          className="adjust-btn"
          onClick={() => onFineAdjustment(0.1)}
        >
          +0.1
        </button>
        <button 
          className="adjust-btn"
          onClick={() => onFineAdjustment(0.01)}
        >
          +0.01
        </button>
      </div>
    </div>
  );
};

export default ExpectedScoreSlider;
