import React, { useState } from "react";
import styles from "./ModelEndScore.module.css";
import {
  GG_ITEMS,
  scoreMap,
  calculateFunctionScore,
  getContributingItemIds,
} from "../utils/calculations";
import ScoreBarChart from "./ScoreBarChart";
import FunctionItemsList from "./FunctionItemsList";
import { getScoreTypeColor } from "../utils/themeColors";
import { Wrench, BarChart3, Target, HandHeart, User, Settings } from "lucide-react";
import ProgressIndicator from "../basic/components/ProgressIndicator";

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
}) => {
  const [filterContributing, setFilterContributing] = useState(false);
  const startTotal = calculateFunctionScore(startScores);
  const contributingIds = getContributingItemIds(modeledValues);

  const toggleFilter = () => {
    setFilterContributing((prev) => !prev);
  };

  return (
    <>
      <div className={styles.sticky}>

        {hasFile && (
          <div className="score-bar-chart-container">
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

      <ProgressIndicator
        currentStep="end"
        onStepPress={() => {}} // No navigation needed in advanced mode
        startTotal={startTotal}
        expectedScore={weightedScore}
        endTotal={modeledTotal}
        hasInteracted={true}
        mode="advanced"
      />

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
        />
      )}
    </>
  );
};

export default ModelEndScore;
