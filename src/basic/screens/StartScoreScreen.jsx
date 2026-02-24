import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getContributingKeys, getInitialScores, SCORE_CONSTANTS } from '../../utils/itemDefinitions';
import { calculateTotalScore, hasMeaningfulData } from '../../utils/scoreCalculations';
import { adjustScore, isScoreAtMin, isScoreAtMax } from '../../utils/scoreHelpers';
import { getScoreTypeColor } from '../../utils/themeColors';
import { useDataLossWarning } from '../../contexts/DataLossWarningContext';
import ScoreBarChart from '../../components/ScoreBarChart';
import InstructionPanel from '../components/InstructionPanel';
import BasicLayout from '../components/BasicLayout';
import FunctionItemsList from '../../components/FunctionItemsList';
import DataLossWarningModal from '../../components/DataLossWarningModal';
import { instructionContent } from '../../data/instructionContent';
import layoutStyles from '../styles/BasicLayout.module.css';

const StartScoreScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { startScores, startTotal: incomingStartTotal, mobilityType: incomingMobilityType } = location.state || {};
  const { updateDataStatus, clearDataStatus } = useDataLossWarning();
  
  const [mobilityType, setMobilityType] = useState(incomingMobilityType || 'Walk');
  const [scores, setScores] = useState(startScores || getInitialScores(mobilityType));
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);

  const contributingKeys = getContributingKeys(mobilityType);

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
  };

  const handleScoreAdjustment = (key, delta) => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    
    const newScores = adjustScore(scores, key, delta);
    setScores(newScores);
  };

  const calcTotal = useCallback(() => {
    return calculateTotalScore(scores, mobilityType);
  }, [scores, mobilityType]);

  const handleSubmit = () => {
    const total = calcTotal();
    navigate('/basic/expected-score', {
      state: {
        startScores: scores,
        startTotal: total,
        mobilityType: mobilityType,
      }
    });
  };

  // Track data changes for data loss warnings
  useEffect(() => {
    // Check if total start score is different from default total
    const currentTotal = calcTotal();
    const defaultScores = getInitialScores(mobilityType);
    const defaultTotal = calculateTotalScore(defaultScores, mobilityType);
    const hasDataToLose = currentTotal !== defaultTotal;
    
    updateDataStatus('basicStart', hasDataToLose, 'Start scores have been modified');
  }, [scores, mobilityType, updateDataStatus, calcTotal]);


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
      const total = calcTotal();
      navigate('/basic/expected-score', {
        state: {
          startScores: scores,
          startTotal: total,
          mobilityType: mobilityType,
        }
      });
    }
  };


  const startTotal = calcTotal();
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
        <div className={layoutStyles.scoreBarChartContainer}>
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
          onResetAll={(resetState) => {
            setScores(resetState);
            if (!hasInteracted) {
              setHasInteracted(true);
            }
          }}
          mobilityType={mobilityType}
          onMobilityTypeChange={handleMobilityTypeChange}
        />

        <div className={layoutStyles.actionButtons}>
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
