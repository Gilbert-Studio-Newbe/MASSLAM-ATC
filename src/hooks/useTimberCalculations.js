"use client";

import { useCallback } from 'react';
import { 
  calculateJoistSize as calculateJoistSizeEngineering, 
  calculateBeamSize, 
  calculateColumnSize,
  calculateTimberWeight,
  calculateCarbonSavings,
  validateStructure,
  TIMBER_PROPERTIES,
  loadTimberProperties,
  calculateMasslamBeamSize,
  getFixedWidthForFireRating
} from '../utils/timberEngineering';
import { 
  loadMasslamSizes,
  findNearestWidth,
  findNearestDepth,
  debugMasslamSizes,
  validateAllSizes, 
  initializeMasslamSizes,
  getMasslamSizes,
  verifyLoadedSizes,
  filterToStandardSizes,
  resetMasslamSizes
} from '../utils/timberSizes';
import { calculateFireResistanceAllowance, getMasslamSL33Properties } from '../utils/masslamProperties';

export function useTimberCalculations() {
  /**
   * Calculates beam size for multiple floors
   */
  const calculateMultiFloorBeamSize = useCallback((span, load, joistSpacing, numFloors, fireRating = 'none', joistsRunLengthwise = true, avgBayWidth = 0, avgBayLength = 0, isEdgeBeam = false) => {
    // Calculate tributary width for the beam (in meters)
    // For a more realistic calculation, use half the perpendicular dimension to the beam span
    // If beam spans lengthwise (joists run widthwise), tributary width is half the bay width
    // If beam spans widthwise (joists run lengthwise), tributary width is half the bay length
    let tributaryWidth;
    
    if (avgBayWidth > 0 && avgBayLength > 0) {
      // If we have bay dimensions, use them for a more realistic tributary width
      if (isEdgeBeam) {
        // Edge beams only support load from one side (half the tributary width of interior beams)
        tributaryWidth = joistsRunLengthwise ? avgBayWidth / 4 : avgBayLength / 4;
      } else {
        // Interior beams support load from both sides
        tributaryWidth = joistsRunLengthwise ? avgBayWidth / 2 : avgBayLength / 2;
      }
    } else {
      // Fallback to the old calculation if bay dimensions aren't provided
      tributaryWidth = isEdgeBeam ? joistSpacing / 2 : joistSpacing;
    }
    
    console.log(`Beam tributary width (${isEdgeBeam ? 'edge' : 'interior'}): ${tributaryWidth.toFixed(2)} m`);
    
    // Calculate load per meter of beam (kN/m)
    // load is in kPa (kN/m²), so multiply by tributary width to get kN/m
    let loadPerMeter = load * tributaryWidth;
    console.log(`Initial beam load per meter (without self-weight): ${loadPerMeter.toFixed(2)} kN/m`);
    
    // Calculate theoretical width and depth
    const spanMm = span * 1000; // Convert to mm
    const theoreticalWidth = Math.max(65, Math.ceil(spanMm / 25)); // Simplified calculation
    const theoreticalDepth = Math.max(240, Math.ceil(spanMm / 12)); // Simplified calculation
    
    // Calculate fire resistance allowance if needed
    let fireAllowance = 0;
    if (fireRating && fireRating !== 'none') {
      fireAllowance = calculateFireResistanceAllowance(fireRating);
    }
    
    // Add fire resistance allowance to width and depth
    // For beams, typically 3 sides are exposed (bottom and two sides)
    const fireAdjustedWidth = theoreticalWidth + (2 * fireAllowance); // Both sides exposed
    const fireAdjustedDepth = theoreticalDepth + fireAllowance; // Only bottom exposed
    
    // Find the nearest available width and depth
    const width = findNearestWidth(fireAdjustedWidth);
    const depth = findNearestDepth(width, fireAdjustedDepth);
    
    // Calculate self-weight based on size estimate
    // Convert dimensions to meters
    const beamWidth = width / 1000; // m
    const beamDepth = depth / 1000; // m
    
    // Get timber density from properties (kg/m³)
    const density = TIMBER_PROPERTIES['MASSLAM_SL33']?.density || 600; // Default to 600 kg/m³
    
    // Calculate beam volume per meter (m³/m)
    const beamVolumePerMeter = beamWidth * beamDepth * 1.0; // 1.0 meter length
    
    // Calculate beam weight per meter (kg/m)
    const beamWeightPerMeter = beamVolumePerMeter * density;
    
    // Convert to kN/m (1 kg = 0.00981 kN)
    const beamSelfWeightPerMeter = beamWeightPerMeter * 0.00981;
    
    console.log(`Beam self-weight: ${beamSelfWeightPerMeter.toFixed(2)} kN/m`);
    
    // Add self-weight to the load per meter
    loadPerMeter += beamSelfWeightPerMeter;
    console.log(`Total beam load per meter (with self-weight): ${loadPerMeter.toFixed(2)} kN/m`);
    
    // Calculate total distributed load on the beam (including self-weight)
    const totalDistributedLoad = loadPerMeter * span;
    console.log(`Total distributed load on beam (including self-weight): ${totalDistributedLoad.toFixed(2)} kN`);
    
    console.log(`Beam size before fire adjustment: ${theoreticalWidth}x${theoreticalDepth}mm`);
    console.log(`Beam size after fire adjustment: ${fireAdjustedWidth}x${fireAdjustedDepth}mm`);
    
    return {
      width: width,
      depth: depth,
      span: span,
      tributaryWidth: tributaryWidth,
      loadPerMeter: loadPerMeter,
      selfWeight: beamSelfWeightPerMeter,
      totalDistributedLoad: totalDistributedLoad,
      fireRating: fireRating,
      fireAllowance: fireAllowance,
      isEdgeBeam: isEdgeBeam
    };
  }, []);

  /**
   * Calculates column size for multiple floors
   */
  const calculateMultiFloorColumnSize = useCallback((beamWidth, load, height, floors, fireRating = 'none', bayLength, bayWidth) => {
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
    
    // Calculate column volume (m³)
    const columnVolume = columnWidth * columnDepth * height;
    
    // Calculate column weight (kg)
    const columnWeight = columnVolume * density;
    
    // Convert to kN (1 kg = 0.00981 kN)
    const columnSelfWeight = columnWeight * 0.00981;
    
    // For multi-floor columns, calculate the cumulative self-weight
    // Each floor's column adds weight to the floors below
    let cumulativeSelfWeight = 0;
    for (let i = 1; i <= floors; i++) {
      // Weight of columns from this floor to the top
      cumulativeSelfWeight += columnSelfWeight * (floors - i + 1);
    }
    
    console.log(`Column self-weight per floor: ${columnSelfWeight.toFixed(2)} kN, Cumulative: ${cumulativeSelfWeight.toFixed(2)} kN`);
    
    // Add self-weight to the total load
    const totalLoadWithSelfWeight = load + cumulativeSelfWeight;
    console.log(`Total column load (with self-weight): ${totalLoadWithSelfWeight.toFixed(2)} kN`);
    
    console.log(`Column size before fire adjustment: ${width}x${depth}mm`);
    console.log(`Column size after fire adjustment: ${fireAdjustedWidth}x${fireAdjustedDepth}mm`);
    
    return {
      width: adjustedWidth,
      depth: adjustedDepth,
      height: height,
      load: totalLoadWithSelfWeight,
      tributaryArea: tributaryArea,
      loadPerFloor: loadPerFloor,
      selfWeight: columnSelfWeight,
      cumulativeSelfWeight: cumulativeSelfWeight,
      floors: floors,
      fireRating: fireRating,
      fireAllowance: fireAllowance
    };
  }, []);

  /**
   * Calculates joist size (resolving the duplicate function issue)
   */
  const calculateJoistSize = useCallback((span, spacing, load, timberGrade, fireRating) => {
    // This now directly uses the imported function from timberEngineering.js
    return calculateJoistSizeEngineering(span, spacing, load, timberGrade, fireRating);
  }, []);

  return {
    calculateMultiFloorBeamSize,
    calculateMultiFloorColumnSize,
    calculateJoistSize,
    // Expose other utility functions
    calculateFireResistanceAllowance,
    findNearestWidth,
    findNearestDepth
  };
} 