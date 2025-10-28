/**
 * Batch Processing Utilities for Advanced Mode
 * 
 * Handles bulk file processing with intelligent batching,
 * progress tracking, and error recovery
 */

import { createOptimizedAdvancedAPIService } from './optimizedApiService.js';

/**
 * Batch processor for handling multiple file calculations
 */
export class BatchProcessor {
  constructor(authToken, options = {}) {
    this.apiService = createOptimizedAdvancedAPIService(authToken, 100); // Faster debounce for batch
    this.options = {
      batchSize: 5, // Process 5 files at a time
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    };
    this.isProcessing = false;
    this.currentBatch = 0;
    this.totalBatches = 0;
    this.results = [];
    this.errors = [];
    this.progressCallbacks = new Set();
  }

  /**
   * Process multiple files in batches
   */
  async processFiles(files, onProgress = null, onComplete = null) {
    if (this.isProcessing) {
      throw new Error('Batch processor is already running');
    }

    this.isProcessing = true;
    this.results = [];
    this.errors = [];
    this.currentBatch = 0;
    this.totalBatches = Math.ceil(files.length / this.options.batchSize);

    try {
      // Process files in batches
      for (let i = 0; i < files.length; i += this.options.batchSize) {
        const batch = files.slice(i, i + this.options.batchSize);
        await this.processBatch(batch, i / this.options.batchSize);
        
        // Update progress
        const progress = {
          current: i + batch.length,
          total: files.length,
          batch: this.currentBatch,
          totalBatches: this.totalBatches,
          percentage: Math.round(((i + batch.length) / files.length) * 100)
        };
        
        this.notifyProgress(progress);
        if (onProgress) onProgress(progress);
      }

      const finalResult = {
        results: this.results,
        errors: this.errors,
        successCount: this.results.length,
        errorCount: this.errors.length,
        totalProcessed: this.results.length + this.errors.length
      };

      if (onComplete) onComplete(finalResult);
      return finalResult;

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single batch of files
   */
  async processBatch(files, batchIndex) {
    this.currentBatch = batchIndex + 1;
    
    const batchPromises = files.map(async (file, index) => {
      const globalIndex = batchIndex * this.options.batchSize + index;
      
      try {
        const xmlContent = await file.text();
        const result = await this.apiService.calculateAdvancedScore(xmlContent);
        
        return {
          index: globalIndex,
          fileName: file.name,
          success: true,
          data: result,
          file: file
        };
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        
        return {
          index: globalIndex,
          fileName: file.name,
          success: false,
          error: error.message,
          file: file
        };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    
    // Separate successful results from errors
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const fileResult = result.value;
        if (fileResult.success) {
          this.results.push(fileResult);
        } else {
          this.errors.push(fileResult);
        }
      } else {
        this.errors.push({
          index: batchIndex * this.options.batchSize + index,
          fileName: files[index].name,
          success: false,
          error: result.reason?.message || 'Unknown error',
          file: files[index]
        });
      }
    });
  }

  /**
   * Add progress callback
   */
  addProgressCallback(callback) {
    this.progressCallbacks.add(callback);
  }

  /**
   * Remove progress callback
   */
  removeProgressCallback(callback) {
    this.progressCallbacks.delete(callback);
  }

  /**
   * Notify all progress callbacks
   */
  notifyProgress(progress) {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  /**
   * Cancel current processing
   */
  cancel() {
    this.isProcessing = false;
    this.results = [];
    this.errors = [];
  }

  /**
   * Get current processing status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      currentBatch: this.currentBatch,
      totalBatches: this.totalBatches,
      resultsCount: this.results.length,
      errorsCount: this.errors.length
    };
  }
}

/**
 * Create a batch processor instance
 */
export function createBatchProcessor(authToken, options = {}) {
  return new BatchProcessor(authToken, options);
}

/**
 * Process files with automatic batching
 */
export async function processFilesInBatches(files, authToken, options = {}) {
  const processor = createBatchProcessor(authToken, options);
  return processor.processFiles(files);
}
