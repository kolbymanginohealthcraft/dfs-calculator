import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getContributingKeys, getInitialScores, SCORE_CONSTANTS } from '../../utils/itemDefinitions';
import { hasMeaningfulData } from '../../utils/scoreCalculations';
import { adjustScore, isScoreAtMin, isScoreAtMax } from '../../utils/scoreHelpers';
import { getScoreTypeColor } from '../../utils/themeColors';
import { useDataLossWarning } from '../../contexts/DataLossWarningContext';
import { createOptimizedBasicAPIService } from '../../utils/optimizedApiService';
import { calculateOptimisticTotal, isOptimisticCloseEnough } from '../../utils/optimisticCalculations';
import ScoreBarChart from '../../components/ScoreBarChart';
import InstructionPanel from '../components/InstructionPanel';
import BasicLayout from '../components/BasicLayout';
import FunctionItemsList from '../../components/FunctionItemsList';
import DataLossWarningModal from '../../components/DataLossWarningModal';
import { instructionContent } from '../../data/instructionContent';

const StartScoreScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { startScores, startTotal: incomingStartTotal, mobilityType: incomingMobilityType } = location.state || {};
  const { updateDataStatus, clearDataStatus } = useDataLossWarning();
  
  const [mobilityType, setMobilityType] = useState(incomingMobilityType || 'Walk');
  const [scores, setScores] = useState(startScores || getInitialScores(mobilityType));
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [startTotal, setStartTotal] = useState(() => {
    // Initialize with optimistic calculation of initial scores
    const initialScores = startScores || getInitialScores(incomingMobilityType || 'Walk');
    return calculateOptimisticTotal(initialScores, incomingMobilityType || 'Walk');
  });
  
  // Initialize optimized API service (memoized to prevent infinite loops)
  const apiService = useMemo(() => createOptimizedBasicAPIService(150), []);

  const contributingKeys = getContributingKeys(mobilityType);

  // Use imported optimistic calculation function

  // Define calcTotal function before it's used in useEffect
  const calcTotal = useCallback(async () => {
    try {
      setIsCalculating(true);
      const result = await apiService.calculateScore(scores, mobilityType);
      return result.result.functionScore;
    } catch (error) {
      console.error('API calculation failed:', error);
      // Show user-friendly error instead of fallback
      throw new Error('Unable to calculate score. Please check your connection and try again.');
    } finally {
      setIsCalculating(false);
    }
  }, [scores, mobilityType, apiService]);

  // Update total when scores or mobility type changes (debounced for API calls)
  useEffect(() => {
    const updateTotal = async () => {
      try {
        // Use regular API call (not optimistic) for background sync
        const result = await apiService.calculateScore(scores, mobilityType);
        // Only update if the optimistic calculation was significantly different
        const optimisticTotal = calculateOptimisticTotal(scores, mobilityType);
        if (!isOptimisticCloseEnough(optimisticTotal, result.result.functionScore)) {
          setStartTotal(result.result.functionScore);
        }
      } catch (error) {
        console.error('Error updating total:', error);
        // Keep the optimistic total if API fails
      }
    };
    
    // Only run API call after a delay to avoid excessive calls
    const timeoutId = setTimeout(updateTotal, 500);
    return () => clearTimeout(timeoutId);
  }, [scores, mobilityType, apiService]);

  // Handle mobility type changes - update scores to include new contributing items
  const handleMobilityTypeChange = (newMobilityType) => {
    setMobilityType(newMobilityType);
    
    // Get the new contributing keys for the new mobility type
    const newContributingKeys = getContributingKeys(newMobilityType);
    
    // Create new scores object with existing scores preserved where possible
    const newScores = {
      selfCare: { ...scores.selfCare },
      mobility: { ...scores.mobility }
    };
    
    // Add any missing contributing items with default scores
    newContributingKeys.selfCare.forEach(key => {
      if (!newScores.selfCare.hasOwnProperty(key)) {
        newScores.selfCare[key] = SCORE_CONSTANTS.DEFAULT_SCORE;
      }
    });
    
    newContributingKeys.mobility.forEach(key => {
      if (!newScores.mobility.hasOwnProperty(key)) {
        newScores.mobility[key] = SCORE_CONSTANTS.DEFAULT_SCORE;
      }
    });
    
    setScores(newScores);
    
    // Immediately update UI with optimistic calculation
    const optimisticTotal = calculateOptimisticTotal(newScores, newMobilityType);
    setStartTotal(optimisticTotal);
  };

  const handleScoreAdjustment = (key, delta) => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    
    const newScores = adjustScore(scores, key, delta);
    setScores(newScores);
    
    // Immediately update UI with optimistic calculation
    const optimisticTotal = calculateOptimisticTotal(newScores, mobilityType);
    setStartTotal(optimisticTotal);
  };

  const handleResetAll = () => {
    const defaultScores = getInitialScores(mobilityType);
    setScores(defaultScores);
    // Immediately update UI with optimistic calculation
    const optimisticTotal = calculateOptimisticTotal(defaultScores, mobilityType);
    setStartTotal(optimisticTotal);
  };

  const handleSubmit = () => {
    navigate('/basic/expected-score', {
      state: {
        startScores: scores,
        startTotal: startTotal,
        mobilityType: mobilityType,
      }
    });
  };

  // Track data changes for data loss warnings
  useEffect(() => {
    // Check if total start score is different from default total
    // Since we removed client-side calculations, we'll use a simple heuristic
    // Default total is typically 10 (all scores at minimum value)
    const defaultTotal = 10;
    const hasDataToLose = startTotal !== defaultTotal;
    
    updateDataStatus('basicStart', hasDataToLose, 'Start scores have been modified');
  }, [startTotal, mobilityType, updateDataStatus]);


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
    if (step === 'start') {
      // Already on start step
      return;
    }
    
    if (step === 'expected') {
      navigate('/basic/expected-score', {
        state: {
          startScores: scores,
          startTotal: startTotal,
          mobilityType: mobilityType,
        }
      });
    }
  };


  const hasDataToPreserve = hasMeaningfulData(scores, startTotal, null);

  return (
    <>
      <BasicLayout 
        rightPanel={<InstructionPanel {...instructionContent.start} />}
        currentStep="start"
        onStepPress={handleStepPress}
        startTotal={startTotal}
        hasInteracted={hasInteracted}
        onSwitchToAdvanced={handleSwitchToAdvanced}
      >
        <div className="score-bar-chart-container">
          <ScoreBarChart
            startTotal={startTotal}
            variant="start"
          />
        </div>

        <FunctionItemsList
          mode="basic"
          variant="start"
          scores={scores}
          startScores={scores}
          onScoreAdjustment={handleScoreAdjustment}
          onResetAll={handleResetAll}
          mobilityType={mobilityType}
          onMobilityTypeChange={handleMobilityTypeChange}
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

export default StartScoreScreen;
