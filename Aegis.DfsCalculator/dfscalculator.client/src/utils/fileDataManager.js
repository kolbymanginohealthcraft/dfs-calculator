/**
 * File Data Manager - Handles lazy loading and memory optimization for bulk file processing
 */

import { compressFileData, decompressFileData } from './compressionUtils';
import { storeInIndexedDB, getFromIndexedDB, removeFromIndexedDB, isIndexedDBAvailable } from './indexedDBManager';

// In-memory cache for active file data
const fileDataCache = new Map();
const MAX_CACHE_SIZE = 5; // Keep only 5 files in memory at once

/**
 * Store file data with lazy loading support
 * @param {string} fileId - Unique file identifier
 * @param {Object} summaryData - Minimal data needed for summary view
 * @param {Object} rawData - Full processed data (optional, for lazy loading)
 * @param {File} originalFile - Original file for reprocessing if needed
 */
export function storeFileData(fileId, summaryData, rawData = null, originalFile = null) {
  // Compress raw data if provided
  const compressedRawData = rawData ? compressFileData(rawData) : null;
  
  const fileData = {
    id: fileId,
    summary: summaryData,
    rawData: compressedRawData, // Compressed raw data
    originalFile: originalFile,
    lastAccessed: Date.now(),
    isLoaded: rawData !== null
  };
  
  // If cache is full, remove least recently used
  if (fileDataCache.size >= MAX_CACHE_SIZE && !fileDataCache.has(fileId)) {
    const oldestKey = Array.from(fileDataCache.keys())
      .reduce((oldest, key) => 
        fileDataCache.get(key).lastAccessed < fileDataCache.get(oldest).lastAccessed ? key : oldest
      );
    fileDataCache.delete(oldestKey);
  }
  
  fileDataCache.set(fileId, fileData);
  
  // Store in IndexedDB for persistence if available
  if (isIndexedDBAvailable() && rawData) {
    try {
      storeInIndexedDB(fileId, {
        summary: summaryData,
        rawData: compressedRawData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('Failed to store in IndexedDB:', error);
    }
  }
  
  return fileData;
}

/**
 * Get file data, loading raw data if needed
 * @param {string} fileId - Unique file identifier
 * @param {Function} reprocessCallback - Function to reprocess file if raw data not available
 * @returns {Object} File data with raw data loaded
 */
export async function getFileData(fileId, reprocessCallback = null) {
  const cached = fileDataCache.get(fileId);
  
  if (!cached) {
    throw new Error(`File data not found: ${fileId}`);
  }
  
  // If raw data is not loaded, try to load from IndexedDB first
  if (!cached.isLoaded) {
    try {
      const storedData = await getFromIndexedDB(fileId);
      if (storedData && storedData.rawData) {
        cached.rawData = storedData.rawData;
        cached.isLoaded = true;
        cached.lastAccessed = Date.now();
      }
    } catch (error) {
      console.warn('Failed to load from IndexedDB:', error);
    }
  }
  
  // If still not loaded and we have a reprocess callback
  if (!cached.isLoaded && cached.originalFile && reprocessCallback) {
    try {
      // Reprocess the file to get raw data
      const rawData = await reprocessCallback(cached.originalFile);
      cached.rawData = compressFileData(rawData);
      cached.isLoaded = true;
      cached.lastAccessed = Date.now();
    } catch (error) {
      console.error('Failed to reprocess file:', error);
      throw error;
    }
  }
  
  // Decompress raw data before returning
  if (cached.rawData) {
    cached.rawData = decompressFileData(cached.rawData);
  }
  
  // Update access time
  cached.lastAccessed = Date.now();
  
  return cached;
}

/**
 * Get only summary data (lightweight)
 * @param {string} fileId - Unique file identifier
 * @returns {Object} Summary data only
 */
export function getFileSummary(fileId) {
  const cached = fileDataCache.get(fileId);
  if (!cached) {
    throw new Error(`File data not found: ${fileId}`);
  }
  
  cached.lastAccessed = Date.now();
  return {
    id: cached.id,
    summary: cached.summary,
    isLoaded: cached.isLoaded
  };
}

/**
 * Check if file has raw data loaded
 * @param {string} fileId - Unique file identifier
 * @returns {boolean} True if raw data is loaded
 */
export function isFileDataLoaded(fileId) {
  const cached = fileDataCache.get(fileId);
  return cached ? cached.isLoaded : false;
}

/**
 * Clear raw data from memory (keep summary only)
 * @param {string} fileId - Unique file identifier
 */
export function clearRawData(fileId) {
  const cached = fileDataCache.get(fileId);
  if (cached) {
    cached.rawData = null;
    cached.isLoaded = false;
  }
}

/**
 * Clear all file data from memory
 */
export function clearAllFileData() {
  fileDataCache.clear();
}

/**
 * Clear all file data from memory and IndexedDB
 */
export async function clearAllFileDataPersistent() {
  fileDataCache.clear();
  
  if (isIndexedDBAvailable()) {
    try {
      const { clearIndexedDB } = await import('./indexedDBManager');
      await clearIndexedDB();
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
  }
}

/**
 * Get memory usage statistics
 * @returns {Object} Memory usage info
 */
export function getMemoryStats() {
  const stats = {
    totalFiles: fileDataCache.size,
    loadedFiles: Array.from(fileDataCache.values()).filter(f => f.isLoaded).length,
    cacheSize: MAX_CACHE_SIZE
  };
  
  // Estimate memory usage
  let estimatedMemory = 0;
  for (const file of fileDataCache.values()) {
    estimatedMemory += JSON.stringify(file.summary).length;
    if (file.isLoaded && file.rawData) {
      estimatedMemory += JSON.stringify(file.rawData).length;
    }
  }
  
  stats.estimatedMemoryKB = Math.round(estimatedMemory / 1024);
  
  return stats;
}

/**
 * Clean up least recently used files
 * @param {number} keepCount - Number of files to keep in cache
 */
export function cleanupCache(keepCount = 3) {
  if (fileDataCache.size <= keepCount) return;
  
  const entries = Array.from(fileDataCache.entries())
    .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
  
  const toRemove = entries.slice(0, entries.length - keepCount);
  toRemove.forEach(([key]) => {
    const file = fileDataCache.get(key);
    if (file) {
      file.rawData = null;
      file.isLoaded = false;
    }
  });
}
