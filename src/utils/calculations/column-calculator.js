/**
 * column-calculator.js - Focused solely on column calculations
 */

import { 
  TIMBER_PROPERTIES, 
  getFixedWidthForFireRating,
  checkMasslamSizesLoaded,
  findNearestWidth,
  findNearestDepth,
  calculateFireResistanceAllowance
} from '../timber-utils';

/**
 * Calculate column size based on height and load
 * @param {number} height - Column height in meters
 * @param {number} load - Axial load in kN
 * @param {string} timberGrade - Timber grade (e.g., 'ML38')
 * @param {string} fireRating - Fire rating ('none', '30/30/30', etc.)
 * @returns {Object} Column size and calculation details
 */
export function calculateColumnSize(height, load, timberGrade, fireRating = 'none') {
  console.log(`[COLUMN] Calculating for height=${height}m, load=${load}kN, grade=${timberGrade}, fire=${fireRating}`);
  
  // Validate inputs
  if (!height || height <= 0 || !load || load <= 0) {
    console.error("[COLUMN] Invalid column calculation parameters:", { height, load });
    return { 
      width: 335, 
      depth: 335,
      error: "Invalid input parameters",
      height,
      load,
      grade: timberGrade,
      fireRating
    };
  }
  
  // Get timber properties
  const timberProps = TIMBER_PROPERTIES[timberGrade] || TIMBER_PROPERTIES.ML38;
  
  // Get fixed width based on fire rating
  const fixedWidth = getFixedWidthForFireRating(fireRating);
  
  // For columns, typically we want square sections for stability
  const fixedDepth = fixedWidth;
  
  // Calculate fire resistance allowance
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Add fire allowance to all sides (all 4 sides are typically exposed)
  const fireAdjustedWidth = fixedWidth + (2 * fireAllowance);
  const fireAdjustedDepth = fixedDepth + (2 * fireAllowance);
  
  // Find nearest available standard size
  const width = findNearestWidth(fireAdjustedWidth);
  const depth = findNearestDepth(width, fireAdjustedDepth, 'column');
  
  console.log(`[COLUMN] Final selected size: ${width}×${depth}mm`);
  
  // Return the calculated column size
  return {
    width,
    depth,
    height,
    load,
    grade: timberGrade,
    fireRating,
    fireAllowance
  };
}

/**
 * Calculate column size for multi-floor buildings
 * 
 * @param {number} height - Floor-to-floor height in meters
 * @param {number} load - Load per floor in kPa
 * @param {number} numFloors - Number of floors supported by the column
 * @param {number} tributaryArea - Tributary area in square meters
 * @param {string} fireRating - Required fire rating ('none', '30/30/30', '60/60/60', etc.)
 * @returns {Object} Column dimensions
 */
export function calculateMultiFloorColumnSize(height, load, numFloors, tributaryArea, fireRating = 'none') {
  console.log(`[COLUMN] Multi-floor column calculation for height=${height}m, load=${load}kPa, floors=${numFloors}, tributary area=${tributaryArea}m²`);
  
  // Calculate axial load
  // Convert distributed load (kPa) to point load (kN) using tributary area
  const loadPerFloor = load * tributaryArea; // kN per floor
  const totalLoad = loadPerFloor * numFloors; // kN total
  
  // Add self-weight for a preliminary estimate (can refine after size is determined)
  // Assume average column dimensions and timber density for initial estimate
  const preliminaryColumnWeight = 0.3 * 0.3 * height * numFloors * 600 / 1000; // kN
  const axialLoad = totalLoad + preliminaryColumnWeight;
  
  console.log(`[COLUMN] Calculated axial load: ${axialLoad.toFixed(2)}kN (${totalLoad.toFixed(2)}kN load + ${preliminaryColumnWeight.toFixed(2)}kN self-weight)`);
  
  // Use the base column calculation with the computed axial load
  return calculateColumnSize(height, axialLoad, 'ML38', fireRating);
}

/**
 * Calculate column volume for a building
 * 
 * @param {Object} columnSize - Column dimensions (width, depth)
 * @param {number} buildingLength - Building length in meters
 * @param {number} buildingWidth - Building width in meters
 * @param {number} lengthwiseBays - Number of bays in the length direction
 * @param {number} widthwiseBays - Number of bays in the width direction
 * @param {number} floorHeight - Height of each floor in meters
 * @param {number} numFloors - Number of floors in the building
 * @returns {number} Total column volume in cubic meters
 */
export function calculateColumnVolume(
  columnSize, 
  buildingLength, 
  buildingWidth, 
  lengthwiseBays, 
  widthwiseBays, 
  floorHeight, 
  numFloors
) {
  // Convert column dimensions from mm to m
  const columnWidth = columnSize.width / 1000;
  const columnDepth = columnSize.depth / 1000;
  
  // Calculate number of columns
  // One column at each grid intersection
  const columnCount = (lengthwiseBays + 1) * (widthwiseBays + 1);
  
  // Calculate total column height per column
  const columnHeight = floorHeight * numFloors;
  
  // Calculate total volume
  const totalVolume = columnWidth * columnDepth * columnHeight * columnCount;
  
  console.log('[COLUMN] Volume calculation details:', {
    columnDimensions: `${columnWidth}×${columnDepth}m`,
    columnCount,
    heightPerColumn: columnHeight,
    totalVolume
  });
  
  return totalVolume;
} 