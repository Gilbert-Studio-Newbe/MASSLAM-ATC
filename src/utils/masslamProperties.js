// Utility functions for mass timber fire resistance calculations

/**
 * Default charring rates for different timber types (mm/min)
 */
export const CHARRING_RATES = {
  softwood: 0.65,  // Standard softwood
  hardwood: 0.5,   // Standard hardwood
  glulam: 0.7,     // Glue laminated timber
  clt: 0.65,       // Cross-laminated timber
  lvl: 0.7,        // Laminated veneer lumber
  masslam_sl33: 0.7, // MASSLAM SL33 (from mechanical properties CSV)
};

/**
 * Hardcoded MASSLAM SL33 mechanical properties from CSV
 * This eliminates the need to fetch the CSV file at runtime
 */
export const HARDCODED_MASSLAM_SL33_PROPERTIES = [
  { property: "Bending Strength (f'b)", value: "33", unit: "MPa" },
  { property: "Tension Strength Parallel (f't)", value: "16", unit: "MPa" },
  { property: "Tension Strength Perpendicular (f't90)", value: "0.5", unit: "MPa" },
  { property: "Shear Strength (f's)", value: "4.2", unit: "MPa" },
  { property: "Compression Strength Parallel (f'c)", value: "26", unit: "MPa" },
  { property: "Compression Strength Perpendicular (f'c90)", value: "N/A", unit: "MPa" },
  { property: "Bearing Strength Parallel (f'j)", value: "30", unit: "MPa" },
  { property: "Bearing Strength Perpendicular (f'j90)", value: "10", unit: "MPa" },
  { property: "Modulus of Elasticity (E_mean)", value: "13300", unit: "MPa" },
  { property: "Modulus of Elasticity 5th Percentile (E_05)", value: "9975", unit: "MPa" },
  { property: "Modulus of Elasticity Perpendicular Mean (E₉₀,mean)", value: "890", unit: "MPa" },
  { property: "Modulus of Rigidity (G)", value: "900", unit: "MPa" },
  { property: "Density (ρ_mean)", value: "600", unit: "kg/m³" },
  { property: "Joint Group", value: "JD4", unit: "-" },
  { property: "Charring Rate", value: "0.7", unit: "mm/min" }
];

/**
 * Load the charring rate from the hardcoded MASSLAM_SL33_Mechanical_Properties data
 * @returns {Promise<number>} The charring rate in mm/min
 */
export async function loadMasslamSL33CharringRate() {
  try {
    console.log('Loading charring rate from hardcoded data');
    
    // Find the charring rate in the hardcoded data
    const charringRateItem = HARDCODED_MASSLAM_SL33_PROPERTIES.find(
      item => item.property.toLowerCase().includes('charring rate')
    );
    
    if (!charringRateItem) {
      console.warn('Charring rate not found in hardcoded data');
      return CHARRING_RATES.masslam_sl33; // Return default value if not found
    }
    
    const charringRate = parseFloat(charringRateItem.value);
    if (isNaN(charringRate)) {
      console.warn('Invalid charring rate value in hardcoded data');
      return CHARRING_RATES.masslam_sl33; // Return default value if value is invalid
    }
    
    console.log(`Loaded MASSLAM SL33 charring rate from hardcoded data: ${charringRate} mm/min`);
    
    // Update the default charring rate
    CHARRING_RATES.masslam_sl33 = charringRate;
    
    return charringRate;
  } catch (error) {
    console.error('Error loading MASSLAM SL33 charring rate:', error);
    return CHARRING_RATES.masslam_sl33; // Return default value if an error occurs
  }
}

/**
 * Calculate the fire resistance properties of a timber element
 * 
 * @param {number} charringRate - Charring rate in mm/min
 * @param {Object} dimensions - Element dimensions {width, depth} in mm
 * @param {number} requiredMinutes - Required fire resistance in minutes
 * @returns {Object} Fire resistance properties
 */
