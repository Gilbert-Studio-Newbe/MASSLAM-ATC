// src/utils/costEstimator.js

// Default rates
const DEFAULT_BEAM_RATE = 3200; // $ per m³
const DEFAULT_COLUMN_RATE = 3200; // $ per m³
const DEFAULT_JOIST_RATE = 390; // $ per m²

// Initialize default rates for all joist sizes from masslam_sizes.csv
const DEFAULT_JOIST_RATES = {
  "120x200": 390,
  "165x270": 390,
  "205x335": 390,
  "250x410": 390,
  "290x480": 390,
  "335x550": 390,
  "380x620": 390,
  "420x690": 390,
  "450x760": 390,
  "450x830": 390
};

// Storage keys for local storage
export const STORAGE_KEYS = {
  BEAM_RATE: 'timber_beam_rate',
  COLUMN_RATE: 'timber_column_rate',
  JOIST_RATES: 'timber_joist_rates'
};

/**
 * Load rates from local storage or use defaults
 */
export function loadRates() {
  let beamRate = DEFAULT_BEAM_RATE;
  let columnRate = DEFAULT_COLUMN_RATE;
  let joistRates = { ...DEFAULT_JOIST_RATES };

  // Try to load from local storage
  try {
    const storedBeamRate = localStorage.getItem(STORAGE_KEYS.BEAM_RATE);
    const storedColumnRate = localStorage.getItem(STORAGE_KEYS.COLUMN_RATE);
    const storedJoistRates = localStorage.getItem(STORAGE_KEYS.JOIST_RATES);

    console.log('Storage values loaded:', {
      storedBeamRate,
      storedColumnRate,
      storedJoistRates: storedJoistRates ? 'Present (JSON string)' : null
    });

    if (storedBeamRate) beamRate = parseFloat(storedBeamRate);
    if (storedColumnRate) columnRate = parseFloat(storedColumnRate);
    if (storedJoistRates) joistRates = JSON.parse(storedJoistRates);
    
    console.log('Parsed rates:', {
      beamRate,
      columnRate,
      joistRatesCount: Object.keys(joistRates).length
    });
  } catch (error) {
    console.error('Error loading rates from local storage:', error);
  }

  return {
    beamRate,
    columnRate,
    joistRates
  };
}

/**
 * Save rates to local storage
 */
export function saveRates(beamRate, columnRate, joistRates) {
  try {
    console.log('Saving rates to localStorage:', {
      beamRate,
      columnRate,
      joistRatesCount: Object.keys(joistRates).length
    });
    
    // Ensure values are properly formatted
    const formattedBeamRate = parseFloat(beamRate);
    const formattedColumnRate = parseFloat(columnRate);
    
    // Validate the values
    if (isNaN(formattedBeamRate) || formattedBeamRate <= 0) {
      console.error('Invalid beam rate:', beamRate);
      return false;
    }
    
    if (isNaN(formattedColumnRate) || formattedColumnRate <= 0) {
      console.error('Invalid column rate:', columnRate);
      return false;
    }

    // Save to local storage
    localStorage.setItem(STORAGE_KEYS.BEAM_RATE, formattedBeamRate.toString());
    localStorage.setItem(STORAGE_KEYS.COLUMN_RATE, formattedColumnRate.toString());
    localStorage.setItem(STORAGE_KEYS.JOIST_RATES, JSON.stringify(joistRates));
    
    // Verify the saved values
    console.log('Saved values (verification):', {
      savedBeamRate: localStorage.getItem(STORAGE_KEYS.BEAM_RATE),
      savedColumnRate: localStorage.getItem(STORAGE_KEYS.COLUMN_RATE),
      savedJoistRates: localStorage.getItem(STORAGE_KEYS.JOIST_RATES) ? 'Present (JSON string)' : null
    });
    
    return true;
  } catch (error) {
    console.error('Error saving rates to local storage:', error);
    return false;
  }
}

/**
 * Find the closest standard joist size based on width and depth
 * @param {Object} joistSize - The joist dimensions
 * @param {Object} joistRates - Available joist rates by size
 * @returns {string} - The closest standard joist size key
 */
