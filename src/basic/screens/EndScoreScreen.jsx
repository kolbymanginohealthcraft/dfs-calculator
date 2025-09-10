import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { itemDefs, getContributingKeys, getInitialScores } from '../utils/itemDefinitions';
import { calculateTotalScore, calculateScoreDifference, hasMeaningfulData } from '../utils/scoreCalculations';
import { adjustScore, isScoreAtMin, isScoreAtMax } from '../utils/scoreHelpers';
import { getScoreTypeColor } from '../utils/themeColors';
import ScoreBarChart from '../../components/ScoreBarChart';
import ProgressIndicator from '../components/ProgressIndicator';
import StepInstruction from '../components/StepInstruction';
import Navbar from '../../components/Navbar';
import FunctionItemsList from '../../components/FunctionItemsList';
import '../styles/EndScoreScreen.css';

const EndScoreScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { startScores, startTotal, expectedScore, mobilityType } = location.state || {};
  
  // Initialize end scores with start scores
  const [endScores, setEndScores] = useState(startScores || getInitialScores());
  const [hasInteracted, setHasInteracted] = useState(false);

  const contributingKeys = getContributingKeys(mobilityType);

  const handleScoreAdjustment = (key, delta) => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    
    const newScores = adjustScore(endScores, key, delta);
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

  const handleSubmit = () => {
    const endTotal = calcEndTotal();
    const scoreDifference = calculateScoreDifference(startTotal, endTotal);
    
    navigate('/basic/results', {
      state: {
        startScores,
        endScores,
        startTotal,
        endTotal,
        expectedScore,
        mobilityType,
        scoreDifference,
      }
    });
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
    if (step === 'end') {
      // Already on end step, but Next button was clicked - go to results
      handleSubmit();
      return;
    }
    
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
  const scoreDifference = calculateScoreDifference(startTotal, endTotal);
  const hasDataToPreserve = hasMeaningfulData(startScores, startTotal, expectedScore, endScores, endTotal);

  return (
    <div className="end-score-screen">
      <Navbar />

      <div className="main-content">
        <div className="content-left">
          <ProgressIndicator
            currentStep="end"
            onStepPress={handleStepPress}
            startTotal={startTotal}
            expectedScore={expectedScore}
            endTotal={endTotal}
            hasInteracted={hasInteracted}
          />

          {/* <div className="step-instruction-container">
            <StepInstruction currentStep="end" />
          </div> */}

          <div className="score-bar-chart-container">
            <ScoreBarChart
              startTotal={startTotal}
              expectedScore={expectedScore}
              endTotal={endTotal}
              variant="end"
              title="Building the Result"
            />
          </div>

          <div className="scores-container">
            <FunctionItemsList
              mode="basic"
              variant="end"
              scores={endScores}
              startScores={startScores}
              onScoreAdjustment={handleScoreAdjustment}
              mobilityType={mobilityType}
            />
          </div>
        </div>

        <div className="content-right">
          <div className="instructions-panel">
            <h3 className="instructions-title">End Score Screen</h3>
            
            <div className="instruction-section">
              <h4 className="instruction-subtitle">What you're doing:</h4>
              <p className="instruction-text">
                Set the final scores for each self-care and mobility item. These scores represent the patient's functional abilities at the end of their episode.
              </p>
            </div>
            
            <div className="instruction-section">
              <h4 className="instruction-subtitle">How to use:</h4>
              <ul className="instruction-list">
                <li>Use the +/- buttons to adjust each score</li>
                <li>Compare start and end scores using the barbell charts</li>
                <li>When finished, view the final results</li>
                <li>To save and share the result, click View Clean Results</li>
              </ul>
            </div>
            
            <div className="instruction-section">
              <h4 className="instruction-subtitle">Score Values:</h4>
              <div className="score-values">
                <div className="score-value-item">
                  <span className="score-number">6</span>
                  <span className="score-description">Independent</span>
                </div>
                <div className="score-value-item">
                  <span className="score-number">5</span>
                  <span className="score-description">Supervision or Setup</span>
                </div>
                <div className="score-value-item">
                  <span className="score-number">4</span>
                  <span className="score-description">Minimal Assistance</span>
                </div>
                <div className="score-value-item">
                  <span className="score-number">3</span>
                  <span className="score-description">Moderate Assistance</span>
                </div>
                <div className="score-value-item">
                  <span className="score-number">2</span>
                  <span className="score-description">Substantial/Maximal Assistance</span>
                </div>
                <div className="score-value-item">
                  <span className="score-number">1</span>
                  <span className="score-description">Dependent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EndScoreScreen;
