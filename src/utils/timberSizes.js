/**
 * Utility functions for timber size selection and validation
 */

import Papa from 'papaparse';

// Instead of a shared mutable array, we'll use a module-level variable
// that can only be modified through specific functions
let _masslamSizes = [];
let _isInitialized = false;

/**
 * Initialize the module and clear any existing data
 */
export function initializeMasslamSizes() {
  console.log('Initializing MASSLAM sizes module');
  _masslamSizes = [];
  _isInitialized = true;
  return true;
}

/**
 * Get a copy of the current MASSLAM sizes
 * @returns {Array} A copy of the current MASSLAM sizes
 */
export function getMasslamSizes() {
  return [..._masslamSizes];
}

/**
 * Set the MASSLAM sizes (only used internally)
 * @param {Array} sizes The sizes to set
 */
function _setMasslamSizes(sizes) {
  _masslamSizes = [...sizes];
}

/**
 * Load MASSLAM sizes from CSV file
 * @returns {Promise} Promise that resolves when data is loaded
 */
export async function loadMasslamSizes() {
  console.log('Loading MASSLAM sizes from CSV...');
  
  // Initialize the module if not already initialized
  if (!_isInitialized) {
    initializeMasslamSizes();
  } else {
    // Clear any existing data
    _masslamSizes = [];
  }
  
  try {
    // Fetch the CSV file
    const response = await fetch('/data/masslam_sizes.csv');
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log('Raw CSV content length:', csvText.length);
    console.log('CSV lines:', csvText.trim().split('\n').length);
    
    // Manual parsing to ensure we get exactly what's in the file
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    console.log('CSV Headers:', headers);
    
    // Check if we have the expected headers
    if (!headers.includes('width') || !headers.includes('depth') || !headers.includes('type')) {
      console.error('CSV is missing required headers (width, depth, type)');
      return [];
    }
    
    // Get the index of each header
    const widthIndex = headers.indexOf('width');
    const depthIndex = headers.indexOf('depth');
    const typeIndex = headers.indexOf('type');
    
    console.log(`Header indices: width=${widthIndex}, depth=${depthIndex}, type=${typeIndex}`);
    
    // Parse the data rows
    const parsedData = [];
    const skippedLines = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        console.log(`Line ${i} is empty, skipping`);
        continue; // Skip empty lines
      }
      
      const values = line.split(',');
      
      // Ensure we have enough values
      if (values.length < Math.max(widthIndex, depthIndex, typeIndex) + 1) {
        console.warn(`Line ${i} has insufficient values: ${line}`);
        skippedLines.push({ line: i, reason: 'insufficient values', content: line });
        continue;
      }
      
      // Create the size object with proper type conversion
      const size = {
        width: Number(values[widthIndex]),
        depth: Number(values[depthIndex]),
        type: values[typeIndex].trim()
      };
      
      // Validate the size
      if (isNaN(size.width) || isNaN(size.depth) || !size.type) {
        console.warn(`Line ${i} has invalid values: ${line}`);
        skippedLines.push({ line: i, reason: 'invalid values', content: line });
        continue;
      }
      
      parsedData.push(size);
    }
    
    console.log(`Manually parsed ${parsedData.length} sizes from CSV`);
    if (skippedLines.length > 0) {
      console.warn(`Skipped ${skippedLines.length} lines during parsing:`, skippedLines);
    }
    
    // Count by type before setting
    const typeCountBefore = {};
    parsedData.forEach(size => {
      typeCountBefore[size.type] = (typeCountBefore[size.type] || 0) + 1;
    });
    console.log('Sizes by type before setting:', typeCountBefore);
    
    // Set the parsed data
    _setMasslamSizes(parsedData);
    
    // Count by type after setting
    const sizes = getMasslamSizes();
    const typeCountAfter = {};
    sizes.forEach(size => {
      typeCountAfter[size.type] = (typeCountAfter[size.type] || 0) + 1;
    });
    console.log('Sizes by type after setting:', typeCountAfter);
    
    // Log the current state
    console.log(`MASSLAM sizes loaded: ${_masslamSizes.length} sizes`);
    
    // Return a copy of the data
    return getMasslamSizes();
  } catch (error) {
    console.error('Error loading MASSLAM sizes:', error);
    return [];
  }
}

/**
 * Find the nearest available width to the target width, rounding up
 * @param {number} targetWidth - Target width in mm
 * @returns {number} Nearest available width (rounded up)
 */