function findClosestJoistSize(joistSize, joistRates) {
  // If the exact size exists, return it
  const exactSizeKey = `${joistSize.width}x${joistSize.depth}`;
  if (joistRates[exactSizeKey]) {
    console.log(`Exact joist size match found: ${exactSizeKey}`);
    return exactSizeKey;
  }
  
  // Otherwise, find the closest standard size
  console.log(`No exact match for ${exactSizeKey}, finding closest standard size`);
  
  // Parse all available sizes
  const standardSizes = Object.keys(joistRates).map(key => {
    const [width, depth] = key.split('x').map(Number);
    return { key, width, depth, area: width * depth };
  });
  
  // Calculate the area of the requested joist
  const requestedArea = joistSize.width * joistSize.depth;
  
  // Find the closest size by area
  let closestSize = standardSizes[0];
  let minDifference = Math.abs(closestSize.area - requestedArea);
  
  for (let i = 1; i < standardSizes.length; i++) {
    const sizeDifference = Math.abs(standardSizes[i].area - requestedArea);
    if (sizeDifference < minDifference) {
      minDifference = sizeDifference;
      closestSize = standardSizes[i];
    }
  }
  
  console.log(`Closest standard joist size: ${closestSize.key} for requested size ${exactSizeKey}`);
  return closestSize.key;
}

/**
 * Simple function to calculate cost based on volumes and rates
 * @param {Object} volumes - Object containing volumes of different timber elements in m³ or m²
 * @param {Object} joistSize - Optional joist size for specific rate lookup
 * @returns {Object} - Cost breakdown and total 
 */
export function calculateCost(volumes, joistSize) {
  // Get rates from localStorage or use defaults
  const beamRate = parseFloat(localStorage.getItem(STORAGE_KEYS.BEAM_RATE)) || DEFAULT_BEAM_RATE;
  const columnRate = parseFloat(localStorage.getItem(STORAGE_KEYS.COLUMN_RATE)) || DEFAULT_COLUMN_RATE;
  
  // Get joist rates from localStorage or use defaults
  let joistRate = DEFAULT_JOIST_RATE;
  let joistSizeUsed = null;
  
  try {
    // If we have joist size information, look up the specific rate
    if (joistSize && joistSize.width && joistSize.depth) {
      // Get all joist rates
      let joistRates = {};
      const storedJoistRates = localStorage.getItem(STORAGE_KEYS.JOIST_RATES);
      if (storedJoistRates) {
        joistRates = JSON.parse(storedJoistRates);
      } else {
        joistRates = { ...DEFAULT_JOIST_RATES };
        console.log('No joist rates found in localStorage, using default rates');
      }
      
      // Find the closest joist size
      const closestSizeKey = findClosestJoistSize(joistSize, joistRates);
      joistSizeUsed = closestSizeKey;
      
      // Get the rate
      if (joistRates[closestSizeKey]) {
        joistRate = joistRates[closestSizeKey];
        console.log(`Using joist rate for size ${closestSizeKey}: $${joistRate}/m²`);
      } else {
        console.log(`No rate found for size ${closestSizeKey}, using default rate: $${DEFAULT_JOIST_RATE}/m²`);
      }
    } else {
      console.log('No specific joist size provided, using default rate');
    }
  } catch (error) {
    console.error('Error getting joist rate:', error);
  }
  
  console.log('Calculate Cost - Input volumes:', volumes);
  console.log('Calculate Cost - Using rates:', { beamRate, columnRate, joistRate });
  
  // Get volumes from the input (ensure positive numbers)
  const beamVolume = Math.max(0, volumes.beamVolume || 0);
  const columnVolume = Math.max(0, volumes.columnVolume || 0);
  const joistArea = Math.max(0, volumes.joistArea || 0);
  
  // Simple direct calculations
  const beamCost = beamVolume * beamRate;
  const columnCost = columnVolume * columnRate;
  const joistCost = joistArea * joistRate;
  
  // Calculate total cost
  const totalCost = beamCost + columnCost + joistCost;
  
  console.log('Calculate Cost - Results:', {
    beamCalculation: `${beamVolume} m³ × $${beamRate}/m³ = $${beamCost}`,
    columnCalculation: `${columnVolume} m³ × $${columnRate}/m³ = $${columnCost}`,
    joistCalculation: `${joistArea} m² × $${joistRate}/m² = $${joistCost}`,
    joistSizeUsed,
    totalCost
  });
  
  // Return a simple object with the cost breakdown
  return {
    total: totalCost,
    elements: {
      beams: {
        cost: beamCost,
        rate: beamRate,
        volume: beamVolume
      },
      columns: {
        cost: columnCost,
        rate: columnRate,
        volume: columnVolume
      },
      joists: {
        cost: joistCost,
        rate: joistRate,
        area: joistArea,
        sizeUsed: joistSizeUsed
      }
    }
  };
}

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount) {
  // Ensure we're working with a number
  if (typeof amount !== 'number') {
    console.error(`formatCurrency received non-number value: ${amount}, type: ${typeof amount}`);
    amount = Number(amount) || 0;
  }
  
  // Format without rounding
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Get all available joist sizes
 * @returns {Array} - Array of joist size objects with width and depth
 */
export function getJoistSizes() {
  return Object.keys(DEFAULT_JOIST_RATES).map(key => {
    const [width, depth] = key.split('x').map(Number);
    return { width, depth };
  });
}
