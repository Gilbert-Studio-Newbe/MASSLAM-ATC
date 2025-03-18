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
 * Simple function to calculate cost based on volumes and rates
 * @param {Object} volumes - Object containing volumes of different timber elements in m³ or m²
 * @returns {Object} - Cost breakdown and total 
 */
export function calculateCost(volumes) {
  // Simply get the rates from localStorage or use defaults
  const beamRate = parseFloat(localStorage.getItem(STORAGE_KEYS.BEAM_RATE)) || DEFAULT_BEAM_RATE;
  const columnRate = parseFloat(localStorage.getItem(STORAGE_KEYS.COLUMN_RATE)) || DEFAULT_COLUMN_RATE;
  const joistRate = parseFloat(localStorage.getItem('joistRate')) || DEFAULT_JOIST_RATE;
  
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
        volume: joistArea
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
