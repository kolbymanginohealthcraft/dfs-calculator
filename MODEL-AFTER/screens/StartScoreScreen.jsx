import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { itemDefs, getContributingKeys, getInitialScores, SCORE_CONSTANTS } from '../utils/itemDefinitions';
import { calculateTotalScore, hasMeaningfulData } from '../utils/scoreCalculations';
import { adjustScore, isScoreAtMin, isScoreAtMax } from '../utils/scoreHelpers';
import { getScoreTypeColor } from '../utils/themeColors';
import ScoreBarChart from '../components/ScoreBarChart';
import BarbellChart from '../components/BarbellChart';
import ProgressIndicator from '../components/ProgressIndicator';
import StepInstruction from '../components/StepInstruction';
import Navbar from '../components/Navbar';
import ScoreButton from '../components/ScoreButton';
import '../styles/StartScoreScreen.css';

const StartScoreScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { startScores, startTotal: incomingStartTotal, mobilityType: incomingMobilityType } = location.state || {};
  
  const [mobilityType, setMobilityType] = useState(incomingMobilityType || 'Walk');
  const [scores, setScores] = useState(startScores || getInitialScores());
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
    navigate('/expected-score', {
      state: {
        startScores: scores,
        startTotal: total,
        mobilityType: mobilityType,
      }
    });
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  const handleStepPress = (step) => {
    if (step === 'start') {
      // Already on start step
      return;
    }
    
    if (step === 'expected') {
      const total = calcTotal();
      navigate('/expected-score', {
        state: {
          startScores: scores,
          startTotal: total,
          mobilityType: mobilityType,
        }
      });
    }
  };

  const renderRow = (item, category, isLast) => {
    const score = scores[category][item.key];
    
    return (
      <div key={item.key} className={`score-row ${isLast ? 'last-row' : ''}`}>
        <div className="item-label">
          <span className="label-text">{item.label}</span>
        </div>
        
        <div className="item-progress">
          <BarbellChart
            startScore={score}
            showEndNode={false}
            width={120}
            height={30}
          />
        </div>
        
        <div className="score-controls">
          <ScoreButton
            type="minus"
            onClick={() => handleScoreAdjustment(item.key, -1)}
            disabled={isScoreAtMin(scores, item.key)}
            color="#007cbb"
            outlineColor="#007cbb"
          />
          
          <ScoreButton
            type="plus"
            onClick={() => handleScoreAdjustment(item.key, 1)}
            disabled={isScoreAtMax(scores, item.key)}
            color="#007cbb"
            outlineColor="#007cbb"
          />
        </div>
      </div>
    );
  };

  const startTotal = calcTotal();
  const hasDataToPreserve = hasMeaningfulData(scores, startTotal, null);

  return (
    <div className="start-score-screen">
      <Navbar 
        title="Start Scores" 
        onHomeClick={handleHomeClick}
        hasUnsavedChanges={hasDataToPreserve}
        currentStep="start"
        onStepPress={handleStepPress}
        startTotal={startTotal}
        expectedScore={null}
        endTotal={null}
        hasInteracted={hasInteracted}
      />

      <div className="main-content">
        <div className="content-left">
          <ProgressIndicator
            currentStep="start"
            onStepPress={handleStepPress}
            startTotal={startTotal}
            hasInteracted={hasInteracted}
          />

          {/* <div className="step-instruction-container">
            <StepInstruction currentStep="start" />
          </div> */}

          <div className="score-bar-chart-container">
            <ScoreBarChart
              startTotal={startTotal}
              showStartBar={true}
              showExpectedLine={false}
              showGainBar={false}
              showRequiredBackground={false}
              showExpectedPlaceholder={false}
              title="Building the Foundation"
            />
          </div>

          <div className="scores-container">
            <div className="category-section">
              <div className="section-header">
                <h2 className="category-title">Self-Care Items</h2>
              </div>
              <div className="table-container">
                {itemDefs.selfCare
                  .filter(item => contributingKeys.selfCare.includes(item.key))
                  .map((item, index, filteredArray) => 
                    renderRow(item, 'selfCare', index === filteredArray.length - 1)
                  )}
              </div>
            </div>

            <div className="category-section">
              <div className="section-header">
                <h2 className="category-title">Mobility Items</h2>
                <div className="mobility-type-selector">
                  <button
                    className={`mobility-btn ${mobilityType === 'Walk' ? 'active' : ''}`}
                    onClick={() => setMobilityType('Walk')}
                  >
                    Walk
                  </button>
                  <button
                    className={`mobility-btn ${mobilityType === 'Wheel' ? 'active' : ''}`}
                    onClick={() => setMobilityType('Wheel')}
                  >
                    Wheelchair
                  </button>
                </div>
              </div>
              <div className="table-container">
                {itemDefs.mobility
                  .filter(item => contributingKeys.mobility.includes(item.key))
                  .map((item, index, filteredArray) => 
                    renderRow(item, 'mobility', index === filteredArray.length - 1)
                  )}
              </div>
            </div>
          </div>

          <div className="action-buttons">
            {/* Button removed - navigation happens automatically via progress indicator */}
          </div>
        </div>

        <div className="content-right">
          <div className="instructions-panel">
            <h3 className="instructions-title">Start Score Screen</h3>
            
            <div className="instruction-section">
              <h4 className="instruction-subtitle">What you're doing:</h4>
              <p className="instruction-text">
                Set the initial scores for each self-care and mobility item. These scores represent the patient's functional abilities at the start of their episode.
              </p>
            </div>
            
            <div className="instruction-section">
              <h4 className="instruction-subtitle">How to use:</h4>
              <ul className="instruction-list">
                <li>Use the +/- buttons to adjust each score</li>
                <li>Choose Walk or Wheelchair for mobility items</li>
                <li>When finished, proceed to set the expected score</li>
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

export default StartScoreScreen;
