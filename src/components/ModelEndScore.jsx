import React, { useState } from "react";
import styles from "./ModelEndScore.module.css";
// All calculations now handled server-side
import ScoreBarChart from "./ScoreBarChart";
import FunctionItemsList from "./FunctionItemsList";
import { getScoreTypeColor } from "../utils/themeColors";
import { GG_ITEMS } from "../utils/clientConstants";
import { getContributingGGItemsForDisplay } from "../utils/itemAdapters";
import { Wrench, BarChart3, Target, HandHeart, User, Settings } from "lucide-react";

const ModelEndScore = ({
  modeledValues,
  startScores,
  subtotal,
  modeledTotal,
  handleTick,
  setModeledValues,
  hasFile,
  parsedValues,
  weightedScore,
  mobilityType,
  imputedItems = new Set(),
  results = null,
}) => {
  const [filterContributing, setFilterContributing] = useState(false);
  // Scores now provided by server
  const startTotal = results?.startScore || results?.functionScore || 0;
  // Calculate contributingIds from mobility type if not provided by API
  // Use results.mobilityType first, then prop mobilityType, then default to 'Walk'
  const actualMobilityType = results?.mobilityType || mobilityType || 'Walk';
  const contributingIds = results?.contributingIds 
    ? new Set(Array.isArray(results.contributingIds) ? results.contributingIds : [])
    : getContributingGGItemsForDisplay(actualMobilityType);

  // Determine if end score meets expected score for accent border styling
  const meetsExpectedScore = modeledTotal >= weightedScore;

  const toggleFilter = () => {
    setFilterContributing((prev) => !prev);
  };

  return (
    <>
      <div className={styles.sticky}>

        {hasFile && (
          <div 
            className="score-bar-chart-container"
            style={{
              borderLeft: `4px solid ${meetsExpectedScore ? '#059669' : '#dc2626'}`,
              background: `linear-gradient(90deg, ${meetsExpectedScore ? '#10b981' : '#ef4444'} 0%, transparent 4px), white`
            }}
          >
            <ScoreBarChart
              startTotal={startTotal}
              endTotal={modeledTotal}
              expectedScore={weightedScore}
              variant="end"
              mode="advanced"
            />
          </div>
        )}
      </div>


      {hasFile && (
        <FunctionItemsList
          mode="advanced"
          variant="end"
          items={GG_ITEMS}
          scores={modeledValues}
          startScores={startScores}
          onScoreAdjustment={handleTick}
          contributingIds={contributingIds}
          mobilityType={mobilityType}
          imputedItems={imputedItems}
          meetsExpectedScore={meetsExpectedScore}
        />
      )}
    </>
  );
};

export default ModelEndScore;
