import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { itemDefs, getContributingKeys, getInitialScores, SCORE_CONSTANTS } from '../../utils/itemDefinitions';
import { calculateTotalScore, hasMeaningfulData } from '../../utils/scoreCalculations';
import { adjustScore, isScoreAtMin, isScoreAtMax } from '../../utils/scoreHelpers';
import { getScoreTypeColor } from '../../utils/themeColors';
import ScoreBarChart from '../../components/ScoreBarChart';
import ProgressIndicator from '../components/ProgressIndicator';
import InstructionPanel from '../components/InstructionPanel';
import BasicLayout from '../components/BasicLayout';
import FunctionItemsList from '../../components/FunctionItemsList';
import { instructionContent } from '../../data/instructionContent';

const StartScoreScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { startScores, startTotal: incomingStartTotal, mobilityType: incomingMobilityType } = location.state || {};
  
  const [mobilityType, setMobilityType] = useState(incomingMobilityType || 'Walk');
  const [scores, setScores] = useState(startScores || getInitialScores(mobilityType));
  const [hasInteracted, setHasInteracted] = useState(false);

  const contributingKeys = getContributingKeys(mobilityType);

  const handleScoreAdjustment = (key, delta) => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    
    const newScores = adjustScore(scores, key, delta);
    setScores(newScores);
  };

  const calcTotal = () => {
    return calculateTotalScore(scores, mobilityType);
  };

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

  const handleHomeClick = () => {
    navigate('/basic');
  };

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
    <BasicLayout rightPanel={<InstructionPanel {...instructionContent.start} />}>
      <div className="score-bar-chart-container">
        <ScoreBarChart
          startTotal={startTotal}
          variant="start"
        />
      </div>

      <ProgressIndicator
        currentStep="start"
        onStepPress={handleStepPress}
        startTotal={startTotal}
        hasInteracted={hasInteracted}
      />

      <FunctionItemsList
        mode="basic"
        variant="start"
        scores={scores}
        startScores={scores}
        onScoreAdjustment={handleScoreAdjustment}
        mobilityType={mobilityType}
        onMobilityTypeChange={setMobilityType}
      />

      <div className="action-buttons">
        {/* Button removed - navigation happens automatically via progress indicator */}
      </div>
    </BasicLayout>
  );
};

export default StartScoreScreen;
