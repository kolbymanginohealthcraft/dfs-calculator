import React from 'react';
import styles from './ExpectedScoreSlider.module.css';

const ExpectedScoreSlider = ({ 
  startTotal, 
  expectedScore, 
  sliderValue, 
  onSliderChange, 
  onFineAdjustment 
}) => {
  return (
    <div className={styles.expectedScoreSlider}>
      <div className={styles.sliderHeader}>
        <h2>Adjust Expected Score</h2>
        <p>Drag the slider or use the fine adjustment buttons</p>
      </div>
      
      <div className={styles.sliderWrapper}>
        <input
          type="range"
          min={startTotal}
          max="60"
          step="0.01"
          value={sliderValue}
          onChange={onSliderChange}
          className={styles.scoreSlider}
        />
        <div className={styles.sliderLabels}>
          <span>{startTotal}</span>
          <span>{(startTotal + (60 - startTotal) / 2).toFixed(1)}</span>
          <span>60</span>
        </div>
      </div>

      <div className={styles.fineAdjustment}>
        <button 
          className={styles.adjustBtn}
          onClick={() => onFineAdjustment(-0.01)}
        >
          -0.01
        </button>
        <button 
          className={styles.adjustBtn}
          onClick={() => onFineAdjustment(-0.1)}
        >
          -0.1
        </button>
        <span className={styles.currentValue}>{expectedScore.toFixed(2)}</span>
        <button 
          className={styles.adjustBtn}
          onClick={() => onFineAdjustment(0.1)}
        >
          +0.1
        </button>
        <button 
          className={styles.adjustBtn}
          onClick={() => onFineAdjustment(0.01)}
        >
          +0.01
        </button>
      </div>
    </div>
  );
};

export default ExpectedScoreSlider;