export function findNearestWidth(targetWidth) {
  const sizes = getMasslamSizes();
  
  if (sizes.length === 0) {
    console.warn('MASSLAM sizes not loaded yet, cannot find nearest width');
    return targetWidth;
  }
  
  // Extract unique widths and sort them
  const availableWidths = [...new Set(sizes.map(size => size.width))].sort((a, b) => a - b);
  console.log('Available widths from CSV:', availableWidths);
  
  if (availableWidths.length === 0) return targetWidth;
  
  // Find the smallest width that is >= targetWidth
  const roundedUpWidth = availableWidths.find(w => w >= targetWidth) || availableWidths[availableWidths.length - 1];
  console.log(`Rounding width ${targetWidth}mm up to ${roundedUpWidth}mm`);
  
  return roundedUpWidth;
}

/**
 * Find the nearest available depth to the target depth for a given width, rounding up
 * @param {number} width - Width in mm
 * @param {number} targetDepth - Target depth in mm
 * @returns {number} Nearest available depth (rounded up)
 */
export function findNearestDepth(width, targetDepth) {
  const sizes = getMasslamSizes();
  
  if (sizes.length === 0) {
    console.warn('MASSLAM sizes not loaded yet, cannot find nearest depth');
    return targetDepth;
  }
  
  // Filter depths available for the given width
  const availableDepths = sizes
    .filter(size => size.width === width)
    .map(size => size.depth)
    .sort((a, b) => a - b);
  
  console.log(`Available depths for width ${width} from CSV:`, availableDepths);
  
  if (availableDepths.length === 0) {
    console.warn(`No depths available for width ${width} in the CSV file`);
    return targetDepth;
  }
  
  // Find the smallest depth that is >= targetDepth
  const roundedUpDepth = availableDepths.find(d => d >= targetDepth) || availableDepths[availableDepths.length - 1];
  console.log(`Rounding depth ${targetDepth}mm up to ${roundedUpDepth}mm for width ${width}mm`);
  
  return roundedUpDepth;
}

/**
 * Get recommended timber size based on span and load
 * 
 * @param {string} componentType - Component type ("joist", "beam", or "post")
 * @param {number} span - Span in meters
 * @param {number} load - Load in kPa
 * @param {string} usage - Usage type ("residential", "commercial", or "heavyDuty")
 * @returns {Object} Recommended width and depth
 */
export function getRecommendedSize(componentType, span, load, usage = "residential") {
  const sizes = getMasslamSizes();
  
  if (sizes.length === 0) {
    console.warn('MASSLAM sizes not loaded yet, cannot get recommended size');
    return { width: 0, depth: 0 };
  }
  
  // Filter sizes by component type
  const availableSizes = sizes.filter(size => size.type === componentType);
  
  if (availableSizes.length === 0) {
    console.warn(`No sizes available for component type ${componentType}`);
    return { width: 0, depth: 0 };
  }
  
  // Convert span to mm
  const spanMm = span * 1000;
  
  // Calculate minimum depth based on span ratio
  // These are approximate ratios for different usage types
  const minSpanRatios = {
    residential: 1/20, // 1/20 of span
    commercial: 1/16,  // 1/16 of span
    heavyDuty: 1/12    // 1/12 of span
  };
  
  const minDepth = Math.ceil(spanMm * (minSpanRatios[usage] || minSpanRatios.residential));
  
  // Find all sizes with depth >= minDepth
  const suitableSizes = availableSizes.filter(size => size.depth >= minDepth);
  
  if (suitableSizes.length === 0) {
    // If no suitable sizes, return the largest available
    const largestSize = availableSizes.reduce((prev, curr) => 
      prev.depth > curr.depth ? prev : curr
    );
    return { width: largestSize.width, depth: largestSize.depth };
  }
  
  // Sort by width (ascending) then depth (ascending)
  suitableSizes.sort((a, b) => {
    if (a.width !== b.width) return a.width - b.width;
    return a.depth - b.depth;
  });
  
  // For higher loads, prefer wider sections
  if (load > 3) {
    // For heavy loads, use a larger size
    return suitableSizes[Math.min(2, suitableSizes.length - 1)];
  } else {
    // For normal loads, use the smallest suitable size
    return suitableSizes[0];
  }
}

/**
 * Debug function to display the loaded MASSLAM sizes in the console
 */
