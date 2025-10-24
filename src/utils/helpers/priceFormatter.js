// Simple utility functions for price formatting

/**
 * Format price to Indonesian Rupiah format for display only
 * @param {number} price - The price to format
 * @returns {string} - Formatted price string (e.g., "100.000,00")
 */
export const formatPrice = (price) => {
  if (price === null || price === undefined || isNaN(price) || price === 0) {
    return '0,00';
  }

  // Convert to number and round to 2 decimal places
  const numPrice = parseFloat(price);
  
  // Simple formatting: add thousand separators and decimal places
  const parts = numPrice.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${integerPart},${parts[1]}`;
};

/**
 * Format price with currency symbol for display only
 * @param {number} price - The price to format
 * @returns {string} - Formatted price with Rp prefix (e.g., "Rp 100.000,00")
 */
export const formatPriceWithCurrency = (price) => {
  return `Rp ${formatPrice(price)}`;
};
