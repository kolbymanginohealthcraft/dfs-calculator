/**
 * Performance Monitoring System
 * 
 * Tracks API call performance, cache hit rates,
 * and user interaction metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimes: []
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      ui: {
        scoreUpdates: 0,
        fileUploads: 0,
        modeSwitches: 0
      }
    };
    
    this.startTimes = new Map();
  }

  /**
   * Start timing an operation
   */
  startTiming(operationId) {
    this.startTimes.set(operationId, Date.now());
  }

  /**
   * End timing an operation
   */
  endTiming(operationId) {
    const startTime = this.startTimes.get(operationId);
    if (!startTime) return 0;
    
    const duration = Date.now() - startTime;
    this.startTimes.delete(operationId);
    return duration;
  }

  /**
   * Record API call
   */
  recordApiCall(success, responseTime) {
    this.metrics.apiCalls.total++;
    
    if (success) {
      this.metrics.apiCalls.successful++;
    } else {
      this.metrics.apiCalls.failed++;
    }
    
    if (responseTime) {
      this.metrics.apiCalls.responseTimes.push(responseTime);
      
      // Keep only last 100 response times
      if (this.metrics.apiCalls.responseTimes.length > 100) {
        this.metrics.apiCalls.responseTimes.shift();
      }
      
      // Calculate average
      this.metrics.apiCalls.averageResponseTime = 
        this.metrics.apiCalls.responseTimes.reduce((a, b) => a + b, 0) / 
        this.metrics.apiCalls.responseTimes.length;
    }
  }

  /**
   * Record cache hit/miss
   */
  recordCacheAccess(hit) {
    if (hit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }
    
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
  }

  /**
   * Record UI interaction
   */
  recordUIInteraction(type) {
    if (this.metrics.ui[type] !== undefined) {
      this.metrics.ui[type]++;
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: Date.now()
    };
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const { apiCalls, cache, ui } = this.metrics;
    
    return {
      apiPerformance: {
        totalCalls: apiCalls.total,
        successRate: apiCalls.total > 0 ? (apiCalls.successful / apiCalls.total) * 100 : 0,
        averageResponseTime: Math.round(apiCalls.averageResponseTime),
        failureRate: apiCalls.total > 0 ? (apiCalls.failed / apiCalls.total) * 100 : 0
      },
      cachePerformance: {
        hitRate: Math.round(cache.hitRate * 100) / 100,
        totalAccesses: cache.hits + cache.misses
      },
      userActivity: {
        scoreUpdates: ui.scoreUpdates,
        fileUploads: ui.fileUploads,
        modeSwitches: ui.modeSwitches
      }
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      apiCalls: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimes: []
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      ui: {
        scoreUpdates: 0,
        fileUploads: 0,
        modeSwitches: 0
      }
    };
    this.startTimes.clear();
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    return {
      metrics: this.getMetrics(),
      summary: this.getSummary(),
      exportedAt: new Date().toISOString()
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions
export const startTiming = (id) => performanceMonitor.startTiming(id);
export const endTiming = (id) => performanceMonitor.endTiming(id);
export const recordApiCall = (success, responseTime) => performanceMonitor.recordApiCall(success, responseTime);
export const recordCacheAccess = (hit) => performanceMonitor.recordCacheAccess(hit);
export const recordUIInteraction = (type) => performanceMonitor.recordUIInteraction(type);
export const getPerformanceMetrics = () => performanceMonitor.getMetrics();
export const getPerformanceSummary = () => performanceMonitor.getSummary();