export function calculateFireResistance(charringRate, dimensions, requiredMinutes) {
  // Calculate char depth based on charring rate and required minutes
  const charDepth = charringRate * requiredMinutes;
  
  // Calculate zero strength layer (additional 7mm beyond char layer)
  const zeroStrengthLayer = 7;
  
  // Calculate effective dimensions after fire exposure
  const effectiveWidth = Math.max(0, dimensions.width - (2 * charDepth) - (2 * zeroStrengthLayer));
  const effectiveDepth = Math.max(0, dimensions.depth - (2 * charDepth) - (2 * zeroStrengthLayer));
  
  // Calculate residual cross-section as percentage
  const originalArea = dimensions.width * dimensions.depth;
  const residualArea = effectiveWidth * effectiveDepth;
  const residualPercentage = (residualArea / originalArea) * 100;
  
  // Calculate load capacity reduction
  const loadCapacityReduction = 100 - residualPercentage;
  
  // Determine if the section passes the fire resistance requirement
  const passes = effectiveWidth > 0 && effectiveDepth > 0;
  
  return {
    charDepth,
    effectiveWidth,
    effectiveDepth,
    residualPercentage,
    loadCapacityReduction,
    passes,
  };
}

/**
 * Calculate the additional size needed for fire resistance
 * 
 * @param {string} frl - Fire Resistance Level (e.g., "60/60/60", "90/90/90")
 * @param {number} charringRate - Charring rate in mm/min
 * @returns {number} Additional size needed in mm for each exposed face
 */
export function calculateFireResistanceAllowance(frl, charringRate = CHARRING_RATES.masslam_sl33) {
  // Parse FRL value (e.g., "60/60/60" -> 60)
  let minutes = 0;
  if (frl && frl !== 'none') {
    minutes = parseInt(frl.split('/')[0]) || 0;
  }
  
  // Calculate char depth based on charring rate and required minutes
  const charDepth = charringRate * minutes;
  
  // Add zero strength layer (additional 7mm beyond char layer)
  const zeroStrengthLayer = 7;
  
  // Total allowance per exposed face
  const totalAllowance = charDepth + zeroStrengthLayer;
  
  console.log(`Fire resistance allowance for ${frl}: ${totalAllowance.toFixed(1)}mm per exposed face`);
  
  return totalAllowance;
}

/**
 * MASSLAM product properties
 */
