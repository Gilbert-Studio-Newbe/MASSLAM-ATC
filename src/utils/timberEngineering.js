/**
 * Utility functions for timber engineering calculations
 */

import { 
  validateMasslamSize, 
  getMasslamSizes,
  initializeMasslamSizes,
  loadMasslamSizes,
  checkMasslamSizesLoaded,
  findNearestWidth,
  findNearestDepth
} from './timberSizes';
import { 
  calculateFireResistanceAllowance, 
  getMasslamSL33Properties,
  loadMasslamSL33MechanicalProperties
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
  // Add ML38 as the new name for MASSLAM_SL33
  ML38: {
    bendingStrength: 38, // MPa
    tensileStrength: 19, // MPa
    compressiveStrength: 38, // MPa
    shearStrength: 5.0, // MPa
    modulusOfElasticity: 14500, // MPa
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
    const mappedProperties = {
      bendingStrength: properties['Bending Strength (f\'b)']?.value || 38,
      tensileStrength: properties['Tension Strength Parallel (f\'t)']?.value || 19,
      compressiveStrength: properties['Compression Strength Parallel (f\'c)']?.value || 38,
      shearStrength: properties['Shear Strength (f\'s)']?.value || 5.0,
      modulusOfElasticity: properties['Modulus of Elasticity (E_mean)']?.value || 14500,
      density: properties['Density (ρ_mean)']?.value || 600,
      // Add additional properties
      tensileStrengthPerpendicular: properties['Tension Strength Perpendicular (f\'t90)']?.value || 0.5,
      compressiveStrengthPerpendicular: properties['Compression Strength Perpendicular (f\'c90)']?.value || 10,
      bearingStrengthParallel: properties['Bearing Strength Parallel (f\'j)']?.value || 45,
      bearingStrengthPerpendicular: properties['Bearing Strength Perpendicular (f\'j90)']?.value || 10,
      modulusOfElasticity5thPercentile: properties['Modulus of Elasticity 5th Percentile (E_05)']?.value || 10875,
      modulusOfElasticityPerpendicular: properties['Modulus of Elasticity Perpendicular Mean (E₉₀,mean)']?.value || 960,
      modulusOfRigidity: properties['Modulus of Rigidity (G)']?.value || 960,
      jointGroup: properties['Joint Group']?.value || 'JD4',
      charringRate: properties['Charring Rate']?.value || 0.7
    };
    
    // Update both MASSLAM_SL33 and ML38 with the same properties
    TIMBER_PROPERTIES.MASSLAM_SL33 = { ...mappedProperties };
    TIMBER_PROPERTIES.ML38 = { ...mappedProperties };
    
    console.log('Loaded ML38/MASSLAM SL33 properties from CSV:', TIMBER_PROPERTIES.ML38);
    
    // For backward compatibility, update GL24 to match ML38
    // This ensures existing code using GL24 will use the correct values
    TIMBER_PROPERTIES.GL24 = { ...TIMBER_PROPERTIES.ML38 };
    
    return TIMBER_PROPERTIES.ML38;
  } catch (error) {
    console.error('Error loading timber properties:', error);
  }
}

// Initialize the module when this file is imported
console.log('timberEngineering.js: Initializing MASSLAM sizes module');
initializeMasslamSizes();

// Load MASSLAM sizes from CSV
loadMasslamSizes().then(sizes => {
  console.log(`timberEngineering.js: Loaded ${sizes.length} MASSLAM sizes from CSV`);
  if (sizes.length === 0) {
    console.warn('timberEngineering.js: Failed to load MASSLAM sizes from CSV, calculations will use fallback values');
  }
}).catch(error => {
  console.error('timberEngineering.js: Error loading MASSLAM sizes:', error);
});

// Load timber properties from CSV
loadTimberProperties().then(() => {
  console.log('timberEngineering.js: Timber properties loaded from CSV');
}).catch(error => {
  console.error('timberEngineering.js: Error loading timber properties:', error);
});

/**
 * Helper function to calculate fallback joist depth based on span
 */
function calculateFallbackJoistDepth(span) {
  // Rule of thumb: depth ≈ span(mm) / 20 for joists
  // This is a simplified approximation
  const depthMm = (span * 1000) / 20;
  
  // Round to nearest standard depth
  const standardDepths = [200, 270, 335, 410, 480, 550, 620];
  return findNearestValue(depthMm, standardDepths);
}

/**
 * Helper function to calculate fallback beam depth based on span
 */
function calculateFallbackBeamDepth(span) {
  // Rule of thumb: depth ≈ span(mm) / 15 for beams
  // This is a simplified approximation
  const depthMm = (span * 1000) / 15;
  
  // Round to nearest standard depth
  const standardDepths = [200, 270, 335, 410, 480, 550, 620];
  return findNearestValue(depthMm, standardDepths);
}

