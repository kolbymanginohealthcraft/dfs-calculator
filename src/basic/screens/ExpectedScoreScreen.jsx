import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { calculateExpectedScore, hasMeaningfulData } from '../utils/scoreCalculations';
import { getScoreTypeColor } from '../utils/themeColors';
import ScoreBarChart from '../../components/ScoreBarChart';
import ProgressIndicator from '../components/ProgressIndicator';
import StepInstruction from '../components/StepInstruction';
import InstructionPanel from '../components/InstructionPanel';
import Navbar from '../../components/Navbar';
import { instructionContent } from '../data/instructionContent';
import '../styles/BasicLayout.css';

const ExpectedScoreScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { startScores, startTotal, expectedScore: incomingExpectedScore, mobilityType } = location.state || {};
  
  const [expectedScore, setExpectedScore] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (startTotal) {
      if (incomingExpectedScore) {
        // Use the incoming expected score if available
        setExpectedScore(incomingExpectedScore);
        setSliderValue(incomingExpectedScore);
      } else {
        // Calculate new expected score if none provided
        const calculatedExpected = calculateExpectedScore(startTotal, mobilityType);
        setExpectedScore(calculatedExpected);
        setSliderValue(calculatedExpected);
      }
    }
  }, [startTotal, mobilityType, incomingExpectedScore]);

  const updateSliderPosition = (score) => {
    setExpectedScore(score);
    setSliderValue(score);
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  };

  const handleSliderChange = (e) => {
    const value = parseFloat(e.target.value);
    updateSliderPosition(value);
  };

  const handleFineAdjustment = (delta) => {
    const newScore = Math.max(startTotal, Math.min(60, expectedScore + delta));
    updateSliderPosition(newScore);
  };

  const handleSubmit = () => {
    navigate('/basic/end-score', {
      state: {
        startScores,
        startTotal,
        expectedScore,
        mobilityType,
      }
    });
  };

  const handleBackClick = () => {
    navigate('/basic/start-score', {
      state: {
        startScores,
        startTotal,
        mobilityType,
      }
    });
  };

  const handleHomeClick = () => {
    navigate('/basic');
  };

  const handleStepPress = (step) => {
    if (step === 'expected') {
      // Already on expected step
      return;
    }
    
    if (step === 'start') {
      navigate('/basic/start-score', {
        state: {
          startScores,
          startTotal,
          mobilityType,
        }
      });
    } else if (step === 'end' && (expectedScore - startTotal) > 0) {
      handleSubmit();
    }
  };

  const scoreDifference = expectedScore - startTotal;
  const hasDataToPreserve = hasMeaningfulData(startScores, startTotal, expectedScore);

  return (
    <div className="score-screen">
      <Navbar />

      <div className="main-content">
        <div className="content-left">
          <ProgressIndicator
            currentStep="expected"
            onStepPress={handleStepPress}
            startTotal={startTotal}
            expectedScore={expectedScore}
            hasInteracted={hasInteracted}
          />

          {/* <div className="step-instruction-container">
            <StepInstruction currentStep="expected" />
          </div> */}

          <div className="score-bar-chart-container">
            <ScoreBarChart
              startTotal={startTotal}
              expectedScore={expectedScore}
              variant="expected"
              title="Building the Target"
            />
          </div>

          <div className="slider-container">
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
                onChange={handleSliderChange}
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
                onClick={() => handleFineAdjustment(-0.01)}
              >
                -0.01
              </button>
              <button 
                className="adjust-btn"
                onClick={() => handleFineAdjustment(-0.1)}
              >
                -0.1
              </button>
              <span className="current-value">{expectedScore.toFixed(2)}</span>
              <button 
                className="adjust-btn"
                onClick={() => handleFineAdjustment(0.1)}
              >
                +0.1
              </button>
              <button 
                className="adjust-btn"
                onClick={() => handleFineAdjustment(0.01)}
              >
                +0.01
              </button>
            </div>
          </div>

          <div className="action-buttons">
            {/* Button removed - navigation happens automatically via progress indicator */}
          </div>
        </div>

        <div className="content-right">
          <InstructionPanel {...instructionContent.expected} />
        </div>
      </div>
    </div>
  );
};

export default ExpectedScoreScreen;
