/**
 * Utility functions for timber engineering calculations
 */

import { 
  findNearestWidth, 
  findNearestDepth, 
  validateMasslamSize,
  getMasslamSizes,
  initializeMasslamSizes
} from './timberSizes';
import { calculateFireResistanceAllowance } from './masslamProperties';

// Constants
export const TIMBER_PROPERTIES = {
  GL18: {
    bendingStrength: 18, // MPa
    tensileStrength: 11, // MPa
    compressiveStrength: 18, // MPa
    shearStrength: 3.5, // MPa
    modulusOfElasticity: 11500, // MPa
    density: 600 // kg/m³
  },
  GL21: {
    bendingStrength: 21, // MPa
    tensileStrength: 13, // MPa
    compressiveStrength: 21, // MPa
    shearStrength: 3.8, // MPa
    modulusOfElasticity: 13000, // MPa
    density: 650 // kg/m³
  },
  GL24: {
    bendingStrength: 24, // MPa
    tensileStrength: 16, // MPa
    compressiveStrength: 24, // MPa
    shearStrength: 4.0, // MPa
    modulusOfElasticity: 14500, // MPa
    density: 700 // kg/m³
  }
};

// Initialize the module when this file is imported
console.log('timberEngineering.js: Initializing MASSLAM sizes module');
initializeMasslamSizes();
console.log('timberEngineering.js: Initial MASSLAM sizes:', getMasslamSizes());

/**
 * Calculate the required joist size based on span, spacing, and load
 * 
 * @param {number} span - Span in meters
 * @param {number} spacing - Spacing in mm
 * @param {number} load - Load in kPa
 * @param {string} timberGrade - Timber grade (GL18, GL21, GL24)
 * @param {string} fireRating - Fire rating (e.g., "60/60/60", "90/90/90")
 * @returns {Object} Calculated joist size and properties
 */
export function calculateJoistSize(span, spacing, load, timberGrade, fireRating = 'none') {
  // Placeholder implementation
  const spanMm = span * 1000; // Convert to mm
  
  // Calculate theoretical width and depth
  const theoreticalWidth = Math.max(45, Math.ceil(spanMm / 30)); // Simplified calculation
  const theoreticalDepth = Math.max(140, Math.ceil(spanMm / 15)); // Simplified calculation
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Add fire resistance allowance to width and depth
  // For joists, typically only 3 sides are exposed (bottom and two sides)
  const fireAdjustedWidth = theoreticalWidth + (2 * fireAllowance); // Both sides exposed
  const fireAdjustedDepth = theoreticalDepth + fireAllowance; // Only bottom exposed
  
  console.log(`Joist size before fire adjustment: ${theoreticalWidth}x${theoreticalDepth}mm`);
  console.log(`Joist size after fire adjustment: ${fireAdjustedWidth}x${fireAdjustedDepth}mm`);
  
  // Find the nearest available width and depth
  const width = findNearestWidth(fireAdjustedWidth);
  const depth = findNearestDepth(width, fireAdjustedDepth);
  
  return {
    width: width,
    depth: depth,
    span: span,
    spacing: spacing,
    load: load,
    grade: timberGrade,
    fireRating: fireRating,
    fireAllowance: fireAllowance
  };
}

/**
 * Calculate the required beam size based on span and load
 * 
 * @param {number} span - Span in meters
 * @param {number} load - Load in kPa
 * @param {string} timberGrade - Timber grade (GL18, GL21, GL24)
 * @param {string} fireRating - Fire rating (e.g., "60/60/60", "90/90/90")
 * @returns {Object} Calculated beam size and properties
 */
export function calculateBeamSize(span, load, timberGrade, fireRating = 'none') {
  // Placeholder implementation
  const spanMm = span * 1000; // Convert to mm
  
  // Calculate theoretical width and depth
  const theoreticalWidth = Math.max(65, Math.ceil(spanMm / 25)); // Simplified calculation
  const theoreticalDepth = Math.max(240, Math.ceil(spanMm / 12)); // Simplified calculation
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Add fire resistance allowance to width and depth
  // For beams, typically 3 sides are exposed (bottom and two sides)
  const fireAdjustedWidth = theoreticalWidth + (2 * fireAllowance); // Both sides exposed
  const fireAdjustedDepth = theoreticalDepth + fireAllowance; // Only bottom exposed
  
  console.log(`Beam size before fire adjustment: ${theoreticalWidth}x${theoreticalDepth}mm`);
  console.log(`Beam size after fire adjustment: ${fireAdjustedWidth}x${fireAdjustedDepth}mm`);
  
  // Find the nearest available width and depth
  const width = findNearestWidth(fireAdjustedWidth);
  const depth = findNearestDepth(width, fireAdjustedDepth);
  
  return {
    width: width,
    depth: depth,
    span: span,
    load: load,
    grade: timberGrade,
    fireRating: fireRating,
    fireAllowance: fireAllowance
  };
}