/**
 * Helper function to find the nearest value in an array
 */
function findNearestValue(target, values) {
  return values.reduce((prev, curr) => {
    return Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev;
  });
}

/**
 * Maps fire rating level (FRL) to fixed joist width
 * @param {string} fireRating - Fire rating ('none', '30/30/30', '60/60/60', '90/90/90', '120/120/120')
 * @returns {number} Fixed width in mm based on fire rating
 */
function getFixedWidthForFireRating(fireRating) {
  switch (fireRating) {
    case 'none':
      return 120; // Available in CSV
    case '30/30/30':
    case '60/60/60':
      return 165; // Available in CSV
    case '90/90/90':
      return 205; // Available in CSV (closest to 200)
    case '120/120/120':
      return 250; // Available in CSV
    default:
      return 120; // Default to 120mm if unknown rating
  }
}

/**
 * Calculate joist size based on span, spacing, and load
 */
export function calculateJoistSize(span, spacing, load, timberGrade, fireRating = 'none') {
  console.log(`Calculating joist size for span: ${span}m, spacing: ${spacing}mm, load: ${load}kPa, grade: ${timberGrade}, fire rating: ${fireRating}`);
  
  // Check if MASSLAM sizes are loaded
  const sizesLoaded = checkMasslamSizesLoaded();
  if (!sizesLoaded) {
    console.warn('MASSLAM sizes not loaded, using fallback values for joist calculation');
    // Return a fallback size with a flag indicating fallback was used
    return {
      width: getFixedWidthForFireRating(fireRating),
      depth: calculateFallbackJoistDepth(span),
      type: 'joist',
      utilization: 0.85,
      deflection: span / 300,
      usingFallback: true
    };
  }
  
  // Continue with the existing calculation logic
  // Convert spacing from mm to m for calculations
  const spacingM = spacing / 1000;
  
  // Initial load without self-weight
  let totalLoad = load;
  console.log(`Initial load (without self-weight): ${totalLoad.toFixed(2)} kPa`);
  
  // Placeholder implementation
  const spanMm = span * 1000; // Convert to mm
  
  // Get fixed width based on fire rating
  const fixedWidth = getFixedWidthForFireRating(fireRating);
  console.log(`Using fixed width of ${fixedWidth}mm based on fire rating: ${fireRating}`);
  
  // Calculate theoretical depth only (width is now fixed)
  const theoreticalDepth = Math.max(140, Math.ceil(spanMm / 15)); // Simplified calculation
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Add fire resistance allowance to depth only (width is fixed)
  // For joists, typically only bottom is exposed for depth
  const fireAdjustedDepth = theoreticalDepth + fireAllowance; // Only bottom exposed
  
  // Find the nearest available depth for the fixed width
  const depth = findNearestDepth(fixedWidth, fireAdjustedDepth);
  
  // Check if we're using fallback values
  const usingFallback = depth === fireAdjustedDepth;
  
  // Calculate self-weight based on size estimate
  // Convert dimensions to meters
  const joistWidth = fixedWidth / 1000; // m
  const joistDepth = depth / 1000; // m
  
  // Get timber density from properties (kg/m³)
  const density = TIMBER_PROPERTIES[timberGrade]?.density || 600; // Default to 600 kg/m³
  
  // Calculate joist volume per meter (m³/m)
  const joistVolumePerMeter = joistWidth * joistDepth * 1.0; // 1.0 meter length
  
  // Calculate joist weight per meter (kg/m)
  const joistWeightPerMeter = joistVolumePerMeter * density;
  
  // Convert to kN/m (1 kg = 0.00981 kN)
  const joistSelfWeightPerMeter = joistWeightPerMeter * 0.00981;
  
  // Convert linear self-weight (kN/m) to area load (kPa) based on joist spacing
  // Self-weight per square meter = self-weight per meter / spacing in meters
  const selfWeightLoad = joistSelfWeightPerMeter / spacingM;
  
  console.log(`Joist self-weight: ${joistSelfWeightPerMeter.toFixed(2)} kN/m (${selfWeightLoad.toFixed(2)} kPa)`);
  
  // Add self-weight to the total load
  totalLoad += selfWeightLoad;
  console.log(`Total load (with self-weight): ${totalLoad.toFixed(2)} kPa`);
  
  console.log(`Joist size: ${fixedWidth}x${depth}mm (fixed width based on fire rating)`);
  
  return {
    width: fixedWidth,
    depth: depth,
    span: span,
    spacing: spacing,
    load: load,
    totalLoad: totalLoad,
    selfWeight: joistSelfWeightPerMeter,
    selfWeightLoad: selfWeightLoad,
    grade: timberGrade,
    fireRating: fireRating,
    fireAllowance: fireAllowance,
    usingFallback: usingFallback // Add flag to indicate if fallback values are being used
  };
}

