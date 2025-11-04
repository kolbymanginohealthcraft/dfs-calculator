import JSZip from 'jszip';

/**
 * Extract XML files from a zip archive
 * @param {File} zipFile - The zip file to extract
 * @returns {Promise<Array<{name: string, content: string}>>} Array of extracted XML files
 */
export async function extractXmlFilesFromZip(zipFile) {
  try {
    // Handle different input types
    let fileToUse = zipFile;
    
    // If it's an ArrayBuffer, use it directly (most efficient)
    if (zipFile instanceof ArrayBuffer) {
      fileToUse = zipFile;
    }
    // If it's a File object, read it as ArrayBuffer
    else if (zipFile instanceof File) {
      fileToUse = await zipFile.arrayBuffer();
    }
    
    const zip = await JSZip.loadAsync(fileToUse);
    const xmlFiles = [];
    
    // Security limits
    const MAX_FILES = 150; // Maximum number of files to extract
    const MAX_FILE_SIZE = 1024 * 1024; // 1MB per file
    const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB total
    
    let totalSize = 0;
    let fileCount = 0;
    
    // Iterate through all files in the zip
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      // Skip directories
      if (zipEntry.dir) continue;
      
      // Security check: prevent directory traversal
      if (relativePath.includes('..') || relativePath.startsWith('/')) {
        console.warn(`Skipping potentially unsafe file: ${relativePath}`);
        continue;
      }
      
      // Check file extension
      if (!relativePath.toLowerCase().endsWith('.xml')) {
        continue;
      }
      
      // Check limits
      if (fileCount >= MAX_FILES) {
        console.warn(`Maximum file limit reached (${MAX_FILES})`);
        break;
      }
      
      if (zipEntry._data && zipEntry._data.uncompressedSize > MAX_FILE_SIZE) {
        console.warn(`File too large: ${relativePath} (${zipEntry._data.uncompressedSize} bytes)`);
        continue;
      }
      
      try {
        // Extract file content
        const content = await zipEntry.async('text');
        const fileSize = new Blob([content]).size;
        
        if (fileSize > MAX_FILE_SIZE) {
          console.warn(`Extracted file too large: ${relativePath} (${fileSize} bytes)`);
          continue;
        }
        
        totalSize += fileSize;
        if (totalSize > MAX_TOTAL_SIZE) {
          console.warn(`Total size limit reached (${MAX_TOTAL_SIZE} bytes)`);
          break;
        }
        
        xmlFiles.push({
          name: relativePath.split('/').pop(), // Get just the filename
          content: content,
          size: fileSize
        });
        
        fileCount++;
      } catch (error) {
        console.warn(`Failed to extract file ${relativePath}:`, error);
        continue;
      }
    }
    
    if (xmlFiles.length === 0) {
      throw new Error('No XML files found in the zip archive');
    }
    
    return xmlFiles;
  } catch (error) {
    if (error.message.includes('Invalid or unsupported zip format')) {
      throw new Error('Invalid zip file format. Please ensure the file is a valid zip archive.');
    }
    throw new Error(`Failed to extract zip file: ${error.message}`);
  }
}

/**
 * Check if a file is a zip file
 * @param {File} file - The file to check
 * @returns {boolean} True if the file is a zip file
 */
export function isZipFile(file) {
  return file.type === 'application/zip' || 
         file.name.toLowerCase().endsWith('.zip') ||
         file.name.toLowerCase().endsWith('.zipx');
}

/**
 * Create a File object from extracted content
 * @param {string} name - The filename
 * @param {string} content - The file content
 * @param {number} size - The file size
 * @returns {File} A File object
 */
export function createFileFromContent(name, content, size) {
  const blob = new Blob([content], { type: 'text/xml' });
  
  // Try to create a File object, but fallback to File-like object if File constructor fails
  try {
    if (typeof File !== 'undefined') {
      return new File([blob], name, { type: 'text/xml' });
    }
  } catch (error) {
    // File constructor not available or failed, create File-like object
  }
  
  // Create a File-like object that mimics the File API
  const fileLike = Object.assign(blob, {
    name: name,
    size: size || content.length,
    lastModified: Date.now(),
    webkitRelativePath: ''
  });
  
  // Ensure text() method works
  fileLike.text = async () => content;
  
  return fileLike;
}
