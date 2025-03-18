/**
 * Utility functions for column calculations
 */

import { TIMBER_PROPERTIES } from '../timberEngineering';
import { findNearestWidth, findNearestDepth } from '../timberSizes';
import { calculateFireResistanceAllowance } from '../masslamProperties';

/**
 * Calculate column size for multi-floor buildings
 * 
 * @param {number} beamWidth - Width of the beam in millimeters
 * @param {number} load - Design load in kPa
 * @param {number} height - Column height in meters
 * @param {number} floors - Number of floors 
 * @param {string} fireRating - Required fire rating ('none', '30/30/30', '60/60/60', etc.)
 * @param {number} bayLength - Bay length in meters
 * @param {number} bayWidth - Bay width in meters
 * @returns {Object} Column dimensions and additional calculations
 */
export function calculateMultiFloorColumnSize(beamWidth, load, height, floors, fireRating = 'none', bayLength, bayWidth) {
  // Column width should match beam width
  const width = beamWidth;
  console.log(`Setting column width to match beam width: ${width}mm`);
  
  // Calculate tributary area for the column (in square meters)
  // Each column typically supports a quarter of each of the four adjacent bays
  const tributaryArea = bayLength * bayWidth;
  console.log(`Column tributary area: ${tributaryArea.toFixed(2)} m²`);
  
  // Calculate load based on number of floors and tributary area
  // load is in kPa (kN/m²), so multiply by tributary area to get kN
  const loadPerFloor = load * tributaryArea;
  let totalLoad = loadPerFloor * floors;
  console.log(`Initial column load per floor: ${loadPerFloor.toFixed(2)} kN, Total load (without self-weight): ${totalLoad.toFixed(2)} kN`);
  
  // Calculate minimum depth based on load and height
  // For simplicity, we'll start with the width and increase based on load
  let depth = width;
  
  // Increase depth based on number of floors and load
  if (floors > 1) {
    // Add 50mm per additional floor
    depth += (floors - 1) * 50;
  }
  
  // Ensure depth is at least equal to width (square column)
  depth = Math.max(depth, width);
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Add fire resistance allowance to width and depth
  // For columns, all 4 sides are exposed
  const fireAdjustedWidth = width + (2 * fireAllowance); // Both sides exposed
  const fireAdjustedDepth = depth + (2 * fireAllowance); // Both sides exposed
  
  // Find nearest available width and depth
  const adjustedWidth = findNearestWidth(fireAdjustedWidth);
  const adjustedDepth = findNearestDepth(adjustedWidth, fireAdjustedDepth);
  
  // Calculate self-weight of the column
  // Convert dimensions to meters
  const columnWidth = adjustedWidth / 1000; // m
  const columnDepth = adjustedDepth / 1000; // m
  
  // Get timber density from properties (kg/m³)
  const density = TIMBER_PROPERTIES['MASSLAM_SL33']?.density || 600; // Default to 600 kg/m³
  
  // Calculate column volume per meter (m³/m)
  const columnVolumePerMeter = columnWidth * columnDepth; // 1.0 meter height
  
  // Calculate column weight per meter (kg/m)
  const columnWeightPerMeter = columnVolumePerMeter * density;
  
  // Calculate total column weight (kg)
  const columnWeight = columnWeightPerMeter * height;
  
  // Convert to kN (1 kg = 0.00981 kN)
  const columnSelfWeight = columnWeight * 0.00981;
  
  console.log(`Column self-weight: ${columnSelfWeight.toFixed(2)} kN`);
  
  // Add self-weight to the total load
  totalLoad += columnSelfWeight;
  console.log(`Total column load (with self-weight): ${totalLoad.toFixed(2)} kN`);
  
  console.log(`Column size before fire adjustment: ${width}x${depth}mm`);
  console.log(`Column size after fire adjustment: ${fireAdjustedWidth}x${fireAdjustedDepth}mm`);
  console.log(`Final column size: ${adjustedWidth}x${adjustedDepth}mm`);
  
  return {
    width: adjustedWidth,
    depth: adjustedDepth,
    height: height,
    tributaryArea: tributaryArea,
    loadPerFloor: loadPerFloor,
    totalLoad: totalLoad,
    selfWeight: columnSelfWeight,
    fireRating: fireRating,
    fireAllowance: fireAllowance
  };
}

/**
 * Calculate the volume of columns in the building
 * 
 * @param {Object} columnSize - Column dimensions (width, depth)
 * @param {number} floorHeight - Height of each floor in meters
 * @param {number} numFloors - Number of floors
 * @param {number} lengthwiseBays - Number of bays along the length
 * @param {number} widthwiseBays - Number of bays along the width
 * @returns {number} Total column volume in cubic meters
 */
export function calculateColumnVolume(columnSize, floorHeight, numFloors, lengthwiseBays, widthwiseBays) {
  const columnWidth = columnSize.width / 1000; // Convert mm to m
  const columnDepth = columnSize.depth / 1000; // Convert mm to m
  const columnHeight = floorHeight; // Height per floor in meters
  
  // Total number of columns in the building grid
  const columnCount = (lengthwiseBays + 1) * (widthwiseBays + 1);
  
  // Total height of all columns is column height × number of floors
  const totalColumnHeight = columnHeight * numFloors;
  
  // Calculate total volume of all columns
  const totalColumnVolume = columnWidth * columnDepth * totalColumnHeight * columnCount;
  
  console.log('Column volume calculation details:', {
    columnWidth,
    columnDepth,
    columnHeight,
    columnCount,
    numFloors,
    totalColumnHeight,
    totalColumnVolume
  });
  
  return totalColumnVolume;
} 