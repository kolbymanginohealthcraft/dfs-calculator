import React from 'react';
import BarbellChart from './BarbellChart';
import ScoreButton from './ScoreButton';
import { getScoreTypeColor } from '../utils/themeColors';
import { GG_ITEMS, scoreMap, resolveScore } from '../utils/calculations';
import { getContributingKeys, getInitialScores } from '../utils/itemDefinitions';
import { getBasicContributingItems } from '../utils/itemAdapters';
import styles from './FunctionItemsList.module.css';

const FunctionItemsList = React.memo(({
  mode = 'basic', // 'basic' or 'advanced'
  variant = 'start', // 'start', 'end', or 'advanced'
  items = [], // For advanced mode, pass GG_ITEMS
  scores = {}, // Current scores
  startScores = {}, // For end/advanced modes
  onScoreAdjustment, // Callback for score changes
  onResetAll, // Optional callback to reset all scores at once (for basic mode)
  mobilityType = 'Walk', // For basic mode
  onMobilityTypeChange, // Callback for mobility type changes in basic mode
  contributingIds = new Set(), // For advanced mode
  imputedItems = new Set(), // Items that have imputed start scores
  className = '',
  meetsExpectedScore = null, // null, true, or false for accent border styling
}) => {
  // Get items based on mode
  const getItems = () => {
    if (mode === 'advanced') {
      // Group GG_ITEMS by domain and filter for contributing items only
      const groupedItems = {};
      items.forEach(item => {
        const cleanId = item.id.replace(/[0-9]$/, "");
        const isContributing = contributingIds.has(cleanId);
        
        // Only include contributing items
        if (isContributing) {
          if (!groupedItems[item.domain]) {
            groupedItems[item.domain] = [];
          }
          groupedItems[item.domain].push(item);
        }
      });
      
      return Object.entries(groupedItems).map(([domain, domainItems]) => ({
        domain,
        items: domainItems
      }));
    }
    
    // Basic mode - use unified GG_ITEMS descriptions
    const contributingItems = getBasicContributingItems(mobilityType);
    return [
      {
        domain: 'selfCare',
        items: contributingItems.selfCare
      },
      {
        domain: 'mobility', 
        items: contributingItems.mobility
      }
    ];
  };

  // Get score for an item (handles both MDS codes and continuous imputed values)
  const getScore = (item, category = null) => {
    if (mode === 'advanced') {
      return resolveScore(scores[item.id]);
    }
    
    // Basic mode
    const key = item.key || item.id;
    return scores[category] ? scores[category][key] : 0;
  };

  // Get start score for an item (for end/advanced modes)
  const getStartScore = (item, category = null) => {
    if (mode === 'advanced') {
      return resolveScore(startScores[item.id]);
    }
    
    // Basic mode
    const key = item.key || item.id;
    return startScores[category] ? startScores[category][key] : 0;
  };


  // Convert advanced label format to basic format
  const formatLabel = (item) => {
    if (mode === 'advanced') {
      // Extract the letter from the ID (e.g., "GG0130A" -> "A")
      const letter = item.id.slice(-1);
      return `${letter}. ${item.label}`;
    }
    return item.label;
  };

  // Get button colors based on variant
  const getButtonColors = () => {
    switch (variant) {
      case 'start':
        return { color: '#007cbb', outlineColor: '#007cbb' };
      case 'end':
        return { color: '#28a745', outlineColor: '#28a745' };
      case 'advanced':
        return { 
          color: getScoreTypeColor('end', 'primary'), 
          outlineColor: getScoreTypeColor('end', 'primary') 
        };
      default:
        return { color: '#007cbb', outlineColor: '#007cbb' };
    }
  };

  // Check if score is at min/max
  const isScoreAtMin = (item, category = null) => {
    const score = getScore(item, category);
    const startScore = getStartScore(item, category);
    
    // For end/advanced modes, check against start score, otherwise check against absolute minimum
    if (variant !== 'start' && startScore !== undefined) {
      return score <= startScore;
    }
    
    return score <= 1;
  };

  const isScoreAtMax = (item, category = null) => {
    const score = getScore(item, category);
    return score >= 6;
  };

  // Handle score adjustment
  const handleScoreAdjustment = (item, delta, category = null) => {
    if (onScoreAdjustment) {
      if (mode === 'advanced') {
        onScoreAdjustment(item.id, delta);
      } else {
        onScoreAdjustment(item.key, delta);
      }
    }
  };

  // Handle reset all - determine reset state based on variant
  const handleResetAll = () => {
    // Determine what the reset state should be based on variant
    let resetState;
    if (variant === 'start') {
      // Start mode: reset all to default scores (1)
      resetState = getInitialScores(mobilityType);
    } else {
      // End/Advanced modes: reset to start scores (green nodes back to blue nodes)
      if (mode === 'advanced') {
        // Advanced mode: startScores is a flat object with GG item IDs as keys
        resetState = { ...startScores };
      } else {
        // Basic mode: startScores is nested with selfCare and mobility
        resetState = {
          selfCare: { ...(startScores.selfCare || {}) },
          mobility: { ...(startScores.mobility || {}) }
        };
      }
    }

    // For basic mode, if onResetAll is provided, use it to set all scores at once
    if (mode === 'basic' && onResetAll) {
      onResetAll(resetState);
      return;
    }

    // Fallback to individual adjustments (for advanced mode or if onResetAll not provided)
    if (!onScoreAdjustment) return;

    // Apply the reset by calling onScoreAdjustment for each item
    if (mode === 'advanced') {
      // For advanced mode, iterate over displayed items and reset each to its start score
      const itemsData = getItems();
      itemsData.forEach(({ items: domainItems }) => {
        domainItems.forEach(item => {
          const itemId = item.id;
          const currentScore = resolveScore(scores[itemId]);
          const targetScore = resolveScore(resetState[itemId]);
            
          if (currentScore !== targetScore) {
            const delta = targetScore - currentScore;
            if (delta !== 0) {
              onScoreAdjustment(itemId, delta);
            }
          }
        });
      });
    } else {
      // For basic mode without onResetAll, reset each category
      // This should rarely be used, but kept for backwards compatibility
      Object.keys(resetState).forEach(category => {
        Object.keys(resetState[category]).forEach(key => {
          const currentScore = scores[category]?.[key] || 0;
          const targetScore = resetState[category][key];
          if (currentScore !== targetScore) {
            const delta = targetScore - currentScore;
            if (delta !== 0) {
              onScoreAdjustment(key, delta);
            }
          }
        });
      });
    }
  };

  const formatScore = (val) => Number.isInteger(val) ? val : val.toFixed(4);

  // Render a single item row
  const renderItemRow = (item, category = null, isLast = false) => {
    const score = getScore(item, category);
    const startScore = getStartScore(item, category);
    const delta = score - startScore;
    const roundedDelta = Math.round(delta * 10000) / 10000;
    const buttonColors = getButtonColors();
    
    // Items are already filtered at the getItems level

    const rowClasses = [
      styles.scoreRow,
      mode === 'basic' && isLast ? styles.lastRow : '',
      roundedDelta > 0 ? styles.gain : '',
      roundedDelta < 0 ? styles.loss : '',
    ].filter(Boolean).join(' ');

    return (
      <div key={item.key || item.id} className={rowClasses}>

        <div className={styles.itemLabel}>
          <span className={styles.labelText} title={item.id || item.key}>
            {formatLabel(item)}{' '}
            {imputedItems.has(item.id) && (
              <span className={styles.imputedLabel}>
                Imputed
              </span>
            )}
            {roundedDelta !== 0 && (
              <span className={`${styles.delta} ${roundedDelta > 0 ? styles.positive : styles.negative}`}>
                ({roundedDelta > 0 ? '+' : ''}{formatScore(roundedDelta)})
              </span>
            )}
          </span>
        </div>
        
        <div className={styles.itemProgress}>
          <BarbellChart
            startScore={variant === 'start' ? score : startScore}
            endScore={variant === 'start' ? null : score}
            showEndNode={variant !== 'start'}
            width={160}
            height={30}
          />
        </div>
        
        <div className={styles.scoreControls}>
          <ScoreButton
            type="minus"
            onClick={() => handleScoreAdjustment(item, -1, category)}
            disabled={isScoreAtMin(item, category)}
            color={buttonColors.color}
            outlineColor={buttonColors.outlineColor}
          />
          
          <ScoreButton
            type="plus"
            onClick={() => handleScoreAdjustment(item, 1, category)}
            disabled={isScoreAtMax(item, category)}
            color={buttonColors.color}
            outlineColor={buttonColors.outlineColor}
          />
        </div>
      </div>
    );
  };

  // Render domain section
  const renderDomainSection = (domain, domainItems, isFirst = false) => {
    const domainName = domain === 'selfCare' ? 'Self-Care' : 'Mobility';
    
    // Show mobility type in header when not on step 1 (variant !== 'start')
    const getDomainTitle = () => {
      if (domain === 'mobility' && variant !== 'start') {
        const mobilityTypeText = mobilityType === 'Walk' ? 'Walk' : 'Wheelchair';
        return `${domainName} Items (${mobilityTypeText})`;
      }
      if (domain === 'mobility' && variant === 'start') {
        return `${domainName} Items (choose type)`;
      }
      return `${domainName} Items`;
    };

    // Get footnote for wheelchair mobility type
    const getMobilityFootnote = () => {
      if (domain === 'mobility' && mobilityType === 'Wheel' && variant !== 'start') {
        return (
          <span className={styles.footnote}>Item R counts double</span>
        );
      }
      return null;
    };
    
    return (
      <div className={styles.categorySection} key={domain}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.categoryTitle}>{getDomainTitle()}</h2>
          <div className={styles.headerControls}>
            {getMobilityFootnote()}
            {domain === 'selfCare' && onScoreAdjustment && (
              <button
                className={styles.resetAllBtn}
                onClick={handleResetAll}
                title="Reset all items to their original values"
              >
                Reset All
              </button>
            )}
            {mode === 'basic' && domain === 'mobility' && onMobilityTypeChange && variant === 'start' && (
              <div className={styles.mobilityTypeSelector}>
                <button
                  className={`${styles.mobilityBtn} ${mobilityType === 'Walk' ? styles.active : ''}`}
                  onClick={() => onMobilityTypeChange('Walk')}
                >
                  Walk
                </button>
                <button
                  className={`${styles.mobilityBtn} ${mobilityType === 'Wheel' ? styles.active : ''}`}
                  onClick={() => onMobilityTypeChange('Wheel')}
                >
                  Wheelchair
                </button>
              </div>
            )}
          </div>
        </div>
        <div className={styles.tableContainer}>
          {domainItems.map((item, index, filteredArray) => 
            renderItemRow(item, domain, index === filteredArray.length - 1)
          )}
        </div>
      </div>
    );
  };

  const itemsData = getItems();

  // Determine accent border styling
  const getAccentBorderStyle = () => {
    if (meetsExpectedScore === null) return {};
    
    return {
      borderLeft: `4px solid ${meetsExpectedScore ? '#059669' : '#dc2626'}`,
      background: `linear-gradient(90deg, ${meetsExpectedScore ? '#10b981' : '#ef4444'} 0%, transparent 4px), white`
    };
  };

  return (
    <div 
      className={`${styles.scoresContainer} ${className}`}
      style={getAccentBorderStyle()}
    >
      {itemsData.map(({ domain, items: domainItems }, index) => 
        renderDomainSection(domain, domainItems, index === 0)
      )}
    </div>
  );
});

export default FunctionItemsList;
