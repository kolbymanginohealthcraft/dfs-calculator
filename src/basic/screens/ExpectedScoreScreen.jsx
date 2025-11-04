import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// Score calculations now handled server-side
import { getScoreTypeColor } from '../../utils/themeColors';
import { useDataLossWarning } from '../../contexts/DataLossWarningContext';
import { createOptimizedBasicAPIService } from '../../utils/optimizedApiService';
// Optimistic calculations removed for security
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
  
  const [expectedScore, setExpectedScore] = useState(() => {
    // Initialize with incoming expected score or fallback
    return incomingExpectedScore || startTotal;
  });
  const [sliderValue, setSliderValue] = useState(() => {
    // Initialize slider with same value
    return incomingExpectedScore || startTotal;
  });
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Initialize API service (memoized to prevent infinite loops)
  const apiService = useMemo(() => createOptimizedBasicAPIService(150), []);

  useEffect(() => {
    const updateExpectedScore = async () => {
      if (startTotal && !incomingExpectedScore) {
        // Only run API call if we don't have an incoming expected score
        try {
          setIsCalculating(true);
          console.log('ExpectedScoreScreen: Using API for calculation');
          const result = await apiService.calculateScore(startScores, mobilityType);
          const calculatedExpected = result.result.functionScore;
          console.log('ExpectedScoreScreen: API result:', calculatedExpected);
          
          setExpectedScore(calculatedExpected);
          setSliderValue(calculatedExpected);
        } catch (error) {
          console.error('API calculation failed:', error);
          throw new Error('Unable to calculate expected score. Please check your connection and try again.');
        } finally {
          setIsCalculating(false);
        }
      }
    };
    
    // Only run API call after a delay to avoid excessive calls
    const timeoutId = setTimeout(updateExpectedScore, 500);
    return () => clearTimeout(timeoutId);
  }, [startTotal, mobilityType, incomingExpectedScore, startScores, apiService]);

  const updateSliderPosition = (score) => {
    setExpectedScore(score);
    setSliderValue(score);
  };

  const handleSliderChange = (e) => {
    const value = parseFloat(e.target.value);
    // Update immediately for instant feedback
    setExpectedScore(value);
    setSliderValue(value);
  };

  const handleFineAdjustment = (delta) => {
    const newScore = Math.max(startTotal, Math.min(60, expectedScore + delta));
    // Update immediately for instant feedback
    setExpectedScore(newScore);
    setSliderValue(newScore);
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
  // Data preservation check simplified for server-side calculations
  const hasDataToPreserve = startTotal > 0 || expectedScore > 0;

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
