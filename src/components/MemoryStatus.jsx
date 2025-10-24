import React from 'react';
import './MemoryStatus.css';

const MemoryStatus = ({ memoryUsage, showDetails = false }) => {
  if (!memoryUsage) {
    return null;
  }

  const getStatusColor = (usagePercent) => {
    if (usagePercent >= 85) return '#dc3545'; // Red
    if (usagePercent >= 70) return '#ffc107'; // Yellow
    return '#28a745'; // Green
  };

  const getStatusText = (usagePercent) => {
    if (usagePercent >= 85) return 'Critical';
    if (usagePercent >= 70) return 'High';
    return 'Normal';
  };

  const statusColor = getStatusColor(memoryUsage.usagePercent);
  const statusText = getStatusText(memoryUsage.usagePercent);

  return (
    <div className="memoryStatus">
      <div className="memoryIndicator">
        <div 
          className="memoryBar"
          style={{ 
            width: `${memoryUsage.usagePercent}%`,
            backgroundColor: statusColor
          }}
        />
      </div>
      
      <div className="memoryInfo">
        <span className="memoryLabel">Memory:</span>
        <span 
          className="memoryValue"
          style={{ color: statusColor }}
        >
          {memoryUsage.usagePercent}%
        </span>
        <span className="memoryStatusText">
          ({statusText})
        </span>
      </div>
      
      {showDetails && (
        <div className="memoryDetails">
          <div className="memoryDetailItem">
            <span className="memoryDetailLabel">Used:</span>
            <span className="memoryDetailValue">
              {memoryUsage.usedMB} MB
            </span>
          </div>
          <div className="memoryDetailItem">
            <span className="memoryDetailLabel">Total:</span>
            <span className="memoryDetailValue">
              {memoryUsage.totalMB} MB
            </span>
          </div>
          <div className="memoryDetailItem">
            <span className="memoryDetailLabel">Limit:</span>
            <span className="memoryDetailValue">
              {memoryUsage.limitMB} MB
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryStatus;
