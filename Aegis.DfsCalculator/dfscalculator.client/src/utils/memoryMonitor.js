/**
 * Memory Monitor - Monitors browser memory usage and triggers cleanup
 */

let memoryCheckInterval = null;
let isMonitoring = false;
let cleanupCallbacks = [];

/**
 * Start memory monitoring
 * @param {number} checkInterval - Check interval in milliseconds (default: 30000)
 * @param {number} warningThreshold - Memory usage warning threshold (0-1, default: 0.7)
 * @param {number} criticalThreshold - Memory usage critical threshold (0-1, default: 0.85)
 */
export function startMemoryMonitoring(checkInterval = 30000, warningThreshold = 0.7, criticalThreshold = 0.85) {
  if (isMonitoring) {
    stopMemoryMonitoring();
  }

  isMonitoring = true;
  
  memoryCheckInterval = setInterval(() => {
    checkMemoryUsage(warningThreshold, criticalThreshold);
  }, checkInterval);
  
  // Memory monitoring started (silent)
}

/**
 * Stop memory monitoring
 */
export function stopMemoryMonitoring() {
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }
  isMonitoring = false;
  // Memory monitoring stopped (silent)
}

/**
 * Check current memory usage
 * @param {number} warningThreshold - Warning threshold
 * @param {number} criticalThreshold - Critical threshold
 */
function checkMemoryUsage(warningThreshold, criticalThreshold) {
  if (!performance.memory) {
    return; // Memory API not available
  }

  const used = performance.memory.usedJSHeapSize;
  const total = performance.memory.totalJSHeapSize;
  const limit = performance.memory.jsHeapSizeLimit;
  
  const usage = used / limit;
  const heapUsage = used / total;
  
  const memoryInfo = {
    usedMB: Math.round(used / 1024 / 1024),
    totalMB: Math.round(total / 1024 / 1024),
    limitMB: Math.round(limit / 1024 / 1024),
    usagePercent: Math.round(usage * 100),
    heapUsagePercent: Math.round(heapUsage * 100)
  };
  
  // Trigger cleanup based on memory usage (no logging)
  if (usage >= criticalThreshold) {
    triggerCleanup('critical', memoryInfo);
  } else if (usage >= warningThreshold) {
    triggerCleanup('warning', memoryInfo);
  }
}

/**
 * Trigger cleanup based on memory usage
 * @param {string} level - Cleanup level ('warning' or 'critical')
 * @param {Object} memoryInfo - Current memory information
 */
function triggerCleanup(level, memoryInfo) {
  cleanupCallbacks.forEach(callback => {
    try {
      callback(level, memoryInfo);
    } catch (error) {
      console.error('Cleanup callback error:', error);
    }
  });
}

/**
 * Add cleanup callback
 * @param {Function} callback - Cleanup callback function
 */
export function addCleanupCallback(callback) {
  cleanupCallbacks.push(callback);
}

/**
 * Remove cleanup callback
 * @param {Function} callback - Cleanup callback function to remove
 */
export function removeCleanupCallback(callback) {
  const index = cleanupCallbacks.indexOf(callback);
  if (index > -1) {
    cleanupCallbacks.splice(index, 1);
  }
}

/**
 * Get current memory usage
 * @returns {Object|null} Memory usage information or null if not available
 */
export function getMemoryUsage() {
  if (!performance.memory) {
    return null;
  }

  const used = performance.memory.usedJSHeapSize;
  const total = performance.memory.totalJSHeapSize;
  const limit = performance.memory.jsHeapSizeLimit;
  
  return {
    usedMB: Math.round(used / 1024 / 1024),
    totalMB: Math.round(total / 1024 / 1024),
    limitMB: Math.round(limit / 1024 / 1024),
    usagePercent: Math.round((used / limit) * 100),
    heapUsagePercent: Math.round((used / total) * 100),
    isMonitoring
  };
}

/**
 * Force garbage collection if available
 */
export function forceGarbageCollection() {
  if (window.gc) {
    window.gc();
    // Garbage collection triggered (silent)
  }
}

/**
 * Estimate memory usage of an object
 * @param {any} obj - Object to estimate memory usage for
 * @returns {number} Estimated memory usage in bytes
 */
export function estimateObjectMemory(obj) {
  if (obj === null || obj === undefined) {
    return 0;
  }
  
  if (typeof obj === 'string') {
    return obj.length * 2; // Rough estimate for UTF-16
  }
  
  if (typeof obj === 'number') {
    return 8; // 64-bit number
  }
  
  if (typeof obj === 'boolean') {
    return 4;
  }
  
  if (Array.isArray(obj)) {
    return obj.reduce((total, item) => total + estimateObjectMemory(item), 0);
  }
  
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((total, key) => {
      return total + estimateObjectMemory(key) + estimateObjectMemory(obj[key]);
    }, 0);
  }
  
  return 0;
}

/**
 * Get memory usage statistics for debugging
 * @returns {Object} Memory statistics
 */
export function getMemoryStats() {
  const memory = getMemoryUsage();
  if (!memory) {
    return { available: false };
  }
  
  return {
    available: true,
    ...memory,
    isMonitoring,
    cleanupCallbacks: cleanupCallbacks.length
  };
}
