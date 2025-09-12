import React, { useState, useEffect } from 'react';
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
    <BasicLayout 
      rightPanel={<InstructionPanel {...instructionContent.end} />}
      currentStep="end"
      onStepPress={handleStepPress}
      startTotal={startTotal}
      expectedScore={expectedScore}
      endTotal={endTotal}
      hasInteracted={hasInteracted}
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
        mobilityType={mobilityType}
        meetsExpectedScore={meetsExpectedScore}
      />
    </BasicLayout>
  );
};

export default EndScoreScreen;
