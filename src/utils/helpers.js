/**
 * Helper utilities for the application
 * 
 * Re-exports and consolidates utility functions from various modules
 */

import { saveBuildingData, getBuildingData, clearBuildingData, prepareVisualizationData } from './buildingDataStore';

// Re-export storage functions
export { saveBuildingData, getBuildingData, clearBuildingData, prepareVisualizationData };

/**
 * Format a number with specified precision
 * @param {number} num - The number to format
 * @param {number} precision - Number of decimal places
 * @returns {string} The formatted number
 */
export function formatNumber(num, precision = 1) {
  if (num === undefined || num === null) return '-';
  return Number(num).toFixed(precision);
}

/**
 * Check if the app is running on a mobile device
 * @returns {boolean} True if on mobile
 */
export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/**
 * Parse a value to ensure it's a valid number
 * @param {any} value - The value to parse
 * @param {number} defaultValue - Default value to return if parsing fails
 * @returns {number} The parsed number or default value
 */
export function parseNumeric(value, defaultValue = 0) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
} 