export function debugMasslamSizes() {
  const sizes = getMasslamSizes();
  
  if (sizes.length === 0) {
    console.warn('MASSLAM sizes not loaded yet');
    return;
  }
  
  console.group('MASSLAM Sizes Debug Info');
  
  // Count by type
  const typeCount = sizes.reduce((acc, size) => {
    acc[size.type] = (acc[size.type] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Total sizes:', sizes.length);
  console.log('Sizes by type:', typeCount);
  
  // Get unique widths and depths
  const uniqueWidths = [...new Set(sizes.map(size => size.width))].sort((a, b) => a - b);
  const uniqueDepths = [...new Set(sizes.map(size => size.depth))].sort((a, b) => a - b);
  
  console.log('Available widths:', uniqueWidths);
  console.log('Available depths:', uniqueDepths);
  
  // Show sizes by type
  console.group('Beams');
  const beams = sizes.filter(size => size.type === 'beam');
  console.table(beams);
  console.groupEnd();
  
  console.group('Columns');
  const columns = sizes.filter(size => size.type === 'column');
  console.table(columns);
  console.groupEnd();
  
  console.group('Joists');
  const joists = sizes.filter(size => size.type === 'joist');
  console.table(joists);
  console.groupEnd();
  
  console.groupEnd();
}

/**
 * Validate that a size exists in the MASSLAM catalog
 * @param {number} width - Width in mm
 * @param {number} depth - Depth in mm
 * @param {string} type - Type (beam, post, or joist)
 * @returns {boolean} Whether the size exists in the catalog
 */
export function validateMasslamSize(width, depth, type) {
  const sizes = getMasslamSizes();
  
  if (sizes.length === 0) {
    console.warn('MASSLAM sizes not loaded yet, cannot validate size');
    return false;
  }
  
  const exists = sizes.some(size => 
    size.width === width && 
    size.depth === depth && 
    size.type === type
  );
  
  if (!exists) {
    console.warn(`Size ${width}x${depth}mm (${type}) does not exist in the MASSLAM catalog`);
  }
  
  return exists;
}

/**
 * Validate that all sizes in the results are from the MASSLAM catalog
 * @param {Object} results - The calculation results
 * @returns {boolean} Whether all sizes are valid
 */
export function validateAllSizes(results) {
  if (!results) return false;
  
  const { joists, beams, columns } = results;
  
  const joistValid = validateMasslamSize(joists.width, joists.depth, 'joist');
  const beamValid = validateMasslamSize(beams.width, beams.depth, 'beam');
  const columnValid = validateMasslamSize(columns.width, columns.depth, 'column');
  
  return joistValid && beamValid && columnValid;
}

/**
 * Verify if the loaded sizes are valid
 * @returns {boolean} Whether the loaded sizes are valid
 */
export function verifyLoadedSizes() {
  const sizes = getMasslamSizes();
  
  if (sizes.length === 0) {
    console.warn('MASSLAM sizes not loaded yet, cannot verify');
    return false;
  }
  
  console.group('CSV Size Verification');
  
  // Log the actual loaded sizes
  console.log(`Loaded ${sizes.length} sizes from CSV`);
  
  // Count by type
  const typeCount = {};
  sizes.forEach(size => {
    typeCount[size.type] = (typeCount[size.type] || 0) + 1;
  });
  console.log('Sizes by type:', typeCount);
  
  // Get unique widths and depths
  const uniqueWidths = [...new Set(sizes.map(size => size.width))].sort((a, b) => a - b);
  const uniqueDepths = [...new Set(sizes.map(size => size.depth))].sort((a, b) => a - b);
  
  console.log('Unique widths:', uniqueWidths);
  console.log('Unique depths:', uniqueDepths);
  
  // Check if we have at least one size of each required type
  const requiredTypes = ['joist', 'beam', 'column'];
  const actualTypes = Object.keys(typeCount);
  
  const allTypesPresent = requiredTypes.every(type => actualTypes.includes(type));
  if (!allTypesPresent) {
    console.warn(`Missing required types: expected at least ${requiredTypes.join(', ')}, got ${actualTypes.join(', ')}`);
    console.groupEnd();
    return false;
  }
  
  // Check if we have a reasonable number of sizes
  const minExpectedCount = 10; // At least 10 sizes total
  const actualCount = sizes.length;
  
  if (actualCount < minExpectedCount) {
    console.warn(`Too few sizes: expected at least ${minExpectedCount}, got ${actualCount}`);
    console.groupEnd();
    return false;
  }
  
  // Check if we have a reasonable number of widths and depths
  const minExpectedWidths = 2; // At least 2 different widths
  const minExpectedDepths = 2; // At least 2 different depths
  
  if (uniqueWidths.length < minExpectedWidths) {
    console.warn(`Too few unique widths: expected at least ${minExpectedWidths}, got ${uniqueWidths.length}`);
    console.groupEnd();
    return false;
  }
  
  if (uniqueDepths.length < minExpectedDepths) {
    console.warn(`Too few unique depths: expected at least ${minExpectedDepths}, got ${uniqueDepths.length}`);
    console.groupEnd();
    return false;
  }
  
  // Check for any invalid sizes (width or depth <= 0)
  const invalidSizes = sizes.filter(size => size.width <= 0 || size.depth <= 0);
  if (invalidSizes.length > 0) {
    console.warn(`Found ${invalidSizes.length} invalid sizes with width or depth <= 0`);
    console.groupEnd();
    return false;
  }
  
  // Check for duplicate sizes (same width, depth, and type)
  const sizeMap = new Map();
  const duplicates = [];
  
  sizes.forEach(size => {
    const key = `${size.width}-${size.depth}-${size.type}`;
    if (sizeMap.has(key)) {
      duplicates.push(key);
    } else {
      sizeMap.set(key, true);
    }
  });
  
  if (duplicates.length > 0) {
    console.warn(`Found ${duplicates.length} duplicate sizes: ${duplicates.slice(0, 5).join(', ')}${duplicates.length > 5 ? '...' : ''}`);
    console.groupEnd();
    return false;
  }
  
  // If we've made it this far, the verification is successful
  console.log('✅ Verification successful: The loaded sizes meet all validation criteria.');
  console.groupEnd();
  
  return true;
}

/**
 * Check if the MASSLAM sizes have been loaded
 * @returns {boolean} Whether the MASSLAM sizes have been loaded
 */
export function checkMasslamSizesLoaded() {
  const loaded = getMasslamSizes().length > 0;
  if (!loaded) {
    console.warn('MASSLAM sizes not loaded yet. Make sure to call loadMasslamSizes() before using any functions that depend on it.');
  }
  return loaded;
}

/**
 * Get all available MASSLAM sizes
 * @returns {Array} Array of all available MASSLAM sizes
 */
export function getAllMasslamSizes() {
  return getMasslamSizes();
}

/**
 * Get all available MASSLAM sizes for a specific type
 * @param {string} type - Type of timber (joist, beam, or post)
 * @returns {Array} Array of all available MASSLAM sizes for the specified type
 */
export function getMasslamSizesByType(type) {
  return getMasslamSizes().filter(size => size.type === type);
}

/**
 * Filter the loaded sizes to a specific subset
 * This function will filter the sizes to match the expected 30 sizes (10 widths × 3 types)
 * @returns {Array} Filtered sizes
 */
export function filterToStandardSizes() {
  const sizes = getMasslamSizes();
  
  if (sizes.length === 0) {
    console.warn('MASSLAM sizes not loaded yet, cannot filter');
    return [];
  }
  
  console.log('Filtering sizes to standard subset...');
  
  // Define the standard widths and depths we want to keep
  const standardWidths = [120, 165, 205, 250, 290, 335, 380, 420, 450];
  const standardDepths = [200, 270, 335, 410, 480, 550, 620, 690, 760, 830];
  
  // Create a standard set of sizes (one for each width/type combination)
  const standardSizes = [];
  
  // For each type
  ['beam', 'column', 'joist'].forEach(type => {
    // For each standard width
    standardWidths.forEach(width => {
      // Find the first size with this width and type
      const existingSize = sizes.find(size => 
        size.width === width && size.type === type
      );
      
      if (existingSize) {
        // If we found a matching size, add it to our standard sizes
        standardSizes.push(existingSize);
      } else {
        // If no matching size was found, create one with the smallest standard depth
        const depth = standardDepths[0];
        standardSizes.push({ width, depth, type });
      }
    });
  });
  
  console.log(`Filtered from ${sizes.length} sizes to ${standardSizes.length} standard sizes`);
  
  // Set the filtered sizes
  _setMasslamSizes(standardSizes);
  
  return getMasslamSizes();
}

// For backward compatibility
export const MASSLAM_SIZES = [];
