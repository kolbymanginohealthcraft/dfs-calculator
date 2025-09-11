import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { calculateExpectedScore, hasMeaningfulData } from '../utils/scoreCalculations';
import { getScoreTypeColor } from '../../utils/themeColors';
import ScoreBarChart from '../../components/ScoreBarChart';
import ProgressIndicator from '../components/ProgressIndicator';
import InstructionPanel from '../components/InstructionPanel';
import ExpectedScoreSlider from '../components/ExpectedScoreSlider';
import BasicLayout from '../components/BasicLayout';
import { instructionContent } from '../data/instructionContent';

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
    <BasicLayout rightPanel={<InstructionPanel {...instructionContent.expected} />}>
      <div className="score-bar-chart-container">
        <ScoreBarChart
          startTotal={startTotal}
          expectedScore={expectedScore}
          variant="expected"
        />
      </div>

      <ProgressIndicator
        currentStep="expected"
        onStepPress={handleStepPress}
        startTotal={startTotal}
        expectedScore={expectedScore}
        hasInteracted={hasInteracted}
      />

      <ExpectedScoreSlider
        startTotal={startTotal}
        expectedScore={expectedScore}
        sliderValue={sliderValue}
        onSliderChange={handleSliderChange}
        onFineAdjustment={handleFineAdjustment}
      />

      <div className="action-buttons">
        {/* Button removed - navigation happens automatically via progress indicator */}
      </div>
    </BasicLayout>
  );
};

export default ExpectedScoreScreen;
