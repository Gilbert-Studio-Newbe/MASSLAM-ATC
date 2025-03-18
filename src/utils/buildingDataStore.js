/**
 * Building Data Store
 * 
 * This utility provides methods for storing and retrieving building data
 * to connect the calculator and the 3D visualization.
 */

// Default storage key
const STORAGE_KEY = 'masslam_building_data';

/**
 * Save building data to localStorage
 * @param {Object} data - The building data to store
 */
export function saveBuildingData(data) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error saving building data:', error);
    return false;
  }
}

/**
 * Get building data from localStorage
 * @returns {Object|null} The stored building data or null if not found
 */
export function getBuildingData() {
  try {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving building data:', error);
    return null;
  }
}

/**
 * Clear building data from localStorage
 */
export function clearBuildingData() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error clearing building data:', error);
    return false;
  }
}

/**
 * Build a 3D visualization data object from calculation results
 * @param {Object} results - The calculation results from TimberCalculator
 * @returns {Object} Data formatted for the 3D visualization
 */
export function prepareVisualizationData(results) {
  if (!results) return null;

  // Determine which beam size property to use, with appropriate fallbacks
  const beamSize = results.interiorBeamSize || results.beamSize || { width: 165, depth: 330 };
  const edgeBeamSize = results.edgeBeamSize || beamSize;

  console.log('Preparing visualization data with beam properties:', { 
    interiorBeamSize: results.interiorBeamSize, 
    beamSize: results.beamSize, 
    resolvedValue: beamSize 
  });

  return {
    buildingLength: results.buildingLength,
    buildingWidth: results.buildingWidth,
    numFloors: results.numFloors || 1,
    floorHeight: results.floorHeight || 3.2,
    lengthwiseBays: results.lengthwiseBays,
    widthwiseBays: results.widthwiseBays,
    joistSize: results.joistSize || { width: 120, depth: 200 },
    // Include both naming conventions for maximum compatibility
    interiorBeamSize: beamSize,
    beamSize: beamSize, 
    edgeBeamSize: edgeBeamSize,
    columnSize: results.columnSize || { width: 250, depth: 250, height: 3.2 },
    joistsRunLengthwise: results.joistsRunLengthwise || true,
    fireRating: results.fireRating || 'none',
    timberGrade: results.timberGrade || 'ML38'
  };
} 