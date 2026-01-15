import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { calculateExpectedScore, hasMeaningfulData } from '../../utils/scoreCalculations';
import { getScoreTypeColor } from '../../utils/themeColors';
import { useDataLossWarning } from '../../contexts/DataLossWarningContext';
import ScoreBarChart from '../../components/ScoreBarChart';
import InstructionPanel from '../components/InstructionPanel';
import ExpectedScoreSlider from '../components/ExpectedScoreSlider';
import BasicLayout from '../components/BasicLayout';
import DataLossWarningModal from '../../components/DataLossWarningModal';
import { instructionContent } from '../../data/instructionContent';

const ExpectedScoreScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { startScores, startTotal, expectedScore: incomingExpectedScore, mobilityType } = location.state || {};
  const { updateDataStatus, clearDataStatus } = useDataLossWarning();
  
  const [expectedScore, setExpectedScore] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);

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

  // Track data changes for data loss warnings
  useEffect(() => {
    // Check if required gain is different from 0 (meaning user has modified the expected score)
    const requiredGain = expectedScore - startTotal;
    const hasModifiedExpectedScore = requiredGain > 0;
    
    
    updateDataStatus('basicExpected', hasModifiedExpectedScore, 'Expected score has been modified');
  }, [expectedScore, startTotal, updateDataStatus]);

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

  // Handle switch to advanced warning
  const handleSwitchToAdvanced = useCallback(() => {
    setShowSwitchWarning(true);
  }, []);

  const handleConfirmSwitch = useCallback(() => {
    setShowSwitchWarning(false);
    clearDataStatus(); // Clear the data status when user confirms the switch
    navigate('/advanced');
  }, [navigate, clearDataStatus]);

  const handleCancelSwitch = useCallback(() => {
    setShowSwitchWarning(false);
  }, []);

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
    <>
      <BasicLayout 
        rightPanel={<InstructionPanel {...instructionContent.expected} />}
        currentStep="expected"
        onStepPress={handleStepPress}
        startTotal={startTotal}
        expectedScore={expectedScore}
        onSwitchToAdvanced={handleSwitchToAdvanced}
      >
      <div className="score-bar-chart-container">
        <ScoreBarChart
          startTotal={startTotal}
          expectedScore={expectedScore}
          variant="expected"
        />
      </div>

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

      {/* Data Loss Warning Modal for Switch to Advanced */}
      <DataLossWarningModal
        isOpen={showSwitchWarning}
        onClose={handleCancelSwitch}
        onConfirm={handleConfirmSwitch}
        title="Switch to Advanced Mode"
        message="You have entered data that will be lost if you switch to advanced mode. Are you sure you want to continue?"
        confirmText="Yes, Switch"
        cancelText="Stay in Basic"
      />
    </>
  );
};

export default ExpectedScoreScreen;
