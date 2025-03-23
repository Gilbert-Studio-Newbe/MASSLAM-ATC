/**
 * timber-utils.js - Common utilities shared by all calculators
 */

// Import helpers
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
  getML38Properties,
  loadML38MechanicalProperties
} from './masslamProperties';

// Export common timber properties
export let TIMBER_PROPERTIES = {
  // Default values that will be replaced with data from CSV
  ML38: {
    bendingStrength: 38,
    tensileStrength: 19,
    compressiveStrength: 38,
    shearStrength: 5.0,
    modulusOfElasticity: 14500,
    density: 600
  },
  // For backward compatibility
  MASSLAM_SL33: {
    bendingStrength: 38,
    tensileStrength: 19,
    compressiveStrength: 38,
    shearStrength: 5.0,
    modulusOfElasticity: 14500,
    density: 600
  },
  GL24: {
    bendingStrength: 38,
    tensileStrength: 19,
    compressiveStrength: 38,
    shearStrength: 5.0,
    modulusOfElasticity: 14500,
    density: 600
  }
};

// Single initialization function for the entire module
let initialized = false;
let isServer = typeof window === 'undefined';

export function initializeTimberUtils() {
  if (initialized) return;
  
  console.log('Initializing timber utilities module');
  initializeMasslamSizes();
  
  if (!isServer) {
    // Load data on client only
    loadMasslamSizes().then(sizes => {
      console.log(`Loaded ${sizes.length} MASSLAM sizes from CSV`);
    }).catch(error => {
      console.error('Error loading MASSLAM sizes:', error);
    });
    
    loadTimberProperties().then(() => {
      console.log('Timber properties loaded from CSV');
    }).catch(error => {
      console.error('Error loading timber properties:', error);
    });
  }
  
  initialized = true;
}

// Common utility functions
export function findNearestValue(target, values) {
  if (!values || values.length === 0) return target;
  return values.reduce((prev, curr) => 
    Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev);
}

export function getFixedWidthForFireRating(fireRating) {
  switch (fireRating) {
    case 'none':
      return 120; // Available in CSV
    case '30/30/30':
    case '60/60/60':
      return 165; // Available in CSV
    case '90/90/90':
      return 205; // Available in CSV
    case '120/120/120':
      return 250; // Available in CSV
    default:
      return 120; // Default to 120mm if unknown rating
  }
}

/**
 * Load timber properties from the CSV file
 */
export async function loadTimberProperties() {
  try {
    const properties = await loadML38MechanicalProperties();
    
    if (!properties) {
      console.warn('Failed to load ML38 properties from CSV, using default values');
      return;
    }
    
    // Find the perpendicular modulus property by partial key matching
    const findPropertyByPartialKey = (partialKey) => {
      const key = Object.keys(properties).find(k => k.toLowerCase().includes(partialKey.toLowerCase()));
      return key ? properties[key]?.value : null;
    };
    
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
      modulusOfElasticityPerpendicular: findPropertyByPartialKey('Modulus of Elasticity Perpendicular Mean') || 960,
      modulusOfRigidity: properties['Modulus of Rigidity (G)']?.value || 960,
      jointGroup: properties['Joint Group']?.value || 'JD4',
      charringRate: properties['Charring Rate']?.value || 0.7
    };
    
    // Update both MASSLAM_SL33 and ML38 with the same properties
    TIMBER_PROPERTIES.MASSLAM_SL33 = { ...mappedProperties };
    TIMBER_PROPERTIES.ML38 = { ...mappedProperties };
    TIMBER_PROPERTIES.GL24 = { ...mappedProperties };
    
    console.log('Loaded timber properties from CSV:', TIMBER_PROPERTIES.ML38);
    
    return TIMBER_PROPERTIES.ML38;
  } catch (error) {
    console.error('Error loading timber properties:', error);
  }
}

// Re-export key functions from other modules
export {
  validateMasslamSize,
  getMasslamSizes,
  checkMasslamSizesLoaded,
  findNearestWidth,
  findNearestDepth,
  calculateFireResistanceAllowance
};

// Initialize automatically
initializeTimberUtils(); 