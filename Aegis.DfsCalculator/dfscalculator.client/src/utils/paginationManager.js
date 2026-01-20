/**
 * Pagination Manager - Handles pagination for large file lists
 */

/**
 * Create pagination state and utilities
 * @param {number} itemsPerPage - Number of items per page
 * @returns {Object} Pagination utilities
 */
export function createPaginationManager(itemsPerPage = 20) {
  let currentPage = 1;
  let totalItems = 0;
  let itemsPerPageValue = itemsPerPage;

  return {
    /**
     * Set total number of items
     * @param {number} total - Total number of items
     */
    setTotalItems: (total) => {
      totalItems = total;
    },

    /**
     * Set items per page
     * @param {number} perPage - Items per page
     */
    setItemsPerPage: (perPage) => {
      itemsPerPageValue = perPage;
    },

    /**
     * Get current page
     * @returns {number} Current page number
     */
    getCurrentPage: () => currentPage,

    /**
     * Get total pages
     * @returns {number} Total number of pages
     */
    getTotalPages: () => Math.ceil(totalItems / itemsPerPageValue),

    /**
     * Get items for current page
     * @param {Array} items - All items
     * @returns {Array} Items for current page
     */
    getCurrentPageItems: (items) => {
      const startIndex = (currentPage - 1) * itemsPerPageValue;
      const endIndex = startIndex + itemsPerPageValue;
      return items.slice(startIndex, endIndex);
    },

    /**
     * Go to specific page
     * @param {number} page - Page number
     * @returns {boolean} True if page changed
     */
    goToPage: (page) => {
      const totalPages = Math.ceil(totalItems / itemsPerPageValue);
      if (page >= 1 && page <= totalPages) {
        currentPage = page;
        return true;
      }
      return false;
    },

    /**
     * Go to next page
     * @returns {boolean} True if page changed
     */
    nextPage: () => {
      const totalPages = Math.ceil(totalItems / itemsPerPageValue);
      return this.goToPage(currentPage + 1);
    },

    /**
     * Go to previous page
     * @returns {boolean} True if page changed
     */
    prevPage: () => {
      return this.goToPage(currentPage - 1);
    },

    /**
     * Go to first page
     * @returns {boolean} True if page changed
     */
    firstPage: () => {
      return this.goToPage(1);
    },

    /**
     * Go to last page
     * @returns {boolean} True if page changed
     */
    lastPage: () => {
      const totalPages = Math.ceil(totalItems / itemsPerPageValue);
      return this.goToPage(totalPages);
    },

    /**
     * Get pagination info
     * @returns {Object} Pagination information
     */
    getPaginationInfo: () => ({
      currentPage,
      totalPages: Math.ceil(totalItems / itemsPerPageValue),
      totalItems,
      itemsPerPage: itemsPerPageValue,
      startIndex: (currentPage - 1) * itemsPerPageValue + 1,
      endIndex: Math.min(currentPage * itemsPerPageValue, totalItems),
      hasNext: currentPage < Math.ceil(totalItems / itemsPerPageValue),
      hasPrev: currentPage > 1
    }),

    /**
     * Reset pagination
     */
    reset: () => {
      currentPage = 1;
      totalItems = 0;
    }
  };
}

/**
 * Create pagination controls component data
 * @param {Object} pagination - Pagination manager instance
 * @returns {Object} Pagination controls data
 */
export function createPaginationControls(pagination) {
  const info = pagination.getPaginationInfo();
  
  return {
    ...info,
    pageNumbers: generatePageNumbers(info.currentPage, info.totalPages),
    canGoNext: info.hasNext,
    canGoPrev: info.hasPrev
  };
}

/**
 * Generate page numbers for pagination controls
 * @param {number} currentPage - Current page
 * @param {number} totalPages - Total pages
 * @param {number} maxVisible - Maximum visible page numbers
 * @returns {Array} Array of page numbers to display
 */
function generatePageNumbers(currentPage, totalPages, maxVisible = 5) {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  const pages = [];
  
  if (start > 1) {
    pages.push(1);
    if (start > 2) {
      pages.push('...');
    }
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  if (end < totalPages) {
    if (end < totalPages - 1) {
      pages.push('...');
    }
    pages.push(totalPages);
  }
  
  return pages;
}
