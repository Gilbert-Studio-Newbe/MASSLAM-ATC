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

/**
 * Calculate structure dimensions for a complete building
 * @param {Object} buildingData - Building data object with dimensions and parameters
 * @returns {Object} Calculated dimensions for joists, beams, and columns
 */
export function calculateStructure(buildingData) {
  const {
    buildingLength,
    buildingWidth,
    joistsRunLengthwise,
    joistSpacing,
    load,
    timberGrade,
    fireRating,
    numFloors = 1,
    floorHeight = 3.0
  } = buildingData;
  
  console.log('[STRUCTURE] Starting structural calculations for building:', {
    length: buildingLength,
    width: buildingWidth, 
    joists: joistsRunLengthwise ? 'lengthwise' : 'widthwise',
    spacing: joistSpacing
  });
  
  // Calculate bay dimensions
  const lengthwiseBays = buildingData.customLengthwiseBayWidths || [];
  const widthwiseBays = buildingData.customWidthwiseBayWidths || [];
  
  // Calculate average bay dimensions
  let avgBayWidth, avgBayLength;
  
  if (buildingData.useCustomBayDimensions && lengthwiseBays.length > 0 && widthwiseBays.length > 0) {
    avgBayWidth = widthwiseBays.reduce((sum, width) => sum + width, 0) / widthwiseBays.length;
    avgBayLength = lengthwiseBays.reduce((sum, width) => sum + width, 0) / lengthwiseBays.length;
  } else {
    avgBayWidth = buildingWidth / buildingData.widthwiseBays;
    avgBayLength = buildingLength / buildingData.lengthwiseBays;
  }
  
  // Calculate max bay spans
  const maxLengthwiseBayWidth = lengthwiseBays.length > 0 
    ? Math.max(...lengthwiseBays) 
    : avgBayLength;
    
  const maxWidthwiseBayWidth = widthwiseBays.length > 0 
    ? Math.max(...widthwiseBays) 
    : avgBayWidth;
  
  // Calculate joist spans based on joist direction
  const joistSpan = joistsRunLengthwise ? maxWidthwiseBayWidth : maxLengthwiseBayWidth;
  
  console.log(`[STRUCTURE] Joist span: ${joistSpan.toFixed(2)}m based on ${joistsRunLengthwise ? 'widthwise' : 'lengthwise'} bay direction`);
  
  // Check if span exceeds maximum
  if (joistSpan > buildingData.maxBaySpan) {
    console.error(`[STRUCTURE] The joist span (${joistSpan.toFixed(2)}m) exceeds the maximum allowable span (${buildingData.maxBaySpan.toFixed(2)}m)`);
  }
  
  // Calculate joist size
  const joistSize = calculateJoistSize(
    joistSpan, 
    joistSpacing, 
    load, 
    timberGrade,
    fireRating
  );
  
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
    false // interior beam
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
    true // edge beam
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
  
  // Return all calculated sizes
  return {
    joistSize,
    beamSize: interiorBeamSize,
    edgeBeamSize,
    columnSize
  };
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