/**
 * Calculate beam size based on span and load
 */
export function calculateBeamSize(span, load, timberGrade, fireRating = 'none') {
  console.log(`Calculating beam size for span: ${span}m, load: ${load}kPa, grade: ${timberGrade}, fire rating: ${fireRating}`);
  
  // Check if MASSLAM sizes are loaded
  const sizesLoaded = checkMasslamSizesLoaded();
  if (!sizesLoaded) {
    console.warn('MASSLAM sizes not loaded, using fallback values for beam calculation');
    // Return a fallback size with a flag indicating fallback was used
    return {
      width: getFixedWidthForFireRating(fireRating),
      depth: calculateFallbackBeamDepth(span),
      type: 'beam',
      utilization: 0.85,
      deflection: span / 300,
      usingFallback: true
    };
  }
  
  // Continue with the existing calculation logic
  // Placeholder implementation
  const spanMm = span * 1000; // Convert to mm
  
  // Get fixed width based on fire rating
  const fixedWidth = getFixedWidthForFireRating(fireRating);
  console.log(`Using fixed width of ${fixedWidth}mm based on fire rating: ${fireRating}`);
  
  // Calculate theoretical depth only (width is now fixed)
  const theoreticalDepth = Math.max(240, Math.ceil(spanMm / 12)); // Simplified calculation
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Add fire resistance allowance to depth only (width is fixed)
  // For beams, typically only bottom is exposed for depth
  const fireAdjustedDepth = theoreticalDepth + fireAllowance; // Only bottom exposed
  
  console.log(`Beam size: ${fixedWidth}x${fireAdjustedDepth}mm (fixed width based on fire rating)`);
  
  // Find the nearest available depth for the fixed width
  const depth = findNearestDepth(fixedWidth, fireAdjustedDepth);
  
  // Check if we're using fallback values
  const usingFallback = depth === fireAdjustedDepth;
  
  return {
    width: fixedWidth,
    depth: depth,
    span: span,
    load: load,
    grade: timberGrade,
    fireRating: fireRating,
    fireAllowance: fireAllowance,
    usingFallback: usingFallback // Add flag to indicate if fallback values are being used
  };
}

/**
 * Calculate column size based on height and load
 */
export function calculateColumnSize(height, load, timberGrade, fireRating = 'none') {
  console.log(`Calculating column size for height: ${height}m, load: ${load}kN, grade: ${timberGrade}, fire rating: ${fireRating}`);
  
  // Check if MASSLAM sizes are loaded
  const sizesLoaded = checkMasslamSizesLoaded();
  if (!sizesLoaded) {
    console.warn('MASSLAM sizes not loaded, using fallback values for column calculation');
    // Return a fallback size with a flag indicating fallback was used
    return {
      width: getFixedWidthForFireRating(fireRating),
      depth: getFixedWidthForFireRating(fireRating), // For columns, use same width for depth to keep square
      type: 'column',
      utilization: 0.85,
      usingFallback: true
    };
  }
  
  // Continue with the existing calculation logic
  // Placeholder implementation
  const heightMm = height * 1000; // Convert to mm
  
  // Get fixed width based on fire rating
  const fixedWidth = getFixedWidthForFireRating(fireRating);
  console.log(`Using fixed width of ${fixedWidth}mm based on fire rating: ${fireRating}`);
  
  // For columns, we typically want square sections, so use the same value for depth
  const fixedDepth = fixedWidth;
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  console.log(`Column size: ${fixedWidth}x${fixedDepth}mm (fixed dimensions based on fire rating)`);
  
  // Check if we're using fallback values - for columns, we're always using the fixed values
  const usingFallback = false;
  
  return {
    width: fixedWidth,
    depth: fixedDepth,
    height: height,
    load: load,
    grade: timberGrade,
    fireRating: fireRating,
    fireAllowance: fireAllowance,
    usingFallback: usingFallback
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
  
  // Calculate carbon storage (carbon sequestered in the timber)
  const carbonStorage = volume * 0.9; // tonnes CO2e
  
  // Calculate embodied carbon (carbon emitted during production)
  const embodiedCarbon = volume * 0.2; // tonnes CO2e
  
  // Calculate carbon savings compared to steel/concrete
  // Steel/concrete would emit approximately 2.5 tonnes CO2e per m³
  const steelConcreteEmissions = volume * 2.5; // tonnes CO2e
  
  // Carbon savings = emissions from steel/concrete - emissions from timber
  const carbonSavings = steelConcreteEmissions - embodiedCarbon;
  
  return {
    carbonStorage,
    embodiedCarbon,
    carbonSavings,
    totalVolume: volume
  };
}

export function validateStructure(joistSize, beamSize, columnSize) {
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