/**
 * Calculate the required column size based on height and load
 * 
 * @param {number} height - Height in meters
 * @param {number} load - Load in kN
 * @param {string} timberGrade - Timber grade (GL18, GL21, GL24)
 * @param {string} fireRating - Fire rating (e.g., "60/60/60", "90/90/90")
 * @returns {Object} Calculated column size and properties
 */
export function calculateColumnSize(height, load, timberGrade, fireRating = 'none') {
  // Placeholder implementation
  const heightMm = height * 1000; // Convert to mm
  
  // Calculate theoretical width and depth
  const theoreticalWidth = Math.max(90, Math.ceil(Math.sqrt(load) * 20)); // Simplified calculation
  const theoreticalDepth = theoreticalWidth; // Square columns for simplicity
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Add fire resistance allowance to width and depth
  // For columns, all 4 sides are exposed
  const fireAdjustedWidth = theoreticalWidth + (2 * fireAllowance); // Both sides exposed
  const fireAdjustedDepth = theoreticalDepth + (2 * fireAllowance); // Both sides exposed
  
  console.log(`Column size before fire adjustment: ${theoreticalWidth}x${theoreticalDepth}mm`);
  console.log(`Column size after fire adjustment: ${fireAdjustedWidth}x${fireAdjustedDepth}mm`);
  
  // Find the nearest available width and depth
  const width = findNearestWidth(fireAdjustedWidth);
  const depth = findNearestDepth(width, fireAdjustedDepth);
  
  return {
    width: width,
    depth: depth,
    height: height,
    load: load,
    grade: timberGrade,
    fireRating: fireRating,
    fireAllowance: fireAllowance
  };
}

export function calculateTimberWeight(volume, timberGrade) {
  // Placeholder implementation
  const density = TIMBER_PROPERTIES[timberGrade]?.density || 600; // kg/m³
  return volume * density; // kg
}

export function calculateCarbonSavings(volume) {
  // Placeholder implementation - approx 0.9 tonnes CO2e per m³ of timber
  return volume * 0.9; // tonnes CO2e
}

export function validateStructure(joists, beams, columns) {
  // Placeholder implementation
  return { valid: true, messages: [] };
}

/**
 * DEPRECATED: This object is no longer used. All timber sizes are now loaded from the CSV file.
 * Keeping this commented out for reference only.
 */
/*
export const TIMBER_SIZE_OPTIONS = {
  joists: {
    widths: [35, 45, 70, 90],
    depths: [140, 190, 240, 290, 340],
    description: "Standard joist sizes for floor and roof applications",
    notes: "Larger depths available for longer spans"
  },
  beams: {
    widths: [65, 85, 135, 185, 240],
    depths: [240, 290, 340, 390, 450, 500, 600],
    description: "Glulam beam sizes for structural applications",
    notes: "Custom sizes available upon request"
  },
  posts: {
    widths: [90, 115, 135, 185, 240],
    depths: [90, 115, 135, 185, 240],
    description: "Square and rectangular post sections",
    notes: "Square sections recommended for axial loads"
  },
  studs: {
    widths: [70, 90, 140],
    depths: [35, 45],
    description: "Wall framing studs",
    notes: "90mm depth recommended for external walls"
  },
  rafters: {
    widths: [35, 45, 70],
    depths: [140, 190, 240],
    description: "Roof rafter sections",
    notes: "Larger sections may be required for snow loads"
  }
};
*/

/**
 * DEPRECATED: This function is no longer used. All timber sizes are now loaded from the CSV file.
 * Use getMasslamSizesByType() instead.
 */
/*
export function getTimberSizeOptions(application) {
  return TIMBER_SIZE_OPTIONS[application] || null;
}
*/

/**
 * Get available timber sizes for a specific application
 * This function now uses the CSV data instead of hardcoded values
 * 
 * @param {string} application - Application type ("joist", "beam", or "post")
 * @returns {Object|null} Size options or null if not found
 */
export function getTimberSizeOptions(application) {
  const sizes = getMasslamSizes();
  
  if (sizes.length === 0) {
    console.warn('MASSLAM sizes not loaded yet, cannot get timber size options');
    return { widths: [], depths: [] };
  }
  
  // Filter sizes by application type (singular form)
  const applicationType = application.endsWith('s') 
    ? application.slice(0, -1) // Remove trailing 's'
    : application;
  
  const filteredSizes = sizes.filter(size => size.type === applicationType);
  
  if (filteredSizes.length === 0) {
    console.warn(`No sizes found for application type: ${applicationType}`);
    return { widths: [], depths: [] };
  }
  
  // Extract unique widths and depths
  const widths = [...new Set(filteredSizes.map(size => size.width))].sort((a, b) => a - b);
  const depths = [...new Set(filteredSizes.map(size => size.depth))].sort((a, b) => a - b);
  
  return {
    widths,
    depths,
    description: `Standard ${application} sizes for structural applications`,
    notes: "Sizes loaded from masslam_sizes.csv"
  };
}