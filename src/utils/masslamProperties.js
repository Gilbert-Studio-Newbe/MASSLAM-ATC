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
  masslam_sl33: 0.7, // ML38 (from mechanical properties CSV)
};

/**
 * Load the charring rate from the ML38_Mechanical_Properties.csv file
 * @returns {Promise<number>} The charring rate in mm/min
 */
export async function loadML38CharringRate() {
  try {
    // Fetch the CSV file
    console.log('Fetching charring rate from CSV...');
    
    // Handle different environments (client vs server)
    let csvText;
    
    if (typeof window !== 'undefined') {
      // Client-side: Use window.location.origin
      const url = new URL('/data/ML38_Mechanical_Properties.csv', window.location.origin).toString();
      console.log('Client-side: Fetching CSV from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        return CHARRING_RATES.masslam_sl33; // Return default value if fetch fails
      }
      
      csvText = await response.text();
    } else {
      // Server-side: Use Node.js file system API
      console.log('Server-side: Reading CSV file directly for charring rate');
      
      try {
        // Try to use the fs module if available (only works in Node.js environment)
        const fs = require('fs');
        const path = require('path');
        
        // Attempt to read the CSV file from the public directory
        const csvPath = path.join(process.cwd(), 'public', 'data', 'ML38_Mechanical_Properties.csv');
        console.log('Attempting to read CSV from server path:', csvPath);
        
        if (fs.existsSync(csvPath)) {
          csvText = fs.readFileSync(csvPath, 'utf8');
          console.log('Successfully read mechanical properties CSV file for charring rate, length:', csvText.length);
        } else {
          console.warn('Mechanical properties CSV file not found at path:', csvPath);
          return CHARRING_RATES.masslam_sl33;
        }
      } catch (fsError) {
        console.warn('Failed to load mechanical properties CSV on server side:', fsError.message);
        return CHARRING_RATES.masslam_sl33;
      }
    }
    
    if (!csvText || csvText.trim().length === 0) {
      console.error('Mechanical properties CSV file is empty');
      return CHARRING_RATES.masslam_sl33;
    }
    
    const lines = csvText.trim().split('\n');
    
    // Find the line with the charring rate
    const charringRateLine = lines.find(line => line.toLowerCase().includes('charring rate'));
    
    if (!charringRateLine) {
      console.warn('Charring rate not found in ML38_Mechanical_Properties.csv');
      return CHARRING_RATES.masslam_sl33; // Return default value if not found
    }
    
    // Parse the charring rate value
    const values = charringRateLine.split(',');
    if (values.length < 2) {
      console.warn('Invalid charring rate format in CSV');
      return CHARRING_RATES.masslam_sl33; // Return default value if format is invalid
    }
    
    const charringRate = parseFloat(values[1]);
    if (isNaN(charringRate)) {
      console.warn('Invalid charring rate value in CSV');
      return CHARRING_RATES.masslam_sl33; // Return default value if value is invalid
    }
    
    console.log(`Loaded ML38 charring rate from CSV: ${charringRate} mm/min`);
    
    // Update the default charring rate
    CHARRING_RATES.masslam_sl33 = charringRate;
    
    return charringRate;
  } catch (error) {
    console.error('Error loading ML38 charring rate:', error);
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
 * Load all mechanical properties from the ML38_Mechanical_Properties.csv file
 * @returns {Promise<Object>} The mechanical properties
 */
export async function loadML38MechanicalProperties() {
  try {
    // Fetch the CSV file
    console.log('Fetching mechanical properties from CSV...');
    
    // Handle different environments (client vs server)
    let csvText;
    
    if (typeof window !== 'undefined') {
      // Client-side: Use window.location.origin
      const url = new URL('/data/ML38_Mechanical_Properties.csv', window.location.origin).toString();
      console.log('Client-side: Fetching CSV from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        return null; // Return null if fetch fails
      }
      
      csvText = await response.text();
    } else {
      // Server-side: Use Node.js file system API
      console.log('Server-side: Reading CSV file directly');
      
      try {
        // Try to use the fs module if available (only works in Node.js environment)
        const fs = require('fs');
        const path = require('path');
        
        // Attempt to read the CSV file from the public directory
        const csvPath = path.join(process.cwd(), 'public', 'data', 'ML38_Mechanical_Properties.csv');
        console.log('Attempting to read CSV from server path:', csvPath);
        
        if (fs.existsSync(csvPath)) {
          csvText = fs.readFileSync(csvPath, 'utf8');
          console.log('Successfully read mechanical properties CSV file, length:', csvText.length);
        } else {
          console.warn('Mechanical properties CSV file not found at path:', csvPath);
          return null;
        }
      } catch (fsError) {
        console.warn('Failed to load mechanical properties CSV on server side:', fsError.message);
        return null;
      }
    }
    
    if (!csvText || csvText.trim().length === 0) {
      console.error('Mechanical properties CSV file is empty');
      return null;
    }
    
    const lines = csvText.trim().split('\n');
    
    // Skip the header line and process each property line
    const properties = {};
    
    // Process each line after the header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = line.split(',');
      if (values.length < 3) continue; // Skip invalid lines
      
      const propertyName = values[0].trim();
      const propertyValue = values[1].trim();
      const propertyUnit = values[2].trim();
      
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
    
    console.log('Loaded ML38 mechanical properties:', properties);
    return properties;
  } catch (error) {
    console.error('Error loading ML38 mechanical properties:', error);
    return null; // Return null if an error occurs
  }
}

// Create a singleton to store the loaded properties
let ML38_PROPERTIES = null;

/**
 * Get the ML38 mechanical properties
 * Loads the properties if they haven't been loaded yet
 * @returns {Promise<Object>} The mechanical properties
 */
export async function getML38Properties() {
  if (ML38_PROPERTIES === null) {
    ML38_PROPERTIES = await loadML38MechanicalProperties();
  }
  return ML38_PROPERTIES;
}