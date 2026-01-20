import React, { useState, useEffect } from 'react';
import { FileText, X, CheckCircle, AlertCircle, Clock, Download } from 'lucide-react';
import styles from './FileManager.module.css';

const FileManager = ({ 
  uploadedFiles, 
  currentFileIndex, 
  onFileSelect, 
  onClearAll,
  onExportAll,
  isProcessing 
}) => {
  const [expandedFiles, setExpandedFiles] = useState(new Set());

  const toggleFileExpansion = (fileId) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedFiles(newExpanded);
  };

  const getStatusIcon = (file) => {
    if (file.status === 'processing') return <Clock size={14} className={styles.processingIcon} />;
    if (file.status === 'error') return <AlertCircle size={14} className={styles.errorIcon} />;
    if (file.status === 'processed') return <CheckCircle size={14} className={styles.successIcon} />;
    return <Clock size={14} className={styles.pendingIcon} />;
  };

  const getStatusText = (file) => {
    if (file.status === 'processing') return 'Processing...';
    if (file.status === 'error') return 'Error';
    if (file.status === 'processed') return 'Success';
    return 'Pending';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const successfulFiles = uploadedFiles.filter(f => f.status === 'processed');
  const errorFiles = uploadedFiles.filter(f => f.status === 'error');
  const processingFiles = uploadedFiles.filter(f => f.status === 'processing');

  return (
    <div className={styles.fileManager}>
      <div className={styles.fileManagerHeader}>
        <div className={styles.fileManagerTitle}>
          <FileText size={16} />
          <span>Uploaded Files ({uploadedFiles.length})</span>
        </div>
        <div className={styles.fileManagerActions}>
          {uploadedFiles.length > 0 && (
            <>
              <button
                className={styles.exportAllButton}
                onClick={onExportAll}
                disabled={successfulFiles.length === 0}
                title="Export all results to CSV"
              >
                <Download size={14} />
                Export All
              </button>
              <button
                className={styles.clearAllButton}
                onClick={onClearAll}
                title="Clear all files"
              >
                <X size={14} />
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {uploadedFiles.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText size={24} className={styles.emptyIcon} />
          <p>No files uploaded yet</p>
          <p className={styles.emptySubtext}>
            Drag and drop XML files or ZIP archives to get started
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className={styles.summaryStats}>
            <div className={styles.statItem}>
              <CheckCircle size={14} className={styles.successIcon} />
              <span>{successfulFiles.length} Success</span>
            </div>
            {processingFiles.length > 0 && (
              <div className={styles.statItem}>
                <Clock size={14} className={styles.processingIcon} />
                <span>{processingFiles.length} Processing</span>
              </div>
            )}
            {errorFiles.length > 0 && (
              <div className={styles.statItem}>
                <AlertCircle size={14} className={styles.errorIcon} />
                <span>{errorFiles.length} Errors</span>
              </div>
            )}
          </div>

          {/* File List */}
          <div className={styles.fileList}>
            {uploadedFiles.map((file, index) => (
              <div
                key={file.id}
                className={`${styles.fileItem} ${
                  currentFileIndex === index ? styles.fileItemActive : ''
                } ${file.status === 'error' ? styles.fileItemError : ''}`}
                onClick={() => file.status === 'processed' && onFileSelect(index)}
              >
                <div className={styles.fileItemHeader}>
                  <div className={styles.fileItemInfo}>
                    {getStatusIcon(file)}
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>
                      {formatFileSize(file.size || 0)}
                    </span>
                  </div>
                  <div className={styles.fileItemStatus}>
                    <span className={styles.statusText}>
                      {getStatusText(file)}
                    </span>
                    {file.status === 'processed' && file.results && (
                      <button
                        className={styles.expandButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFileExpansion(file.id);
                        }}
                      >
                        {expandedFiles.has(file.id) ? '−' : '+'}
                      </button>
                    )}
                  </div>
                </div>

                {/* File Details (when expanded) */}
                {expandedFiles.has(file.id) && file.results && (
                  <div className={styles.fileDetails}>
                    <div className={styles.resultSummary}>
                      <div className={styles.resultItem}>
                        <span className={styles.resultLabel}>Start Score:</span>
                        <span className={styles.resultValue}>
                          {file.results.startScore}
                        </span>
                      </div>
                      <div className={styles.resultItem}>
                        <span className={styles.resultLabel}>Expected Score:</span>
                        <span className={styles.resultValue}>
                          {file.results.expectedScore}
                        </span>
                      </div>
                      <div className={styles.resultItem}>
                        <span className={styles.resultLabel}>Difference:</span>
                        <span className={`${styles.resultValue} ${
                          file.results.scoreDifference > 0 ? styles.positiveDiff : styles.negativeDiff
                        }`}>
                          {file.results.scoreDifference > 0 ? '+' : ''}{file.results.scoreDifference}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Details */}
                {file.status === 'error' && file.error && (
                  <div className={styles.errorDetails}>
                    <span className={styles.errorMessage}>{file.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FileManager;
