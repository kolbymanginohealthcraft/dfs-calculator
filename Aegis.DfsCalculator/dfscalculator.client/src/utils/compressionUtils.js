/**
 * Compression Utilities - Handles data compression for memory optimization
 */

/**
 * Simple compression using JSON stringify and basic encoding
 * This is a lightweight compression that works without external libraries
 * @param {any} data - Data to compress
 * @returns {string} Compressed data as string
 */
export function compressData(data) {
  try {
    const jsonString = JSON.stringify(data);
    
    // Simple compression: remove unnecessary whitespace and use shorter keys
    const compressed = jsonString
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/":/g, '":') // Remove spaces around colons
      .replace(/,\s+/g, ',') // Remove spaces after commas
      .replace(/\s+}/g, '}') // Remove spaces before closing braces
      .replace(/\s+]/g, ']') // Remove spaces before closing brackets
      .replace(/\s+{/g, '{') // Remove spaces before opening braces
      .replace(/\s+\[/g, '['); // Remove spaces before opening brackets
    
    return compressed;
  } catch (error) {
    console.error('Compression failed:', error);
    return JSON.stringify(data);
  }
}

/**
 * Decompress data
 * @param {string} compressedData - Compressed data string
 * @returns {any} Original data
 */
export function decompressData(compressedData) {
  try {
    return JSON.parse(compressedData);
  } catch (error) {
    console.error('Decompression failed:', error);
    return null;
  }
}

/**
 * Advanced compression using LZ-string if available
 * Falls back to simple compression if LZ-string is not available
 * @param {any} data - Data to compress
 * @returns {string} Compressed data
 */
export function compressDataAdvanced(data) {
  try {
    // Try to use LZ-string if available (would need to be installed)
    if (typeof LZString !== 'undefined') {
      const jsonString = JSON.stringify(data);
      return LZString.compress(jsonString);
    }
    
    // Fallback to simple compression
    return compressData(data);
  } catch (error) {
    console.error('Advanced compression failed:', error);
    return compressData(data);
  }
}

/**
 * Advanced decompression using LZ-string if available
 * @param {string} compressedData - Compressed data
 * @returns {any} Original data
 */
export function decompressDataAdvanced(compressedData) {
  try {
    // Try to use LZ-string if available
    if (typeof LZString !== 'undefined') {
      const decompressed = LZString.decompress(compressedData);
      return JSON.parse(decompressed);
    }
    
    // Fallback to simple decompression
    return decompressData(compressedData);
  } catch (error) {
    console.error('Advanced decompression failed:', error);
    return decompressData(compressedData);
  }
}

/**
 * Estimate compression ratio
 * @param {any} originalData - Original data
 * @param {string} compressedData - Compressed data
 * @returns {Object} Compression statistics
 */
export function getCompressionStats(originalData, compressedData) {
  const originalSize = JSON.stringify(originalData).length;
  const compressedSize = compressedData.length;
  const ratio = compressedSize / originalSize;
  const savings = originalSize - compressedSize;
  const savingsPercent = (savings / originalSize) * 100;
  
  return {
    originalSize,
    compressedSize,
    ratio,
    savings,
    savingsPercent: Math.round(savingsPercent * 100) / 100
  };
}

/**
 * Compress file data with statistics
 * @param {any} data - File data to compress
 * @returns {Object} Compressed data with statistics
 */
export function compressFileData(data) {
  const compressed = compressData(data);
  const stats = getCompressionStats(data, compressed);
  
  return {
    data: compressed,
    stats,
    timestamp: Date.now()
  };
}

/**
 * Decompress file data
 * @param {Object} compressedFileData - Compressed file data object
 * @returns {any} Original data
 */
export function decompressFileData(compressedFileData) {
  if (!compressedFileData || !compressedFileData.data) {
    return null;
  }
  
  return decompressData(compressedFileData.data);
}
