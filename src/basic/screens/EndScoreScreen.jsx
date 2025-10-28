import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getContributingKeys, getInitialScores } from '../../utils/itemDefinitions';
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

const EndScoreScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { startScores, startTotal, expectedScore, mobilityType } = location.state || {};
  const { updateDataStatus, clearDataStatus } = useDataLossWarning();
  
  // Initialize end scores with start scores
  const [endScores, setEndScores] = useState(startScores || getInitialScores(mobilityType));
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [endTotal, setEndTotal] = useState(() => {
    // Initialize with optimistic calculation of end scores
    return calculateOptimisticTotal(endScores, mobilityType);
  });
  
  // Initialize API service (memoized to prevent infinite loops)
  const apiService = useMemo(() => createOptimizedBasicAPIService(150), []);

  const contributingKeys = getContributingKeys(mobilityType);

  // Use imported optimistic calculation function

  // Update end total when scores change (debounced for API calls)
  useEffect(() => {
    const updateEndTotal = async () => {
      try {
        setIsCalculating(true);
        console.log('EndScoreScreen: Using optimized API for calculation');
        const result = await apiService.calculateScore(endScores, mobilityType);
        console.log('EndScoreScreen: API result:', result.result.functionScore);
        
        // Only update if the optimistic calculation was significantly different
        const optimisticTotal = calculateOptimisticTotal(endScores, mobilityType);
        if (!isOptimisticCloseEnough(optimisticTotal, result.result.functionScore)) {
          setEndTotal(result.result.functionScore);
        }
      } catch (error) {
        console.error('API calculation failed:', error);
        // Keep the optimistic total if API fails
      } finally {
        setIsCalculating(false);
      }
    };
    
    // Only run API call after a delay to avoid excessive calls
    const timeoutId = setTimeout(updateEndTotal, 500);
    return () => clearTimeout(timeoutId);
  }, [endScores, mobilityType, apiService]);

  const handleScoreAdjustment = (key, delta) => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    
    const newScores = adjustScore(endScores, key, delta, startScores);
    setEndScores(newScores);
    
    // Immediately update UI with optimistic calculation
    const optimisticTotal = calculateOptimisticTotal(newScores, mobilityType);
    setEndTotal(optimisticTotal);
  };

  const handleResetAll = () => {
    setEndScores(startScores);
    // Immediately update UI with optimistic calculation
    const optimisticTotal = calculateOptimisticTotal(startScores, mobilityType);
    setEndTotal(optimisticTotal);
  };

  const calcEndTotal = () => {
    return endTotal; // Use state value instead of calculating
  };

  const getLocalComparisonColor = () => {
    if (endTotal >= expectedScore) return '#28a745';
    if (endTotal >= expectedScore * 0.9) return '#fd7e14';
    return '#dc3545';
  };

  const getLocalComparisonIcon = () => {
    if (endTotal >= expectedScore) return '✓';
    if (endTotal >= expectedScore * 0.9) return '⚠';
    return '✗';
  };


  const handleBackClick = () => {
    navigate('/basic/expected-score', {
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
    // Check if end scores are different from start scores
    const hasModifiedEndScores = JSON.stringify(endScores) !== JSON.stringify(startScores);
    
    
    updateDataStatus('basicEnd', hasModifiedEndScores, 'End scores have been modified');
  }, [endScores, startScores, updateDataStatus]);


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
      navigate('/basic/start-score');
    } else if (step === 'expected') {
      navigate('/basic/expected-score', {
        state: {
          startScores,
          startTotal,
          expectedScore,
          mobilityType,
        }
      });
    }
  };


  const hasDataToPreserve = hasMeaningfulData(startScores, startTotal, expectedScore, endScores, endTotal);
  
  // Determine if end score meets expected score for accent border styling
  const meetsExpectedScore = endTotal >= expectedScore;

  // Prepare export data for the basic app
  const exportData = {
    patient: {
      name: "Basic App User", // Basic app doesn't have patient data
      dob: null,
      age: null,
      ard: null,
      facility: "Basic Calculator",
      address: null
    },
    scores: {
      start: startTotal,
      expected: expectedScore,
      modeled: endTotal,
      // Pass the detailed scores for function items
      selfCare: endScores.selfCare || {},
      mobility: endScores.mobility || {},
      startScores: {
        selfCare: startScores.selfCare || {},
        mobility: startScores.mobility || {}
      }
    },
    mobilityType: mobilityType
  };

  return (
    <>
      <BasicLayout 
        rightPanel={<InstructionPanel {...instructionContent.end} />}
        currentStep="end"
        onStepPress={handleStepPress}
        startTotal={startTotal}
        expectedScore={expectedScore}
        endTotal={endTotal}
        hasInteracted={hasInteracted}
        onSwitchToAdvanced={handleSwitchToAdvanced}
        exportData={exportData}
      >
      <div 
        className="score-bar-chart-container"
        style={{
          borderLeft: `4px solid ${meetsExpectedScore ? '#059669' : '#dc2626'}`,
          background: `linear-gradient(90deg, ${meetsExpectedScore ? '#10b981' : '#ef4444'} 0%, transparent 4px), white`
        }}
      >
        <ScoreBarChart
          startTotal={startTotal}
          expectedScore={expectedScore}
          endTotal={endTotal}
          variant="end"
        />
      </div>

      <FunctionItemsList
        mode="basic"
        variant="end"
        scores={endScores}
        startScores={startScores}
        onScoreAdjustment={handleScoreAdjustment}
        onResetAll={handleResetAll}
        mobilityType={mobilityType}
        meetsExpectedScore={meetsExpectedScore}
      />
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

export default EndScoreScreen;
