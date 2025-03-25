/**
 * timber-calculator.js - Main API for timber calculations
 * Integrates the separate joist, beam, and column calculators
 */

// Import functionality from individual calculators
import { calculateJoistSize, calculateJoistVolume } from './calculations/joist-calculator';
import { calculateBeamSize, calculateMultiFloorBeamSize, calculateBeamVolume } from './calculations/beam-calculator';
import { calculateColumnSize, calculateMultiFloorColumnSize, calculateColumnVolume } from './calculations/column-calculator';

// Import utilities
import { initializeTimberUtils, TIMBER_PROPERTIES } from './timber-utils';
import { calculateCost } from './costEstimator';

// Re-export all calculator functions
export {
  calculateJoistSize,
  calculateBeamSize,
  calculateColumnSize,
  calculateMultiFloorBeamSize,
  calculateMultiFloorColumnSize,
  calculateJoistVolume,
  calculateBeamVolume,
  calculateColumnVolume
};

// Add a test function to debug joist calculations with a 9m span
export function test9mJoistCalculation() {
  console.log("==== TESTING 9M JOIST CALCULATION ====");
  const span = 9;
  const spacing = 800;
  const load = 2;
  const timberGrade = 'ML38';
  const fireRating = 'none';
  const deflectionLimit = 300;
  const safetyFactor = 1.5;

  const result = calculateJoistSize(
    span,
    spacing,
    load,
    timberGrade,
    fireRating,
    deflectionLimit,
    safetyFactor
  );

  console.log('\nRESULT:');
  console.log(`Width: ${result.width}mm`);
  console.log(`Depth: ${result.depth}mm`);
  console.log(`Governing: ${result.isDeflectionGoverning ? 'Deflection' : 'Bending'}`);
  console.log(`Bending depth required: ${result.bendingDepth}mm`);
  console.log(`Deflection depth required: ${result.deflectionDepth}mm`);
  console.log(`Fire adjusted depth: ${result.fireAdjustedDepth}mm`);
  
  // Log the full result object
  console.log('\nFULL RESULT OBJECT:');
  console.log(JSON.stringify(result, null, 2));

  const expectedDepth = 480;
  if (result.depth === expectedDepth) {
    console.log(`\n✅ SUCCESS: Joist depth matches expected value of ${expectedDepth}mm`);
  } else {
    console.log(`\n❌ FAILURE: Expected depth of ${expectedDepth}mm but got ${result.depth}mm`);
  }
  console.log("==== END OF TEST ====");
  
  return result;
}

/**
 * Calculate cost estimate for the structure
 * @param {Object} result - Result object from calculateStructure or calculateTimberWeight
 * @param {Object} joistSize - Joist dimensions for rate lookup
 * @returns {Object} - Cost breakdown and total
 */
export function calculateCostEstimate(result, joistSize) {
  // Create the volumes object expected by calculateCost
  const volumes = {
    beamVolume: result.elementVolumes?.beams || 0,
    columnVolume: result.elementVolumes?.columns || 0,
    joistArea: result.elementVolumes?.joistArea || 0 // Use the calculated joistArea instead of joistVolume
  };
  
  console.log("[COST] Calculating costs with volumes:", volumes);
  console.log("[COST] Using joist size for rate lookup:", joistSize);
  
  // Calculate costs with the volumes and joist size (for specific rate lookup)
  return calculateCost(volumes, joistSize);
}

/**
 * Calculate structure dimensions for a complete building
 * @param {Object} buildingData - Building data object with dimensions and parameters
 * @returns {Object} Calculated dimensions for joists, beams, and columns
 */
