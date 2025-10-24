/**
 * IndexedDB Manager - Handles persistent storage for file data
 */

const DB_NAME = 'DFSViewerDB';
const DB_VERSION = 1;
const STORE_NAME = 'fileData';

let db = null;

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>} Database instance
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB failed to open:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('fileId', 'fileId', { unique: true });
      }
    };
  });
}

/**
 * Store file data in IndexedDB
 * @param {string} fileId - File identifier
 * @param {Object} data - Data to store
 * @returns {Promise<void>}
 */
export async function storeInIndexedDB(fileId, data) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const item = {
      id: fileId,
      fileId,
      data,
      timestamp: Date.now()
    };
    
    await new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to store in IndexedDB:', error);
    throw error;
  }
}

/**
 * Retrieve file data from IndexedDB
 * @param {string} fileId - File identifier
 * @returns {Promise<Object|null>} Stored data or null if not found
 */
export async function getFromIndexedDB(fileId) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(fileId);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get from IndexedDB:', error);
    return null;
  }
}

/**
 * Remove file data from IndexedDB
 * @param {string} fileId - File identifier
 * @returns {Promise<void>}
 */
export async function removeFromIndexedDB(fileId) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = store.delete(fileId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to remove from IndexedDB:', error);
  }
}

/**
 * Clear all data from IndexedDB
 * @returns {Promise<void>}
 */
export async function clearIndexedDB() {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to clear IndexedDB:', error);
  }
}

/**
 * Get all stored file IDs
 * @returns {Promise<string[]>} Array of file IDs
 */
export async function getAllFileIds() {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get file IDs:', error);
    return [];
  }
}

/**
 * Get storage usage statistics
 * @returns {Promise<Object>} Storage statistics
 */
export async function getStorageStats() {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => {
        resolve({
          fileCount: request.result,
          storeName: STORE_NAME,
          dbName: DB_NAME
        });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return { fileCount: 0, storeName: STORE_NAME, dbName: DB_NAME };
  }
}

/**
 * Check if IndexedDB is available
 * @returns {boolean} True if IndexedDB is available
 */
export function isIndexedDBAvailable() {
  return typeof indexedDB !== 'undefined';
}
