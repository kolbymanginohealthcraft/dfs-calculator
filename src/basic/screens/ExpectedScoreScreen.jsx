import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { calculateExpectedScore, hasMeaningfulData } from '../../utils/scoreCalculations';
import { getScoreTypeColor } from '../../utils/themeColors';
import { useDataLossWarning } from '../../contexts/DataLossWarningContext';
import { BasicAPIService } from '../../utils/apiService';
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
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Initialize API service (memoized to prevent infinite loops)
  const apiService = useMemo(() => new BasicAPIService(), []);

  useEffect(() => {
    const updateExpectedScore = async () => {
      if (startTotal) {
        if (incomingExpectedScore) {
          // Use the incoming expected score if available
          setExpectedScore(incomingExpectedScore);
          setSliderValue(incomingExpectedScore);
        } else {
          // Calculate new expected score using API
          try {
            setIsCalculating(true);
            console.log('ExpectedScoreScreen: Using API for calculation');
            const result = await apiService.calculateScore(startScores, mobilityType);
            const calculatedExpected = result.result.functionScore; // Use function score as expected
            console.log('ExpectedScoreScreen: API result:', calculatedExpected);
            setExpectedScore(calculatedExpected);
            setSliderValue(calculatedExpected);
          } catch (error) {
            console.error('API calculation failed, falling back to client-side:', error);
            // Fallback to client-side calculation
            const calculatedExpected = calculateExpectedScore(startTotal, mobilityType);
            console.log('ExpectedScoreScreen: Using client-side fallback:', calculatedExpected);
            setExpectedScore(calculatedExpected);
            setSliderValue(calculatedExpected);
          } finally {
            setIsCalculating(false);
          }
        }
      }
    };
    
    updateExpectedScore();
  }, [startTotal, mobilityType, incomingExpectedScore, startScores, apiService]);

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
