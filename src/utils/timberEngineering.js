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
import { 
  calculateFireResistanceAllowance, 
  getMasslamSL33Properties,
  loadMasslamSL33MechanicalProperties,
  DEFAULT_MIN_JOIST_WIDTHS,
  loadMinJoistWidthForFRL
} from './masslamProperties';

// Initialize properties object that will be populated from CSV
export let TIMBER_PROPERTIES = {
  // Default values that will be replaced with data from CSV
  MASSLAM_SL33: {
    bendingStrength: 33, // MPa
    tensileStrength: 16, // MPa
    compressiveStrength: 26, // MPa
    shearStrength: 4.2, // MPa
    modulusOfElasticity: 13300, // MPa
    density: 600 // kg/m³
  },
  // Keep these for backward compatibility until fully migrated
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

/**
 * Load timber properties from the CSV file
 * This function should be called when the application starts
 */
export async function loadTimberProperties() {
  try {
    const properties = await loadMasslamSL33MechanicalProperties();
    
    if (!properties) {
      console.warn('Failed to load MASSLAM SL33 properties from CSV, using default values');
      return;
    }
    
    // Map CSV properties to the format expected by the application
    TIMBER_PROPERTIES.MASSLAM_SL33 = {
      bendingStrength: properties['Bending Strength (f\'b)']?.value || 33,
      tensileStrength: properties['Tension Strength Parallel (f\'t)']?.value || 16,
      compressiveStrength: properties['Compression Strength Parallel (f\'c)']?.value || 26,
      shearStrength: properties['Shear Strength (f\'s)']?.value || 4.2,
      modulusOfElasticity: properties['Modulus of Elasticity (E_mean)']?.value || 13300,
      density: properties['Density (ρ_mean)']?.value || 600,
      // Add additional properties
      tensileStrengthPerpendicular: properties['Tension Strength Perpendicular (f\'t90)']?.value || 0.5,
      compressiveStrengthPerpendicular: properties['Compression Strength Perpendicular (f\'c90)']?.value || null,
      bearingStrengthParallel: properties['Bearing Strength Parallel (f\'j)']?.value || 30,
      bearingStrengthPerpendicular: properties['Bearing Strength Perpendicular (f\'j90)']?.value || 10,
      modulusOfElasticity5thPercentile: properties['Modulus of Elasticity 5th Percentile (E_05)']?.value || 9975,
      modulusOfElasticityPerpendicular: properties['Modulus of Elasticity Perpendicular Mean (E₉₀,mean)']?.value || 890,
      modulusOfRigidity: properties['Modulus of Rigidity (G)']?.value || 900,
      jointGroup: properties['Joint Group']?.value || 'JD4',
      charringRate: properties['Charring Rate']?.value || 0.7
    };
    
    console.log('Loaded MASSLAM SL33 properties from CSV:', TIMBER_PROPERTIES.MASSLAM_SL33);
    
    // For backward compatibility, update GL24 to match MASSLAM_SL33
    // This ensures existing code using GL24 will use the correct values
    TIMBER_PROPERTIES.GL24 = { ...TIMBER_PROPERTIES.MASSLAM_SL33 };
    
    return TIMBER_PROPERTIES.MASSLAM_SL33;
  } catch (error) {
    console.error('Error loading timber properties:', error);
  }
}

// Initialize the module when this file is imported
console.log('timberEngineering.js: Initializing MASSLAM sizes module');
initializeMasslamSizes();
console.log('timberEngineering.js: Initial MASSLAM sizes:', getMasslamSizes());

// Load timber properties from CSV
loadTimberProperties().then(() => {
  console.log('timberEngineering.js: Timber properties loaded from CSV');
}).catch(error => {
  console.error('timberEngineering.js: Error loading timber properties:', error);
});

/**
 * Calculate the required joist size based on span, spacing, and load
 * This async version loads the minimum joist width from the FRL.csv file
 * 
 * @param {number} span - Span in meters
 * @param {number} spacing - Spacing in mm
 * @param {number} load - Load in kPa
 * @param {string} timberGrade - Timber grade (GL18, GL21, GL24)
 * @param {string} fireRating - Fire rating (e.g., "60/60/60", "90/90/90")
 * @returns {Promise<Object>} Calculated joist size and properties
 */
export async function calculateJoistSizeAsync(span, spacing, load, timberGrade, fireRating = 'none') {
  // Placeholder implementation
  const spanMm = span * 1000; // Convert to mm
  
  // Get minimum joist width based on FRL from the CSV file
  const minJoistWidth = await loadMinJoistWidthForFRL(fireRating);
  console.log(`Minimum joist width for FRL ${fireRating}: ${minJoistWidth}mm`);
  
  // Calculate theoretical width and depth
  // For width, use the minimum width from FRL.csv
  const theoreticalWidth = minJoistWidth;
  
  // Improved depth calculation based on span
  // For timber joists, a common rule of thumb is span/12 to span/10 for residential loads
  // For longer spans, we use a more conservative ratio to ensure adequate stiffness
  let depthRatio;
  if (span <= 4.0) {
    depthRatio = 15; // Smaller spans can use span/15
  } else if (span <= 6.0) {
    depthRatio = 12; // Medium spans use span/12
  } else {
    depthRatio = 10; // Longer spans need span/10 for adequate stiffness
  }
  
  const theoreticalDepth = Math.max(140, Math.ceil(spanMm / depthRatio));
  console.log(`Using depth ratio of 1/${depthRatio} for ${span}m span`);
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Add fire resistance allowance to depth only (width is already set based on FRL)
  // For joists, typically only 3 sides are exposed (bottom and two sides)
  const fireAdjustedWidth = theoreticalWidth; // Width is already set based on FRL
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
 * Calculate the required joist size based on span, spacing, and load
 * This synchronous version now uses the same minimum joist widths as the async version
 * 
 * @param {number} span - Span in meters
 * @param {number} spacing - Spacing in mm
 * @param {number} load - Load in kPa
 * @param {string} timberGrade - Timber grade (GL18, GL21, GL24)
 * @param {string} fireRating - Fire rating (e.g., "60/60/60", "90/90/90")
 * @returns {Object} Calculated joist size and properties
 */
export async function calculateJoistSize(span, spacing, load, timberGrade, fireRating = 'none') {
  // Get minimum joist width based on FRL from the CSV file
  const minJoistWidth = await loadMinJoistWidthForFRL(fireRating);
  console.log(`Minimum joist width for FRL ${fireRating}: ${minJoistWidth}mm`);
  
  // Calculate theoretical width and depth
  // For width, use the minimum width from FRL.csv
  const spanMm = span * 1000; // Convert to mm
  const theoreticalWidth = minJoistWidth;
  
  // Improved depth calculation based on span
  // For timber joists, a common rule of thumb is span/12 to span/10 for residential loads
  // For longer spans, we use a more conservative ratio to ensure adequate stiffness
  let depthRatio;
  if (span <= 4.0) {
    depthRatio = 15; // Smaller spans can use span/15
  } else if (span <= 6.0) {
    depthRatio = 12; // Medium spans use span/12
  } else {
    depthRatio = 10; // Longer spans need span/10 for adequate stiffness
  }
  
  const theoreticalDepth = Math.max(140, Math.ceil(spanMm / depthRatio));
  console.log(`Using depth ratio of 1/${depthRatio} for ${span}m span`);
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Add fire resistance allowance to depth only (width is already set based on FRL)
  // For joists, typically only 3 sides are exposed (bottom and two sides)
  const fireAdjustedWidth = theoreticalWidth; // Width is already set based on FRL
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