export const MASSLAM_PRODUCTS = {
  GL17: {
    name: "MASSLAM GL17",
    description: "Glue Laminated Timber - Strength Class GL17",
    grade: "GL17",
    type: "Glulam",
    bendingStrength: 17,
    tensileStrength: 10,
    compressiveStrength: 18,
    shearStrength: 2.6,
    modulus: 16700,
    density: 600,
    fireRating: "Good",
    sustainabilityRating: 4.5,
    applications: ["Beams", "Columns", "Trusses", "Frames"],
    finishOptions: ["Clear Coat", "Stained", "Painted", "Raw"],
    sizes: [
      { width: 65, depth: 240, length: 12000 },
      { width: 85, depth: 300, length: 12000 },
      { width: 135, depth: 400, length: 12000 },
      { width: 185, depth: 500, length: 12000 },
    ],
    certifications: ["FSC", "PEFC", "AS/NZS 1328.1"],
  },
  GL21: {
    name: "MASSLAM GL21",
    description: "Glue Laminated Timber - Strength Class GL21",
    grade: "GL21",
    type: "Glulam",
    bendingStrength: 21,
    tensileStrength: 15,
    compressiveStrength: 26,
    shearStrength: 3.2,
    modulus: 19500,
    density: 650,
    fireRating: "Excellent",
    sustainabilityRating: 4.2,
    applications: ["Heavy Duty Beams", "Columns", "Transfer Elements", "Long-span Structures"],
    finishOptions: ["Clear Coat", "Stained", "Painted", "Raw"],
    sizes: [
      { width: 85, depth: 300, length: 12000 },
      { width: 135, depth: 400, length: 12000 },
      { width: 185, depth: 500, length: 12000 },
      { width: 240, depth: 600, length: 12000 },
    ],
    certifications: ["FSC", "PEFC", "AS/NZS 1328.1"],
  },
  CLT90: {
    name: "MASSLAM CLT90",
    description: "Cross Laminated Timber - 90mm",
    grade: "CLT",
    type: "Cross Laminated Timber",
    bendingStrength: 24,
    tensileStrength: 14,
    compressiveStrength: 21,
    shearStrength: 3.5,
    modulus: 12000,
    density: 480,
    fireRating: "Excellent",
    sustainabilityRating: 4.8,
    applications: ["Floor Panels", "Roof Panels", "Wall Elements", "Shear Walls"],
    finishOptions: ["Visual Grade", "Industrial Grade", "Custom Finish"],
    sizes: [
      { thickness: 90, width: 1200, length: 12000 },
      { thickness: 90, width: 2400, length: 12000 },
      { thickness: 90, width: 3000, length: 12000 },
    ],
    certifications: ["FSC", "PEFC", "ETA"],
  },
  LVL14: {
    name: "MASSLAM LVL14",
    description: "Laminated Veneer Lumber - 14 Grade",
    grade: "LVL14",
    type: "LVL",
    bendingStrength: 14,
    tensileStrength: 12,
    compressiveStrength: 20,
    shearStrength: 4.2,
    modulus: 14000,
    density: 580,
    fireRating: "Good",
    sustainabilityRating: 4.0,
    applications: ["Beams", "Headers", "Rafters", "Rim Boards"],
    finishOptions: ["Raw", "Sealed"],
    sizes: [
      { width: 45, depth: 200, length: 12000 },
      { width: 45, depth: 240, length: 12000 },
      { width: 45, depth: 300, length: 12000 },
      { width: 45, depth: 360, length: 12000 },
    ],
    certifications: ["FSC", "AS/NZS 4357"],
  },
};

/**
 * Get detailed properties for a specific MASSLAM product
 * 
 * @param {string} productCode - Product code (e.g., "GL17", "CLT90")
 * @returns {Object|null} Product properties or null if not found
 */
export function getMasslamProductProperties(productCode) {
  return MASSLAM_PRODUCTS[productCode] || null;
}

/**
 * Load all mechanical properties from the hardcoded data
 * @returns {Promise<Object>} The mechanical properties
 */
export async function loadMasslamSL33MechanicalProperties() {
  try {
    console.log('Loading mechanical properties from hardcoded data');
    
    // Process the hardcoded data
    const properties = {};
    
    // Process each property
    for (const item of HARDCODED_MASSLAM_SL33_PROPERTIES) {
      const propertyName = item.property.trim();
      const propertyValue = item.value.trim();
      const propertyUnit = item.unit.trim();
      
      // Skip if property name or value is empty
      if (!propertyName || !propertyValue) continue;
      
      // Convert numeric values
      const numericValue = propertyValue === 'N/A' ? null : parseFloat(propertyValue);
      
      // Store the property
      properties[propertyName] = {
        value: isNaN(numericValue) ? propertyValue : numericValue,
        unit: propertyUnit
      };
    }
    
    console.log('Loaded MASSLAM SL33 mechanical properties from hardcoded data');
    return properties;
  } catch (error) {
    console.error('Error loading MASSLAM SL33 mechanical properties:', error);
    return null; // Return null if an error occurs
  }
}

// Create a singleton to store the loaded properties
let MASSLAM_SL33_PROPERTIES = null;

/**
 * Get the MASSLAM SL33 mechanical properties
 * Loads the properties if they haven't been loaded yet
 * @returns {Promise<Object>} The mechanical properties
 */
export async function getMasslamSL33Properties() {
  if (MASSLAM_SL33_PROPERTIES === null) {
    MASSLAM_SL33_PROPERTIES = await loadMasslamSL33MechanicalProperties();
  }
  return MASSLAM_SL33_PROPERTIES;
}