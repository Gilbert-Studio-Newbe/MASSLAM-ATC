/**
 * Utility functions for beam calculations
 */

import { TIMBER_PROPERTIES } from '../timberEngineering';
import { findNearestWidth, findNearestDepth } from '../timberSizes';
import { calculateFireResistanceAllowance } from '../masslamProperties';

/**
 * Calculate beam size for multi-floor buildings
 * 
 * @param {number} span - Beam span in meters
 * @param {number} load - Design load in kPa
 * @param {number} joistSpacing - Spacing between joists in millimeters
 * @param {number} numFloors - Number of floors supported by the beam
 * @param {string} fireRating - Required fire rating ('none', '30/30/30', '60/60/60', etc.)
 * @param {boolean} joistsRunLengthwise - Whether joists run lengthwise
 * @param {number} avgBayWidth - Average bay width in meters
 * @param {number} avgBayLength - Average bay length in meters
 * @param {boolean} isEdgeBeam - Whether the beam is an edge beam
 * @returns {Object} Beam dimensions and additional calculations
 */
export function calculateMultiFloorBeamSize(span, load, joistSpacing, numFloors, fireRating = 'none', joistsRunLengthwise = true, avgBayWidth = 0, avgBayLength = 0, isEdgeBeam = false) {
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
}

/**
 * Calculate the volume of beams in the building
 * 
 * @param {Object} interiorBeamSize - Interior beam dimensions (width, depth)
 * @param {Object} edgeBeamSize - Edge beam dimensions (width, depth)
 * @param {number} buildingLength - Building length in meters
 * @param {number} buildingWidth - Building width in meters
 * @param {number} lengthwiseBays - Number of bays along the length
 * @param {number} widthwiseBays - Number of bays along the width
 * @returns {number} Total beam volume in cubic meters
 */
export function calculateBeamVolume(interiorBeamSize, edgeBeamSize, buildingLength, buildingWidth, lengthwiseBays, widthwiseBays) {
  console.log("VOLUME DEBUG - calculateBeamVolume inputs:", {
    interiorBeamSize,
    edgeBeamSize,
    buildingLength,
    buildingWidth,
    lengthwiseBays,
    widthwiseBays
  });
  
  const interiorBeamWidth = interiorBeamSize.width / 1000; // Convert mm to m
  const interiorBeamDepth = interiorBeamSize.depth / 1000; // Convert mm to m
  const edgeBeamWidth = edgeBeamSize.width / 1000; // Convert mm to m
  const edgeBeamDepth = edgeBeamSize.depth / 1000; // Convert mm to m
  
  // Calculate bay dimensions
  const bayLengthWidth = buildingLength / lengthwiseBays; // Length of each bay
  const bayWidthWidth = buildingWidth / widthwiseBays;   // Width of each bay
  
  // For this calculation, we'll separate by direction to be more accurate
  // Lengthwise beams (run along length of building)
  const lengthwiseInteriorBeamCount = (widthwiseBays - 1);
  const lengthwiseInteriorBeamLength = buildingLength;
  const lengthwiseInteriorBeamVolume = interiorBeamWidth * interiorBeamDepth * lengthwiseInteriorBeamLength * lengthwiseInteriorBeamCount;
  
  const lengthwiseEdgeBeamCount = 2; // Two edge beams along length
  const lengthwiseEdgeBeamLength = buildingLength;
  const lengthwiseEdgeBeamVolume = edgeBeamWidth * edgeBeamDepth * lengthwiseEdgeBeamLength * lengthwiseEdgeBeamCount;
  
  // Widthwise beams (run along width of building)
  const widthwiseInteriorBeamCount = (lengthwiseBays - 1) * (widthwiseBays + 1);
  const widthwiseInteriorBeamLength = bayWidthWidth;
  const widthwiseInteriorBeamVolume = interiorBeamWidth * interiorBeamDepth * widthwiseInteriorBeamLength * widthwiseInteriorBeamCount;
  
  const widthwiseEdgeBeamCount = 2 * lengthwiseBays; // Two edge beams for each bay along width
  const widthwiseEdgeBeamLength = bayWidthWidth;
  const widthwiseEdgeBeamVolume = edgeBeamWidth * edgeBeamDepth * widthwiseEdgeBeamLength * widthwiseEdgeBeamCount;
  
  const totalBeamVolume = 
    lengthwiseInteriorBeamVolume + 
    lengthwiseEdgeBeamVolume + 
    widthwiseInteriorBeamVolume + 
    widthwiseEdgeBeamVolume;
  
  console.log('VOLUME DEBUG - Detailed beam volume calculation:', {
    lengthwiseInteriorBeams: { 
      count: lengthwiseInteriorBeamCount, 
      length: lengthwiseInteriorBeamLength, 
      width: interiorBeamWidth,
      depth: interiorBeamDepth,
      volume: lengthwiseInteriorBeamVolume 
    },
    lengthwiseEdgeBeams: { 
      count: lengthwiseEdgeBeamCount, 
      length: lengthwiseEdgeBeamLength, 
      width: edgeBeamWidth,
      depth: edgeBeamDepth,
      volume: lengthwiseEdgeBeamVolume 
    },
    widthwiseInteriorBeams: { 
      count: widthwiseInteriorBeamCount, 
      length: widthwiseInteriorBeamLength, 
      width: interiorBeamWidth,
      depth: interiorBeamDepth,
      volume: widthwiseInteriorBeamVolume 
    },
    widthwiseEdgeBeams: { 
      count: widthwiseEdgeBeamCount, 
      length: widthwiseEdgeBeamLength, 
      width: edgeBeamWidth,
      depth: edgeBeamDepth,
      volume: widthwiseEdgeBeamVolume 
    },
    totalBeamVolume
  });
  
  console.log(`VOLUME DEBUG - Final beam volume: ${totalBeamVolume}`);
  
  return totalBeamVolume;
} 