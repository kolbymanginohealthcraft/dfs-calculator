/**
 * Optimized API Service with intelligent caching and debouncing
 * 
 * Features:
 * - Request debouncing to prevent excessive API calls
 * - Intelligent caching for repeated calculations
 * - Optimistic UI updates for instant feedback
 * - Request batching for bulk operations
 */

import { BasicAPIService, AdvancedAPIService } from './apiService.js';
import { startTiming, endTiming, recordApiCall, recordCacheAccess } from './performanceMonitor.js';

// Cache for calculation results
const calculationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Debounce timers
const debounceTimers = new Map();

/**
 * Generate cache key for calculation parameters
 */
function generateCacheKey(scores, mobilityType, mode = 'basic') {
  const scoresStr = JSON.stringify(scores);
  return `${mode}_${mobilityType}_${btoa(scoresStr)}`;
}

/**
 * Check if cached result is still valid
 */
function isCacheValid(timestamp) {
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Debounced API service wrapper
 */
class OptimizedAPIService {
  constructor(baseService, debounceMs = 300) {
    this.baseService = baseService;
    this.debounceMs = debounceMs;
    this.pendingRequests = new Map();
  }

  /**
   * Debounced calculation with caching
   */
  async calculateScore(scores, mobilityType, options = {}) {
    const { 
      useCache = true, 
      forceRefresh = false,
      optimisticUpdate = true 
    } = options;

    const cacheKey = generateCacheKey(scores, mobilityType, 'basic');
    
    // Check cache first
    if (useCache && !forceRefresh) {
      const cached = calculationCache.get(cacheKey);
      if (cached && isCacheValid(cached.timestamp)) {
        console.log('Using cached result:', cached.result);
        recordCacheAccess(true);
        return cached.result;
      }
      recordCacheAccess(false);
    }

    // Cancel previous debounced request for same parameters
    if (debounceTimers.has(cacheKey)) {
      clearTimeout(debounceTimers.get(cacheKey));
    }

    // Return promise for pending request if exists
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Create new debounced request
    const requestPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(async () => {
        const timingId = `api_call_${Date.now()}`;
        startTiming(timingId);
        
        try {
          console.log('Making debounced API call for:', cacheKey);
          const result = await this.baseService.calculateScore(scores, mobilityType);
          
          // Cache the result
          calculationCache.set(cacheKey, {
            result,
            timestamp: Date.now()
          });
          
          // Record successful API call
          const responseTime = endTiming(timingId);
          recordApiCall(true, responseTime);
          
          // Clean up pending request
          this.pendingRequests.delete(cacheKey);
          resolve(result);
        } catch (error) {
          // Record failed API call
          const responseTime = endTiming(timingId);
          recordApiCall(false, responseTime);
          
          this.pendingRequests.delete(cacheKey);
          reject(error);
        }
      }, this.debounceMs);

      debounceTimers.set(cacheKey, timer);
    });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Optimistic calculation for instant UI feedback
   * Returns immediate estimate while real calculation happens in background
   */
  async calculateScoreOptimistic(scores, mobilityType) {
    // Return optimistic estimate immediately
    const optimisticResult = this.getOptimisticEstimate(scores, mobilityType);
    
    // Start real calculation in background
    this.calculateScore(scores, mobilityType, { useCache: true })
      .then(result => {
        // Update UI with real result when available
        console.log('Real calculation completed:', result);
        // You could emit an event here to update UI
      })
      .catch(error => {
        console.error('Background calculation failed:', error);
      });

    return optimisticResult;
  }

  /**
   * Simple optimistic estimate based on score patterns
   */
  getOptimisticEstimate(scores, mobilityType) {
    // Simple heuristic: sum of all scores with basic weighting
    const selfCareTotal = Object.values(scores.selfCare || {}).reduce((sum, score) => sum + (score || 0), 0);
    const mobilityTotal = Object.values(scores.mobility || {}).reduce((sum, score) => sum + (score || 0), 0);
    
    // Basic estimation (this could be more sophisticated)
    const estimate = selfCareTotal + mobilityTotal;
    
    return {
      result: {
        functionScore: Math.min(estimate, 60) // Cap at 60
      }
    };
  }

  /**
   * Batch multiple calculations
   */
  async calculateBatch(calculations) {
    const promises = calculations.map(({ scores, mobilityType }) => 
      this.calculateScore(scores, mobilityType)
    );
    
    return Promise.all(promises);
  }

  /**
   * Clear cache for specific parameters or all
   */
  clearCache(cacheKey = null) {
    if (cacheKey) {
      calculationCache.delete(cacheKey);
    } else {
      calculationCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const validEntries = Array.from(calculationCache.values())
      .filter(entry => isCacheValid(entry.timestamp));
    
    return {
      totalEntries: calculationCache.size,
      validEntries: validEntries.length,
      expiredEntries: calculationCache.size - validEntries.length
    };
  }
}

/**
 * Create optimized API service instances
 */
export function createOptimizedBasicAPIService(debounceMs = 300) {
  const baseService = new BasicAPIService();
  return new OptimizedAPIService(baseService, debounceMs);
}

export function createOptimizedAdvancedAPIService(authToken, debounceMs = 300) {
  const baseService = new AdvancedAPIService(authToken);
  return new OptimizedAPIService(baseService, debounceMs);
}

/**
 * Global cache cleanup (run periodically)
 */
export function cleanupExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of calculationCache.entries()) {
    if (!isCacheValid(entry.timestamp)) {
      calculationCache.delete(key);
    }
  }
}

// Clean up expired cache every 10 minutes
setInterval(cleanupExpiredCache, 10 * 60 * 1000);
