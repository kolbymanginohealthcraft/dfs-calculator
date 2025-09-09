import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { itemDefs, getContributingKeys } from '../utils/itemDefinitions';
import { hasMeaningfulData } from '../utils/scoreCalculations';
import { getScoreTypeColor } from '../utils/themeColors';
import ScoreBarChart from '../components/ScoreBarChart';
import BarbellChart from '../components/BarbellChart';
import Navbar from '../../components/Navbar';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/ResultsViewScreen.css';

const ResultsViewScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNewCalcModal, setShowNewCalcModal] = useState(false);
  const { 
    startScores, 
    endScores, 
    startTotal, 
    endTotal, 
    expectedScore, 
    mobilityType, 
    scoreDifference 
  } = location.state || {};

  const contributingKeys = getContributingKeys(mobilityType);

  const handleNewCalculation = () => {
    setShowNewCalcModal(true);
  };

  const handleHomeClick = () => {
    navigate('/basic');
  };

  const handleBackClick = () => {
    navigate('/basic/end-score', {
      state: {
        startScores,
        startTotal,
        expectedScore,
        mobilityType,
      }
    });
  };

  const handleConfirmNewCalc = () => {
    setShowNewCalcModal(false);
    navigate('/basic');
  };

  const handleCancelNewCalc = () => {
    setShowNewCalcModal(false);
  };

  const getResultStatus = () => {
    if (endTotal >= expectedScore) {
      return { status: 'success', text: 'Target Achieved', icon: '✓' };
    } else if (endTotal >= expectedScore * 0.9) {
      return { status: 'warning', text: 'Close to Target', icon: '⚠' };
    } else {
      return { status: 'danger', text: 'Below Target', icon: '✗' };
    }
  };

  const resultStatus = getResultStatus();

  const renderRow = (item, category) => {
    const startValue = startScores[category][item.key];
    const endValue = endScores[category][item.key];
    const change = endValue - startValue;
    
    return (
      <div key={item.key} className="table-row">
        <span className="item-name">{item.label}</span>
        <span className="start-value">{startValue}</span>
        <span className="end-value">{endValue}</span>
        <span className={`change-value ${change >= 0 ? 'positive' : 'negative'}`}>
          {change !== 0 ? (change >= 0 ? '+' : '') + change : ''}
        </span>
        <div className="barbell-chart-container">
          <BarbellChart
            startScore={startValue}
            endScore={endValue}
            showEndNode={true}
            width={120}
            height={24}
          />
        </div>
      </div>
    );
  };

  const hasDataToPreserve = hasMeaningfulData(startScores, startTotal, expectedScore, endScores, endTotal);

  return (
    <div className="results-view-screen">
      <Navbar />
      
      <ConfirmModal
        isOpen={showNewCalcModal}
        onConfirm={handleConfirmNewCalc}
        onCancel={handleCancelNewCalc}
        title="Start New Calculation"
        message="Are you sure you want to start a new calculation? All current data will be lost."
      />

      <div className="score-bar-chart-container">
        <ScoreBarChart
          startTotal={startTotal}
          expectedScore={expectedScore}
          endTotal={endTotal}
          showStartBar={true}
          showExpectedLine={true}
          showGainBar={true}
          showRequiredBackground={false}
          showExpectedPlaceholder={false}
          title="Final Results"
          showComparisonIndicator={true}
        />
      </div>

      <div className="detailed-results">
        <div className="results-section">
          <h2>Self-Care Items</h2>
          <div className="comparison-table">
            <div className="table-header">
              <span>Item</span>
              <span>Start</span>
              <span>End</span>
              <span>Gain</span>
              <span>Progress</span>
            </div>
            {itemDefs.selfCare
              .filter(item => contributingKeys.selfCare.includes(item.key))
              .map(item => renderRow(item, 'selfCare'))}
          </div>
        </div>

        <div className="results-section">
          <h2>Mobility Items</h2>
          <div className="comparison-table">
            <div className="table-header">
              <span>Item</span>
              <span>Start</span>
              <span>End</span>
              <span>Gain</span>
              <span>Progress</span>
            </div>
            {itemDefs.mobility
              .filter(item => contributingKeys.mobility.includes(item.key))
              .map(item => renderRow(item, 'mobility'))}
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="new-calculation-btn" onClick={handleNewCalculation}>
          Start New Calculation
        </button>
      </div>
    </div>
  );
};

export default ResultsViewScreen;
