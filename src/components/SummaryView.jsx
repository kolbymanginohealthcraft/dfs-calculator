import React, { useState, useMemo } from 'react';
import { Download, FileText, AlertCircle, CheckCircle, Eye, EyeOff, Info } from 'lucide-react';
import { redactName } from '../utils/redactionUtils';
import styles from './SummaryView.module.css';

const SummaryView = ({ uploadedFiles, onSelectFile, onExportAll, onExportDetails, calculateFunctionScore, onDeleteFile, isRedacted, onToggleRedaction }) => {
  const [sortField, setSortField] = useState('status');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');

  const processedFiles = useMemo(() => {
    return uploadedFiles
      .filter(file => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'success') return file.status === 'processed';
        if (filterStatus === 'error') return file.status === 'error';
        return true;
      })
      .sort((a, b) => {
        let aValue, bValue;
        
        switch (sortField) {
          case 'fileName':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'patientName':
            aValue = `${a.results?.patientFirstName || ''} ${a.results?.patientLastName || ''}`.toLowerCase();
            bValue = `${b.results?.patientFirstName || ''} ${b.results?.patientLastName || ''}`.toLowerCase();
            break;
          case 'startScore':
            aValue = a.results?.startScore || 0;
            bValue = b.results?.startScore || 0;
            break;
          case 'expectedScore':
            aValue = a.results?.expectedScore || 0;
            bValue = b.results?.expectedScore || 0;
            break;
          case 'userModeledScore':
            aValue = calculateUserModeledScore(a) || 0;
            bValue = calculateUserModeledScore(b) || 0;
            break;
          case 'scoreDifference':
            aValue = a.results?.scoreDifference || 0;
            bValue = b.results?.scoreDifference || 0;
            break;
          case 'gainVsRequired':
            aValue = calculateGainVsRequired(a);
            bValue = calculateGainVsRequired(b);
            break;
          case 'status':
            // Custom status ordering: processed (READY) first, then others
            const statusOrder = { 'processed': 0, 'error': 1, 'processing': 2, 'pending': 3 };
            aValue = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 999;
            bValue = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 999;
            break;
          default:
            return 0;
        }

        if (sortDirection === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
  }, [uploadedFiles, sortField, sortDirection, filterStatus]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (file) => {
    if (file.status === 'processed') return <CheckCircle size={14} className={styles.successIcon} />;
    if (file.status === 'error') return <AlertCircle size={14} className={styles.errorIcon} />;
    return <FileText size={14} className={styles.pendingIcon} />;
  };

  const getStatusText = (file) => {
    if (file.status === 'processed') return 'Ready';
    if (file.status === 'error') return 'Error';
    if (file.status === 'processing') return 'Processing';
    return 'Pending';
  };

  // Calculate user's modeled end score from their modeled values
  // Only return a score if userModeledValues exists AND there's actual gain (end > start)
  const calculateUserModeledScore = (file) => {
    if (!file.userModeledValues || !calculateFunctionScore) return null;
    
    try {
      const userEndScore = calculateFunctionScore(file.userModeledValues);
      const startScore = file.results?.startScore || 0;
      
      // Only return the score if there's actual gain (end > start)
      return userEndScore > startScore ? userEndScore : null;
    } catch (error) {
      console.warn('Error calculating user modeled score:', error);
      return null;
    }
  };

  // Calculate gain vs required (actual gain - required gain)
  const calculateGainVsRequired = (file) => {
    const startScore = file.results?.startScore || 0;
    const userEndScore = calculateUserModeledScore(file);
    const expectedScore = file.results?.expectedScore || 0;
    const requiredGain = file.results?.scoreDifference || 0;
    
    if (userEndScore === null) return null;
    
    const actualGain = userEndScore - startScore;
    return actualGain - requiredGain;
  };

  const successfulCount = uploadedFiles.filter(f => f.status === 'processed').length;
  const errorCount = uploadedFiles.filter(f => f.status === 'error').length;
  const processingCount = uploadedFiles.filter(f => f.status === 'processing').length;

  return (
    <div className={styles.summaryView}>
      {/* Enhanced Header with Analytics */}
      <div className={styles.summaryHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.summaryTitle}>
            <FileText size={20} />
            <span>File Analysis Summary</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.filterGroup}>
            <label>Filter:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Files ({uploadedFiles.length})</option>
              <option value="success">Successful ({successfulCount})</option>
              <option value="error">Errors ({errorCount})</option>
            </select>
          </div>
          {onToggleRedaction && (
            <button
              className={styles.redactionButton}
              onClick={onToggleRedaction}
              title={isRedacted ? "Show patient names" : "Hide patient names"}
            >
              {isRedacted ? <Eye size={16} /> : <EyeOff size={16} />}
              {isRedacted ? "Show Info" : "Hide Info"}
            </button>
          )}
          <button
            className={styles.exportButton}
            onClick={onExportAll}
            disabled={successfulCount === 0}
            title="Export summary results to CSV"
          >
            <Download size={16} />
            Export Summary
          </button>
          <button
            className={styles.exportButton}
            onClick={onExportDetails}
            disabled={successfulCount === 0}
            title="Export detailed GG components to CSV"
          >
            <Download size={16} />
            Export Details
          </button>
        </div>
      </div>

      {/* Enhanced Table with Better Layout */}
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.summaryTable}>
            <thead>
              <tr>
                <th className={styles.actionHeader}>
                  
                </th>
                <th 
                  className={styles.sortableHeader}
                  onClick={() => handleSort('fileName')}
                >
                  File Name {getSortIcon('fileName')}
                </th>
                <th 
                  className={styles.sortableHeader}
                  onClick={() => handleSort('patientName')}
                >
                  Patient {getSortIcon('patientName')}
                </th>
                <th 
                  className={styles.sortableHeader}
                  onClick={() => handleSort('startScore')}
                >
                  Start Score {getSortIcon('startScore')}
                </th>
                <th 
                  className={styles.sortableHeader}
                  onClick={() => handleSort('expectedScore')}
                >
                  Expected Score {getSortIcon('expectedScore')}
                </th>
                <th 
                  className={styles.sortableHeader}
                  onClick={() => handleSort('userModeledScore')}
                  title="This is not the patient's actual end score. This is a modeled score based on the values you have set."
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Modeled End Score</span>
                    <Info size={14} style={{ opacity: 0.6 }} />
                  </div>
                  {getSortIcon('userModeledScore')}
                </th>
                <th 
                  className={styles.sortableHeader}
                  onClick={() => handleSort('gainVsRequired')}
                >
                  Gain {getSortIcon('gainVsRequired')}
                </th>
                <th 
                  className={styles.sortableHeader}
                  onClick={() => handleSort('status')}
                >
                  Status {getSortIcon('status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {processedFiles.map((file, index) => {
                // Find the correct index in the original uploadedFiles array
                const originalIndex = uploadedFiles.findIndex(f => f.id === file.id);
                console.log('SummaryView - File mapping:', {
                  displayIndex: index,
                  originalIndex,
                  fileId: file.id,
                  fileName: file.name,
                  status: file.status
                });
                // Determine if this row should have success or error styling
                const userEndScore = calculateUserModeledScore(file);
                const hasSuccessStyling = userEndScore !== null && file.results?.startScore !== undefined && file.results?.expectedScore !== undefined && 
                  (userEndScore - file.results.startScore) >= (file.results.expectedScore - file.results.startScore);
                const hasErrorStyling = file.status === 'error';

                return (
                <tr 
                  key={file.id} 
                  className={`${styles.tableRow} ${file.status === 'processed' ? styles.clickableRow : ''} ${hasSuccessStyling ? styles.successRow : ''} ${hasErrorStyling ? styles.errorRow : ''}`}
                  onClick={() => file.status === 'processed' && onSelectFile && onSelectFile(originalIndex)}
                  title={file.status === 'error' && file.error ? file.error : undefined}
                >
                  <td className={styles.actionCell}>
                    {onDeleteFile && (
                      <button
                        className={styles.deleteButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFile(file.id);
                        }}
                        title="Delete file"
                      >
                        ×
                      </button>
                    )}
                  </td>
                  <td className={styles.fileNameCell}>
                    <div className={styles.fileNameContent}>
                      <span className={styles.fileNameText}>
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className={styles.patientCell}>
                    {file.results?.patientFirstName && file.results?.patientLastName
                      ? isRedacted 
                        ? `${redactName(file.results.patientFirstName)} ${redactName(file.results.patientLastName)}`
                        : `${file.results.patientFirstName} ${file.results.patientLastName}`
                      : '—'
                    }
                  </td>
                  <td className={styles.scoreCell}>
                    {file.results?.startScore !== undefined ? Math.round(file.results.startScore) : '—'}
                  </td>
                  <td className={styles.scoreCell}>
                    {file.results?.expectedScore !== undefined ? file.results.expectedScore.toFixed(2) : '—'}
                  </td>
                  <td className={styles.scoreCell}>
                    {calculateUserModeledScore(file) !== null ? (
                      <span className={`${styles.userScore} ${(() => {
                        const userEndScore = calculateUserModeledScore(file);
                        const expectedScore = file.results?.expectedScore;
                        if (expectedScore !== undefined && userEndScore !== null) {
                          const diff = userEndScore - expectedScore;
                          return diff >= 0 ? styles.positiveDiff : styles.negativeDiff;
                        }
                        return '';
                      })()}`}>
                        {(() => {
                          const userEndScore = calculateUserModeledScore(file);
                          const expectedScore = file.results?.expectedScore;
                          if (userEndScore !== null) {
                            const endScore = Math.round(userEndScore);
                            if (expectedScore !== undefined) {
                              const diff = userEndScore - expectedScore;
                              if (diff >= 0) {
                                return (
                                  <>
                                    {endScore} <span className={styles.smallText}>({diff.toFixed(2)} over)</span>
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    {endScore} <span className={styles.smallText}>({Math.abs(diff).toFixed(2)} under)</span>
                                  </>
                                );
                              }
                            }
                            return endScore.toString();
                          }
                          return '—';
                        })()}
                      </span>
                    ) : (
                      <span className={styles.noUserScore}>—</span>
                    )}
                  </td>
                  <td className={styles.differenceCell}>
                    {(() => {
                      const userEndScore = calculateUserModeledScore(file);
                      const startScore = file.results?.startScore;
                      const expectedScore = file.results?.expectedScore;
                      
                      if (userEndScore !== null && startScore !== undefined) {
                        const gain = userEndScore - startScore;
                        if (expectedScore !== undefined) {
                          const required = expectedScore - startScore;
                          return (
                            <>
                              +{gain.toFixed(0)} <span className={styles.smallText}>(required {required.toFixed(2)})</span>
                            </>
                          );
                        }
                        return gain >= 0 ? `+${gain.toFixed(0)}` : `${gain.toFixed(0)}`;
                      } else if (expectedScore !== undefined && startScore !== undefined) {
                        // Show required gain even when no actual gain yet
                        const required = expectedScore - startScore;
                        return (
                          <>
                            — <span className={styles.smallText}>(required {required.toFixed(2)})</span>
                          </>
                        );
                      }
                      return '—';
                    })()}
                  </td>
                  <td className={styles.statusCell}>
                    <span className={styles.statusText}>
                      {getStatusText(file)}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {processedFiles.length === 0 && (
        <div className={styles.emptyState}>
          <FileText size={48} className={styles.emptyIcon} />
          <h3>No files match the current filter</h3>
          <p>Try adjusting your filter settings or upload new files</p>
        </div>
      )}
    </div>
  );
};

export default SummaryView;
