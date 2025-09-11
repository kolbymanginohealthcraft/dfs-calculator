import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getContributingKeys, getInitialScores } from '../../utils/itemDefinitions';
import { calculateTotalScore, hasMeaningfulData } from '../../utils/scoreCalculations';
import { adjustScore, isScoreAtMin, isScoreAtMax } from '../../utils/scoreHelpers';
import { getScoreTypeColor } from '../../utils/themeColors';
import ScoreBarChart from '../../components/ScoreBarChart';
import InstructionPanel from '../components/InstructionPanel';
import BasicLayout from '../components/BasicLayout';
import FunctionItemsList from '../../components/FunctionItemsList';
import { instructionContent } from '../../data/instructionContent';

const EndScoreScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { startScores, startTotal, expectedScore, mobilityType } = location.state || {};
  
  // Initialize end scores with start scores
  const [endScores, setEndScores] = useState(startScores || getInitialScores(mobilityType));
  const [hasInteracted, setHasInteracted] = useState(false);

  const contributingKeys = getContributingKeys(mobilityType);

  const handleScoreAdjustment = (key, delta) => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    
    const newScores = adjustScore(endScores, key, delta, startScores);
    setEndScores(newScores);
  };

  const calcEndTotal = () => {
    return calculateTotalScore(endScores, mobilityType);
  };

  const getLocalComparisonColor = () => {
    const endTotal = calcEndTotal();
    if (endTotal >= expectedScore) return '#28a745';
    if (endTotal >= expectedScore * 0.9) return '#fd7e14';
    return '#dc3545';
  };

  const getLocalComparisonIcon = () => {
    const endTotal = calcEndTotal();
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

  const handleHomeClick = () => {
    navigate('/basic');
  };

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


  const endTotal = calcEndTotal();
  const hasDataToPreserve = hasMeaningfulData(startScores, startTotal, expectedScore, endScores, endTotal);

  return (
    <BasicLayout 
      rightPanel={<InstructionPanel {...instructionContent.end} />}
      currentStep="end"
      onStepPress={handleStepPress}
      startTotal={startTotal}
      expectedScore={expectedScore}
      endTotal={endTotal}
      hasInteracted={hasInteracted}
    >
      <div className="score-bar-chart-container">
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
        mobilityType={mobilityType}
      />
    </BasicLayout>
  );
};

export default EndScoreScreen;
