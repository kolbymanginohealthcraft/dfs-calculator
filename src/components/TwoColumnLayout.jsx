import React from 'react';
import styles from './TwoColumnLayout.module.css';

const TwoColumnLayout = ({
  topContent,
  leftContent,
  rightContent,
  className = '',
  leftPanelClassName = '',
  rightPanelClassName = '',
  topSectionClassName = '',
  bottomSectionClassName = ''
}) => {
  return (
    <div className={`${styles.twoColumnLayout} ${className}`}>
      <div className={styles.leftColumn}>
        {topContent && (
          <div className={`${styles.topSection} ${topSectionClassName}`}>
            {topContent}
          </div>
        )}
        
        <div className={`${styles.bottomSection} ${bottomSectionClassName}`}>
          <div className={`${styles.leftPanel} ${leftPanelClassName}`}>
            {leftContent}
          </div>
        </div>
      </div>
      
      <div className={styles.rightColumn}>
        {rightContent}
      </div>
    </div>
  );
};

export default TwoColumnLayout;
