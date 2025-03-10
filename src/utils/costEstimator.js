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
const STORAGE_KEYS = {
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

    if (storedBeamRate) beamRate = parseFloat(storedBeamRate);
    if (storedColumnRate) columnRate = parseFloat(storedColumnRate);
    if (storedJoistRates) joistRates = JSON.parse(storedJoistRates);
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
    localStorage.setItem(STORAGE_KEYS.BEAM_RATE, beamRate.toString());
    localStorage.setItem(STORAGE_KEYS.COLUMN_RATE, columnRate.toString());
    localStorage.setItem(STORAGE_KEYS.JOIST_RATES, JSON.stringify(joistRates));
    return true;
  } catch (error) {
    console.error('Error saving rates to local storage:', error);
    return false;
  }
}

/**
 * Calculate the cost of timber elements
 * @param {Object} timberResult - Result from calculateTimberWeight
 * @param {Object} joistSize - Joist size object with width and depth
 * @param {number} buildingLength - Building length in meters
 * @param {number} buildingWidth - Building width in meters
 * @param {number} numFloors - Number of floors
 * @returns {Object} - Cost breakdown and total
 */
export function calculateCost(timberResult, joistSize, buildingLength, buildingWidth, numFloors) {
  // Load rates
  const { beamRate, columnRate, joistRates } = loadRates();
  
  // Calculate floor area
  const floorArea = buildingLength * buildingWidth * numFloors;
  
  // Get joist size key
  const joistSizeKey = `${joistSize.width}x${joistSize.depth}`;
  
  // Get joist rate (default to DEFAULT_JOIST_RATE if not found)
  const joistRate = joistRates[joistSizeKey] || DEFAULT_JOIST_RATE;
  
  // Calculate costs
  const beamCost = timberResult.elements.beams.volume * beamRate;
  const columnCost = timberResult.elements.columns.volume * columnRate;
  const joistCost = floorArea * joistRate;
  
  // Calculate total cost
  const totalCost = beamCost + columnCost + joistCost;
  
  return {
    elements: {
      joists: {
        count: timberResult.elements.joists.count,
        volume: timberResult.elements.joists.volume,
        area: floorArea,
        rate: joistRate,
        cost: joistCost
      },
      beams: {
        count: timberResult.elements.beams.count,
        volume: timberResult.elements.beams.volume,
        rate: beamRate,
        cost: beamCost
      },
      columns: {
        count: timberResult.elements.columns.count,
        volume: timberResult.elements.columns.volume,
        rate: columnRate,
        cost: columnCost
      }
    },
    totalCost
  };
}

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount) {
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
