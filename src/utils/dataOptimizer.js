/**
 * Data Loading Optimizer
 * 
 * Implements lazy loading and caching for large data files
 * to reduce bundle size and improve initial load performance
 */

// Cache for loaded data
const dataCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Lazy load data from server
 */
export async function loadDataFile(filename, useCache = true) {
  const cacheKey = `data_${filename}`;
  
  // Check cache first
  if (useCache) {
    const cached = dataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Using cached data for ${filename}`);
      return cached.data;
    }
  }

  try {
    console.log(`Loading data file: ${filename}`);
    const response = await fetch(`/api/data/${filename}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the data
    dataCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    throw error;
  }
}

/**
 * Preload critical data files
 */
export async function preloadCriticalData() {
  const criticalFiles = [
    'mds_item_lookup.json',
    'mds_section_names.json'
  ];

  const loadPromises = criticalFiles.map(filename => 
    loadDataFile(filename).catch(error => {
      console.warn(`Failed to preload ${filename}:`, error);
      return null;
    })
  );

  await Promise.all(loadPromises);
  console.log('Critical data preloaded');
}

/**
 * Load data with fallback
 */
export async function loadDataWithFallback(filename, fallbackData = null) {
  try {
    return await loadDataFile(filename);
  } catch (error) {
    console.warn(`Failed to load ${filename}, using fallback:`, error);
    return fallbackData;
  }
}

/**
 * Clear expired cache entries
 */
export function cleanupDataCache() {
  const now = Date.now();
  for (const [key, entry] of dataCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      dataCache.delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export function getDataCacheStats() {
  const now = Date.now();
  const validEntries = Array.from(dataCache.values())
    .filter(entry => now - entry.timestamp < CACHE_TTL);
  
  return {
    totalEntries: dataCache.size,
    validEntries: validEntries.length,
    expiredEntries: dataCache.size - validEntries.length,
    memoryUsage: JSON.stringify(Array.from(dataCache.values())).length
  };
}

// Clean up cache every 15 minutes
setInterval(cleanupDataCache, 15 * 60 * 1000);
