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
  MASSLAM_SL33: {
    bendingStrength: 33, // MPa
    tensileStrength: 16, // MPa
    compressiveStrength: 26, // MPa
    shearStrength: 4.2, // MPa
    modulusOfElasticity: 13300, // MPa
    density: 600 // kg/m³
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
 * @param {string} timberGrade - Timber grade (MASSLAM_SL33)
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
 * @param {string} timberGrade - Timber grade (MASSLAM_SL33)
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
 * @param {string} timberGrade - Timber grade (MASSLAM_SL33)
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

export function calculateTimberWeight(joistSize, beamSize, columnSize, buildingLength, buildingWidth, numFloors, lengthwiseBays = 3, widthwiseBays = 2, joistsRunLengthwise = true, timberGrade = 'GL18') {
  // If called with just volume and timberGrade (for testing or simple cases)
  if (typeof joistSize === 'number' && (typeof beamSize === 'string' || beamSize === undefined)) {
    const volume = joistSize;
    const grade = beamSize || timberGrade;
    const density = TIMBER_PROPERTIES[grade]?.density || 600; // kg/m³
    return volume * density; // kg
  }
  
  // Calculate the number of structural elements
  const joistSpacing = 0.8; // 800mm spacing in meters
  
  // Calculate bay dimensions
  const bayLengthWidth = buildingLength / lengthwiseBays; // Width of each bay in the length direction
  const bayWidthWidth = buildingWidth / widthwiseBays; // Width of each bay in the width direction
  
  // Calculate number of joists
  // Joists run perpendicular to beams
  // If joists run lengthwise, they span across the width of each bay
  // If joists run widthwise, they span across the length of each bay
  // Using the joistsRunLengthwise parameter passed from the caller
  
  let numJoistsPerBay;
  let joistLength;
  
  if (joistsRunLengthwise) {
    // Joists run lengthwise, spanning across the width of each bay
    numJoistsPerBay = Math.ceil(bayWidthWidth / joistSpacing) + 1; // Add 1 for the end joist
    joistLength = bayLengthWidth;
  } else {
    // Joists run widthwise, spanning across the length of each bay
    numJoistsPerBay = Math.ceil(bayLengthWidth / joistSpacing) + 1; // Add 1 for the end joist
    joistLength = bayWidthWidth;
  }
  
  // Total number of joists = joists per bay * number of bays * number of floors
  const totalJoists = numJoistsPerBay * lengthwiseBays * widthwiseBays * numFloors;
  
  // Calculate joist volume
  const joistWidth = joistSize.width / 1000; // Convert mm to m
  const joistDepth = joistSize.depth / 1000; // Convert mm to m
  const joistVolume = joistWidth * joistDepth * joistLength * totalJoists;
  
  // Calculate number of beams - beams should only run perpendicular to joists
  let totalBeams;
  let beamVolume;
  
  if (joistsRunLengthwise) {
    // If joists run lengthwise, beams should only run widthwise
    const numWidthwiseBeams = (lengthwiseBays + 1) * widthwiseBays;
    totalBeams = numWidthwiseBeams * numFloors;
    
    // Calculate beam volume - only widthwise beams
    const beamWidth = beamSize.width / 1000; // Convert mm to m
    const beamDepth = beamSize.depth / 1000; // Convert mm to m
    const widthwiseBeamLength = bayWidthWidth;
    beamVolume = beamWidth * beamDepth * (numWidthwiseBeams * widthwiseBeamLength) * numFloors;
  } else {
    // If joists run widthwise, beams should only run lengthwise
    const numLengthwiseBeams = (widthwiseBays + 1) * lengthwiseBays;
    totalBeams = numLengthwiseBeams * numFloors;
    
    // Calculate beam volume - only lengthwise beams
    const beamWidth = beamSize.width / 1000; // Convert mm to m
    const beamDepth = beamSize.depth / 1000; // Convert mm to m
    const lengthwiseBeamLength = bayLengthWidth;
    beamVolume = beamWidth * beamDepth * (numLengthwiseBeams * lengthwiseBeamLength) * numFloors;
  }
  
  // Calculate number of columns
  // Columns are at the intersections of grid lines
  // Number of columns = (lengthwiseBays + 1) * (widthwiseBays + 1)
  const totalColumns = (lengthwiseBays + 1) * (widthwiseBays + 1);
  
  // Calculate column volume
  const columnWidth = columnSize.width / 1000; // Convert mm to m
  const columnDepth = columnSize.depth / 1000; // Convert mm to m
  const columnHeight = columnSize.height; // Already in m
  const columnVolume = columnWidth * columnDepth * columnHeight * totalColumns;
  
  // Total volume
  const totalVolume = joistVolume + beamVolume + columnVolume;
  
  // Calculate weight using density
  const density = TIMBER_PROPERTIES[timberGrade]?.density || 600; // kg/m³
  const weight = totalVolume * density;
  
  // Return an object with detailed information
  return {
    weight,
    totalVolume,
    elements: {
      joists: {
        count: totalJoists,
        volume: joistVolume
      },
      beams: {
        count: totalBeams,
        volume: beamVolume
      },
      columns: {
        count: totalColumns,
        volume: columnVolume
      }
    }
  };
}

export function calculateCarbonSavings(weightOrResult) {
  let volume;
  
  // Check if we received the full result object from calculateTimberWeight
  if (typeof weightOrResult === 'object' && weightOrResult !== null && weightOrResult.totalVolume) {
    volume = weightOrResult.totalVolume;
  } else {
    // If we received just the weight (in kg), convert to volume (m³) using average density
    const averageDensity = 600; // kg/m³
    volume = weightOrResult / averageDensity;
  }
  
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