export function calculateStructure(buildingData) {
  // Log COMPLETE building data for debugging
  console.log("[STRUCTURE DEBUG] ====== FULL BUILDING DATA RECEIVED ======");
  console.log(JSON.stringify(buildingData, null, 2));
  console.log("[STRUCTURE DEBUG] ======================================");
  
  const {
    buildingLength,
    buildingWidth,
    joistsRunLengthwise,
    joistSpacing,
    load,
    timberGrade,
    fireRating,
    numFloors = 1,
    floorHeight = 3.0,
    lengthwiseBays: numLengthwiseBays = 1,
    widthwiseBays: numWidthwiseBays = 1
  } = buildingData;
  
  // Get calculation parameters from buildingData or use defaults
  const calculationParams = buildingData.calculationParams || {};
  const deflectionLimit = buildingData.deflectionLimit || calculationParams.allowableDeflection || 300; // Default L/300
  const safetyFactor = buildingData.safetyFactor || calculationParams.safetyFactor || 1.5; // Default 1.5
  
  console.log('[STRUCTURE] Starting structural calculations for building:', {
    length: buildingLength,
    width: buildingWidth, 
    joists: joistsRunLengthwise ? 'lengthwise' : 'widthwise',
    spacing: joistSpacing,
    deflectionLimit: `L/${deflectionLimit}`,
    safetyFactor,
    calculationParams: calculationParams
  });
  
  // Calculate bay dimensions
  const customLengthwiseBayWidths = buildingData.customLengthwiseBayWidths || [];
  const customWidthwiseBayWidths = buildingData.customWidthwiseBayWidths || [];
  
  // Calculate average bay dimensions
  let avgBayWidth, avgBayLength;
  
  if (buildingData.useCustomBayDimensions && customLengthwiseBayWidths.length > 0 && customWidthwiseBayWidths.length > 0) {
    avgBayWidth = customWidthwiseBayWidths.reduce((sum, width) => sum + width, 0) / customWidthwiseBayWidths.length;
    avgBayLength = customLengthwiseBayWidths.reduce((sum, width) => sum + width, 0) / customLengthwiseBayWidths.length;
  } else {
    avgBayWidth = buildingWidth / numWidthwiseBays;
    avgBayLength = buildingLength / numLengthwiseBays;
  }
  
  // Calculate max bay spans
  const maxLengthwiseBayWidth = customLengthwiseBayWidths.length > 0 
    ? Math.max(...customLengthwiseBayWidths) 
    : avgBayLength;
    
  const maxWidthwiseBayWidth = customWidthwiseBayWidths.length > 0 
    ? Math.max(...customWidthwiseBayWidths) 
    : avgBayWidth;
  
  // Calculate joist spans based on joist direction
  // When joists run lengthwise, they span across the width of the building
  // When joists run widthwise, they span across the length of the building
  const joistSpan = joistsRunLengthwise ? maxWidthwiseBayWidth : maxLengthwiseBayWidth;
  
  console.log(`[STRUCTURE] Joist span: ${joistSpan.toFixed(2)}m based on ${joistsRunLengthwise ? 'widthwise' : 'lengthwise'} bay direction`);
  console.log(`[STRUCTURE DEBUG] Derived Joist Span Calculation:
    - joistsRunLengthwise: ${joistsRunLengthwise}
    - maxWidthwiseBayWidth: ${maxWidthwiseBayWidth}
    - maxLengthwiseBayWidth: ${maxLengthwiseBayWidth}
    - avgBayWidth: ${avgBayWidth}
    - avgBayLength: ${avgBayLength}
    - widthwiseBays count: ${numWidthwiseBays}
    - lengthwiseBays count: ${numLengthwiseBays}
    - Final joistSpan: ${joistSpan}
  `);
  
  // Check if span exceeds maximum
  if (joistSpan > buildingData.maxBaySpan) {
    console.error(`[STRUCTURE] The joist span (${joistSpan.toFixed(2)}m) exceeds the maximum allowable span (${buildingData.maxBaySpan.toFixed(2)}m)`);
  }
  
  console.log(`[STRUCTURE DEBUG] About to call calculateJoistSize with:
    - joistSpan: ${joistSpan}
    - joistSpacing: ${joistSpacing * 1000} (converting from m to mm)
    - load: ${load}
    - timberGrade: ${timberGrade}
    - fireRating: ${fireRating}
    - deflectionLimit: ${deflectionLimit}
    - safetyFactor: ${safetyFactor}
  `);
  
  // Calculate joist size, passing user-specified deflection limit and safety factor
  // Note: joistSpacing is converted from m to mm for the calculation
  const joistSize = calculateJoistSize(
    joistSpan, 
    joistSpacing * 1000, // Convert to mm for the calculation
    load, 
    timberGrade,
    fireRating,
    deflectionLimit,
    safetyFactor
  );
  
  console.log(`[STRUCTURE DEBUG] Joist calculation result:
    - width: ${joistSize.width}
    - depth: ${joistSize.depth}
    - span used: ${joistSize.span}
    - isDeflectionGoverning: ${joistSize.isDeflectionGoverning}
    - bendingDepth: ${joistSize.bendingDepth}
    - deflectionDepth: ${joistSize.deflectionDepth}
    - fireAdjustedDepth: ${joistSize.fireAdjustedDepth}
  `);
  
  // Calculate beam span based on joist direction
  const beamSpan = joistsRunLengthwise ? maxLengthwiseBayWidth : maxWidthwiseBayWidth;
  
  console.log(`[STRUCTURE] Beam span: ${beamSpan.toFixed(2)}m based on ${joistsRunLengthwise ? 'lengthwise' : 'widthwise'} bay direction`);
  
  // Check if beam span exceeds maximum
  if (beamSpan > buildingData.maxBaySpan) {
    console.error(`[STRUCTURE] The beam span (${beamSpan.toFixed(2)}m) exceeds the maximum allowable span (${buildingData.maxBaySpan.toFixed(2)}m)`);
  }
  
  // Calculate beam sizes
  const interiorBeamSize = calculateMultiFloorBeamSize(
    beamSpan, 
    load, 
    joistSpacing * 1000, // Convert to mm
    numFloors,
    fireRating,
    joistsRunLengthwise,
    avgBayWidth,
    avgBayLength,
    false, // interior beam
    deflectionLimit, // Pass user-specified deflection limit
    safetyFactor    // Pass the provided safety factor
  );
  
  const edgeBeamSize = calculateMultiFloorBeamSize(
    beamSpan, 
    load, 
    joistSpacing * 1000, // Convert to mm
    numFloors,
    fireRating,
    joistsRunLengthwise,
    avgBayWidth,
    avgBayLength,
    true, // edge beam
    deflectionLimit, // Pass user-specified deflection limit
    safetyFactor    // Pass the provided safety factor
  );
  
  // Calculate tributary area for columns
  const tributaryArea = avgBayWidth * avgBayLength;
  
  // Calculate column size
  const columnSize = calculateMultiFloorColumnSize(
    floorHeight,
    load,
    numFloors,
    tributaryArea,
    fireRating,
    interiorBeamSize.width // Pass the beam width to ensure column width matches
  );
  
  // Log the column-beam width relationship
  console.log(`[STRUCTURE] Column width (${columnSize.width}mm) set to match beam width (${interiorBeamSize.width}mm)`);
  
  // Calculate volumes and element counts
  // Calculate joist volume (cubic meters) using the utility function
  const joistVolume = calculateJoistVolume(
    joistSize,
    buildingLength,
    buildingWidth,
    joistSpacing,
    joistsRunLengthwise
  );
  
  // Calculate number of joists based on dimensions and spacing
  let joistCount;
  if (joistsRunLengthwise) {
    joistCount = Math.ceil(buildingWidth / joistSpacing);
  } else {
    joistCount = Math.ceil(buildingLength / joistSpacing);
  }
  joistCount = joistCount * numFloors; // Multiply by number of floors
  
  // Calculate beam volume
  const beamVolume = calculateBeamVolume(
    interiorBeamSize,
    edgeBeamSize,
    buildingLength,
    buildingWidth,
    numLengthwiseBays,
    numWidthwiseBays,
    joistsRunLengthwise
  );
  
  // Calculate number of beams
  let beamCount;
  if (joistsRunLengthwise) {
    // Beams run widthwise only
    beamCount = (numLengthwiseBays + 1) * numWidthwiseBays;
  } else {
    // Beams run lengthwise only
    beamCount = (numWidthwiseBays + 1) * numLengthwiseBays;
  }
  beamCount = beamCount * numFloors; // Multiply by number of floors
  
  // Calculate column volume
  const columnVolume = calculateColumnVolume(
    columnSize,
    buildingLength,
    buildingWidth,
    numLengthwiseBays,
    numWidthwiseBays,
    floorHeight,
    numFloors
  );
  
  // Calculate number of columns
  const columnCount = (numLengthwiseBays + 1) * (numWidthwiseBays + 1) * numFloors;
  
  // Calculate total timber volume
  const totalTimberVolume = joistVolume + beamVolume + columnVolume;
  
  // Calculate timber weight using density from timber properties
  const density = TIMBER_PROPERTIES[timberGrade]?.density || 600; // kg/m³
  const timberWeight = totalTimberVolume * density;
  
  // Calculate joist area in square meters (m²)
  const joistArea = buildingLength * buildingWidth * numFloors;
  
  // Return all calculated sizes
  const result = {
    joistSize: {
      ...joistSize,
      // Ensure we're returning all the calculation parameters for display in the UI
      span: joistSpan,  // Use the calculated span from building dimensions
      spacing: joistSpacing,
      load,
      grade: timberGrade,
      safetyFactor,
      deflectionLimit,
      // Update timestamp to force refresh
      calculatedAt: new Date().toISOString()
    },
    beamSize: interiorBeamSize,
    edgeBeamSize,
    columnSize,
    // Add volume and count information for materials summary
    elementVolumes: {
      joists: joistVolume,
      beams: beamVolume,
      columns: columnVolume,
      joistArea: joistArea // Add joistArea to elementVolumes
    },
    elementCounts: {
      joists: joistCount,
      beams: beamCount,
      columns: columnCount
    },
    timberVolume: totalTimberVolume,
    timberWeight: timberWeight
  };
  
  // Calculate cost estimate
  const costs = calculateCostEstimate(result, joistSize);
  result.costs = costs;
  
  console.log("[STRUCTURE DEBUG] Final result object being returned:");
  console.log(JSON.stringify(result, null, 2));
  
  return result;
}

