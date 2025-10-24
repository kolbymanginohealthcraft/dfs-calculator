import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Download, FileText, AlertCircle, CheckCircle, Eye, EyeOff, Info, Search, X, ChevronDown } from 'lucide-react';
import { redactName, redactFullName, redactFacility, redactAddress } from '../utils/redactionUtils';
import { extractPatientSummary, determineMobilityType } from '../utils/calculations';
import { fetchFacilityInfo } from '../utils/facilityLookup';
import html2pdf from 'html2pdf.js';
import { lazy, Suspense } from 'react';
import styles from './SummaryView.module.css';

// Lazy load ExportView to avoid circular dependencies
const ExportView = lazy(() => import('./ExportView'));

const SummaryView = React.memo(({ uploadedFiles, onSelectFile, onExportAll, onExportDetails, calculateFunctionScore, onDeleteFile, isRedacted, onToggleRedaction }) => {
  const [sortField, setSortField] = useState('status');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [exportData, setExportData] = useState(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const exportRef = useRef();
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (searchTerm) {
        // First escape: clear search
        clearSearch();
      } else if (isSearchFocused) {
        // Second escape: exit search focus
        searchInputRef.current?.blur();
      } else if (showExportDropdown) {
        // Third escape: close export dropdown
        setShowExportDropdown(false);
      }
    }
  };

  // Close dropdown when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (showExportDropdown) {
          setShowExportDropdown(false);
        } else if (showFilterDropdown) {
          setShowFilterDropdown(false);
        }
      }
    };

    if (showExportDropdown || showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showExportDropdown, showFilterDropdown]);

  // Memoize expensive calculations to prevent recalculation on every render
  const calculateUserModeledScore = useCallback((file) => {
    if (!file.userModeledValues || !calculateFunctionScore) return null;
    
    try {
      const userEndScore = calculateFunctionScore(file.userModeledValues);
      const startScore = file.results?.startScore || 0;
      
      // Only return the score if there's actual gain (end > start)
      return userEndScore > startScore ? userEndScore : null;
    } catch (error) {
      return null;
    }
  }, [calculateFunctionScore]);

  // Calculate gain vs required (actual gain - required gain)
  const calculateGainVsRequired = useCallback((file) => {
    const startScore = file.results?.startScore || 0;
    const userEndScore = calculateUserModeledScore(file);
    const expectedScore = file.results?.expectedScore || 0;
    const requiredGain = file.results?.scoreDifference || 0;
    
    if (userEndScore === null) return null;
    
    const actualGain = userEndScore - startScore;
    return actualGain - requiredGain;
  }, [calculateUserModeledScore]);

  const processedFiles = useMemo(() => {
    return uploadedFiles
      .filter(file => {
        // Status filter
        if (filterStatus === 'all') {
          // Continue to search filter
        } else if (filterStatus === 'success') {
          if (file.status !== 'processed') return false;
        } else if (filterStatus === 'error') {
          if (file.status !== 'error') return false;
        }

        // Search filter
        if (searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase();
          
          // Search in file name
          const fileName = file.name.toLowerCase();
          if (fileName.includes(searchLower)) return true;
          
          // Search in patient names (even if redacted, search the redacted text)
          const patientFirstName = file.results?.patientFirstName || '';
          const patientLastName = file.results?.patientLastName || '';
          const fullName = `${patientFirstName} ${patientLastName}`.toLowerCase();
          if (fullName.includes(searchLower)) return true;
          
          return false;
        }
        
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
  }, [uploadedFiles, sortField, sortDirection, filterStatus, searchTerm]);

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
    if (file.status === 'processed') return 'Success';
    if (file.status === 'error') return 'Error';
    if (file.status === 'processing') return 'Processing';
    return 'Pending';
  };

  const getFilterDisplayText = () => {
    switch (filterStatus) {
      case 'all':
        return `All Files (${uploadedFiles.length})`;
      case 'success':
        return `Success (${successfulCount})`;
      case 'error':
        return `Errors (${errorCount})`;
      default:
        return 'All Files';
    }
  };

  // Handle PDF export for individual file
  const handlePdfExport = (file, event) => {
    event.stopPropagation(); // Prevent row click
    
    if (file.status !== 'processed' || !file._rawData) {
      return;
    }

    // Extract patient data from raw parsed values (same as detailed view)
    const parsedValues = file._rawData?.parsedValues || {};
    const patientSummary = extractPatientSummary(parsedValues);
    const mobilityType = determineMobilityType(parsedValues);

    // Extract patient information
    const {
      firstName,
      lastName,
      dob,
      facility,
      admitDate,
      dischargeDate,
      age,
      ardGapDays,
    } = patientSummary;

    // Get ARD date from parsed values
    const ardDate = parsedValues["A2300"];

    // Prepare patient data with redaction
    const patient = {
      name: isRedacted ? redactFullName(firstName, lastName) : `${firstName} ${lastName}`,
      dob,
      age,
      admitDate,
      ard: ardDate,
      dischargeDate,
      facility: isRedacted ? redactFacility('') : '', // Will be updated by facility lookup
      address: isRedacted ? redactAddress('') : '', // Will be updated by facility lookup
    };

    const scores = {
      start: file.results?.startScore,
      expected: file.results?.expectedScore,
      modeled: calculateUserModeledScore(file) || file.results?.startScore
    };

    const functionItems = {
      scores: file._rawData?.modeledValues || file._rawData?.startScores,
      startScores: file._rawData?.startScores,
      mobilityType: mobilityType
    };


    // Fetch facility information and then set export data
    const fetchAndSetExportData = async () => {
      let facilityName = '';
      let facilityAddress = '';
      
      try {
        // Fetch facility info if we have a CCN
        const ccn = parsedValues["A0100B"];
        if (ccn) {
          const response = await fetch(`/api/facility-name/${ccn}`);
          const result = await response.json();
          facilityName = result?.facility_name || `CCN: ${ccn}`;
          facilityAddress = `${result?.address || ""}, ${result?.city || ""}, ${result?.state || ""} ${result?.zip || ""}`;
        } else {
          facilityName = `CCN: ${facility || "Unknown"}`;
        }
      } catch (error) {
        facilityName = `CCN: ${facility || "Unknown"}`;
      }

      // Update patient data with facility information
      const updatedPatient = {
        ...patient,
        facility: isRedacted ? redactFacility(facilityName) : facilityName,
        address: isRedacted ? redactAddress(facilityAddress) : facilityAddress,
      };

      // Set the export data and trigger PDF generation
      setExportData({
        patient: updatedPatient,
        scores,
        functionItems,
        mobilityType,
        fileName: file.name
      });
    };

    fetchAndSetExportData();
  };

  // Handle PDF generation when export data is set
  React.useEffect(() => {
    if (exportData && exportRef.current) {
      // Small delay to ensure the ExportView has rendered
      setTimeout(() => {
        html2pdf()
          .set({
            margin: 0.5,
            filename: `dfs-report-${exportData.fileName.replace(/\.(xml|zip)$/i, '')}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
          })
          .from(exportRef.current)
          .save()
          .then(() => {
            // Clear export data after successful export
            setExportData(null);
          })
          .catch((error) => {
            setExportData(null);
          });
      }, 500); // Give more time for rendering
    }
  }, [exportData]);

  const successfulCount = uploadedFiles.filter(f => f.status === 'processed').length;
  const errorCount = uploadedFiles.filter(f => f.status === 'error').length;
  const processingCount = uploadedFiles.filter(f => f.status === 'processing').length;

  return (
    <div className={styles.summaryView}>
      {/* Enhanced Header with Analytics */}
      <div className={styles.summaryHeader}>
        <div className={styles.headerContainer}>
          <div className={styles.headerLeft}>
            <div className={styles.summaryTitle}>
              <FileText size={20} />
              <span>File Summary</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.searchGroup}>
              <div className={styles.searchBar}>
                <Search className={styles.searchIcon} size={20} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search files or patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  onKeyDown={handleKeyDown}
                  className={styles.searchInput}
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className={styles.clearButton}
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className={styles.filterGroup}>
              <div className={styles.filterDropdown} ref={filterDropdownRef}>
                <button
                  className={styles.filterDropdownButton}
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  title="Filter files by status"
                >
                  {getFilterDisplayText()}
                  <ChevronDown size={14} className={styles.chevronIcon} />
                </button>
                {showFilterDropdown && (
                  <div className={styles.filterDropdownMenu}>
                    <button
                      className={`${styles.filterDropdownItem} ${filterStatus === 'all' ? styles.filterDropdownItemActive : ''}`}
                      onClick={() => {
                        setFilterStatus('all');
                        setShowFilterDropdown(false);
                      }}
                    >
                      All Files ({uploadedFiles.length})
                    </button>
                    <button
                      className={`${styles.filterDropdownItem} ${filterStatus === 'success' ? styles.filterDropdownItemActive : ''}`}
                      onClick={() => {
                        setFilterStatus('success');
                        setShowFilterDropdown(false);
                      }}
                    >
                      Success ({successfulCount})
                    </button>
                    <button
                      className={`${styles.filterDropdownItem} ${filterStatus === 'error' ? styles.filterDropdownItemActive : ''}`}
                      onClick={() => {
                        setFilterStatus('error');
                        setShowFilterDropdown(false);
                      }}
                    >
                      Errors ({errorCount})
                    </button>
                  </div>
                )}
              </div>
            </div>
            {onToggleRedaction && (
              <button
                className={styles.redactionButton}
                onClick={onToggleRedaction}
                title={isRedacted ? "Show patient names" : "Hide patient names"}
              >
                {isRedacted ? <><EyeOff className={styles.buttonIcon} size={16} /> Redaction On</> : <><Eye className={styles.buttonIcon} size={16} /> Redaction Off</>}
              </button>
            )}
            <div className={styles.exportDropdown} ref={dropdownRef}>
              <button
                className={styles.exportDropdownButton}
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={successfulCount === 0}
                title="Export options"
              >
                <Download size={16} />
                Export CSV
                <ChevronDown size={14} className={styles.chevronIcon} />
              </button>
              {showExportDropdown && (
                <div className={styles.exportDropdownMenu}>
                  <button
                    className={styles.exportDropdownItem}
                    onClick={() => {
                      onExportAll();
                      setShowExportDropdown(false);
                    }}
                    title="Export summary results to CSV"
                  >
                    <div className={styles.exportDropdownItemTitle}>
                      <Download size={14} />
                      Summary View
                    </div>
                    <div className={styles.exportDropdownItemDescription}>
                      Same as below table
                    </div>
                  </button>
                  <button
                    className={styles.exportDropdownItem}
                    onClick={() => {
                      onExportDetails();
                      setShowExportDropdown(false);
                    }}
                    title="Export detailed GG components to CSV"
                  >
                    <div className={styles.exportDropdownItemTitle}>
                      <Download size={14} />
                      Detailed View
                    </div>
                    <div className={styles.exportDropdownItemDescription}>
                      Includes GG breakdown
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Separator Line */}
      <div className={styles.separatorLine}></div>

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
                  className={`${styles.sortableHeader} ${styles.startScoreHeader}`}
                  onClick={() => handleSort('startScore')}
                >
                  <span className={`${styles.scoreDot} ${styles.startDot}`}></span>
                  Start Score {getSortIcon('startScore')}
                </th>
                <th 
                  className={`${styles.sortableHeader} ${styles.expectedScoreHeader}`}
                  onClick={() => handleSort('expectedScore')}
                >
                  <span className={`${styles.scoreDot} ${styles.expectedDot}`}></span>
                  Expected Score {getSortIcon('expectedScore')}
                </th>
                <th 
                  className={`${styles.sortableHeader} ${styles.endScoreHeader}`}
                  onClick={() => handleSort('userModeledScore')}
                  title="This is not the patient's actual end score. This is a modeled score based on the values you have set."
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className={`${styles.scoreDot} ${styles.endDot}`}></span>
                    <span>Modeled End Score</span>
                    <Info size={14} style={{ opacity: 0.6 }} />
                  </div>
                  {getSortIcon('userModeledScore')}
                </th>
                <th 
                  className={`${styles.sortableHeader} ${styles.gainHeader}`}
                  onClick={() => handleSort('gainVsRequired')}
                >
                  <span className={`${styles.scoreDot} ${styles.gainDot}`}></span>
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
                    <div className={styles.actionButtons}>
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
                      {file.status === 'processed' && (
                        <button
                          className={styles.pdfButton}
                          onClick={(e) => handlePdfExport(file, e)}
                          title="Export PDF"
                        >
                          <FileText size={14} />
                        </button>
                      )}
                    </div>
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

      {/* Hidden Export View */}
      {exportData && (
        <div style={{ display: "none" }}>
          <div ref={exportRef}>
            <Suspense fallback={<div>Loading...</div>}>
              <ExportView
                patient={exportData.patient}
                scores={exportData.scores}
                functionItems={exportData.functionItems}
                mobilityType={exportData.mobilityType}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
});

export default SummaryView;