/**
 * Calculate timber weight and volume for a building
 * @param {Object} joistSize - Joist dimensions
 * @param {Object} beamSize - Beam dimensions
 * @param {Object} columnSize - Column dimensions
 * @param {Object} buildingData - Building data with dimensions
 * @returns {Object} Weight and volume information
 */
export function calculateTimberWeight(joistSize, beamSize, edgeBeamSize, columnSize, buildingData) {
  console.log('[WEIGHT] Calculating timber weight for building');
  
  const {
    buildingLength,
    buildingWidth,
    joistSpacing,
    joistsRunLengthwise,
    lengthwiseBays,
    widthwiseBays,
    numFloors = 1,
    floorHeight = 3.0
  } = buildingData;
  
  // Calculate joist volume
  const joistVolume = calculateJoistVolume(
    joistSize,
    buildingLength,
    buildingWidth,
    joistSpacing,
    joistsRunLengthwise
  );
  
  // Calculate beam volume
  const beamVolume = calculateBeamVolume(
    beamSize,
    edgeBeamSize,
    buildingLength,
    buildingWidth,
    lengthwiseBays,
    widthwiseBays,
    joistsRunLengthwise
  );
  
  // Calculate column volume
  const columnVolume = calculateColumnVolume(
    columnSize,
    buildingLength,
    buildingWidth,
    lengthwiseBays,
    widthwiseBays,
    floorHeight,
    numFloors
  );
  
  // Calculate total volume
  const totalVolume = joistVolume + beamVolume + columnVolume;
  
  // Calculate weight using material density
  const density = TIMBER_PROPERTIES.ML38.density; // kg/m³
  const weight = totalVolume * density;
  
  // Return detailed results
  return {
    weight, // kg
    totalVolume, // m³
    elements: {
      joists: {
        volume: joistVolume,
        weight: joistVolume * density,
        dimensions: `${joistSize.width}×${joistSize.depth}mm`
      },
      beams: {
        volume: beamVolume,
        weight: beamVolume * density,
        dimensions: {
          interior: `${beamSize.width}×${beamSize.depth}mm`,
          edge: `${edgeBeamSize.width}×${edgeBeamSize.depth}mm`
        }
      },
      columns: {
        volume: columnVolume,
        weight: columnVolume * density,
        dimensions: `${columnSize.width}×${columnSize.depth}mm`
      }
    }
  };
}

/**
 * Calculate carbon savings compared to traditional construction methods
 * @param {Object|number} weightOrResult - Either weight in kg or result from calculateTimberWeight
 * @returns {Object} Carbon savings information
 */
export function calculateCarbonSavings(weightOrResult) {
  let volume;
  
  // Check if we received the full result object or just weight
  if (typeof weightOrResult === 'object' && weightOrResult !== null && weightOrResult.totalVolume) {
    volume = weightOrResult.totalVolume;
  } else if (typeof weightOrResult === 'number') {
    // If we received just the weight (in kg), convert to volume (m³) using average density
    const averageDensity = 600; // kg/m³
    volume = weightOrResult / averageDensity;
  } else {
    // Handle invalid input
    console.warn("[CARBON] Invalid input to calculateCarbonSavings:", weightOrResult);
    volume = 0;
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
    carbonStorage: Number(carbonStorage.toFixed(2)) || 0,
    embodiedCarbon: Number(embodiedCarbon.toFixed(2)) || 0,
    carbonSavings: Number(carbonSavings.toFixed(2)) || 0,
    totalVolume: Number(volume.toFixed(2)) || 0
  };
}

// Initialize the module
initializeTimberUtils(); 