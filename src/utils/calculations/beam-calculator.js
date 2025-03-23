/**
 * beam-calculator.js - Focused solely on beam calculations
 */

import { 
  TIMBER_PROPERTIES, 
  findNearestValue, 
  getFixedWidthForFireRating,
  checkMasslamSizesLoaded,
  findNearestWidth,
  findNearestDepth,
  calculateFireResistanceAllowance
} from '../timber-utils';

/**
 * Calculate beam size based on span, load, and tributary width
 * @param {number} span - Span in meters
 * @param {number} load - Load in kPa
 * @param {string} timberGrade - Timber grade (e.g., 'ML38')
 * @param {number} tributaryWidth - Tributary width in meters
 * @param {string} fireRating - Fire rating ('none', '30/30/30', etc.)
 * @returns {Object} Beam size and calculation details
 */
export function calculateBeamSize(span, load, timberGrade, tributaryWidth, fireRating = 'none') {
  console.log(`[BEAM] Calculating for span=${span}m, load=${load}kPa, tributary=${tributaryWidth}m, fire=${fireRating}`);
  
  // Validate inputs
  if (!span || span <= 0 || !load || load <= 0 || !tributaryWidth || tributaryWidth <= 0) {
    console.error("[BEAM] Invalid beam calculation parameters:", { span, load, tributaryWidth });
    return { 
      width: 205, 
      depth: 335,
      error: "Invalid input parameters",
      span,
      load,
      tributaryWidth,
      grade: timberGrade,
      fireRating
    };
  }
  
  // Get timber properties
  const timberProps = TIMBER_PROPERTIES[timberGrade] || TIMBER_PROPERTIES.ML38;
  
  // Calculate load per meter
  const loadPerMeter = load * tributaryWidth;
  
  // Calculate maximum bending moment
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
  const maxBendingMomentNmm = maxBendingMoment * 1000000;
  
  // Get initial width based on fire rating
  const initialWidth = getFixedWidthForFireRating(fireRating);
  
  // Calculate required section modulus and depth
  const bendingStrength = timberProps.bendingStrength;
  const requiredSectionModulus = maxBendingMomentNmm / bendingStrength;
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / initialWidth);
  
  // Check deflection
  const maxAllowableDeflection = (span * 1000) / 300; // span/300
  const modulusOfElasticity = timberProps.modulusOfElasticity;
  const spanMm = span * 1000;
  
  // Calculate direct deflection-governed depth
  const directDeflectionDepth = Math.pow(
    (5 * loadPerMeter * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * maxAllowableDeflection),
    1/3
  ) * Math.pow(12 / initialWidth, 1/3);
  
  // Use the larger of bending and deflection requirements
  let adjustedDepth = Math.max(requiredDepth, directDeflectionDepth);
  let isDeflectionGoverning = directDeflectionDepth > requiredDepth;
  
  console.log(`[BEAM] Depth requirements - Bending: ${requiredDepth.toFixed(1)}mm, Deflection: ${directDeflectionDepth.toFixed(1)}mm`);
  console.log(`[BEAM] Governing criteria: ${isDeflectionGoverning ? 'Deflection' : 'Bending'}`);
  
  // Add fire resistance allowance
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // For beams, typically 3 sides are exposed (bottom and two sides)
  const fireAdjustedWidth = initialWidth + (2 * fireAllowance);
  const fireAdjustedDepth = Math.max(240, Math.ceil(adjustedDepth)) + fireAllowance;
  
  // Find nearest standard sizes
  const width = findNearestWidth(fireAdjustedWidth);
  const depth = findNearestDepth(width, fireAdjustedDepth, 'beam');
  
  // Calculate final properties
  const finalSectionModulus = (width * Math.pow(depth, 2)) / 6;
  const finalMomentOfInertia = (width * Math.pow(depth, 3)) / 12;
  const finalDeflection = (5 * loadPerMeter * Math.pow(spanMm, 4)) / 
                          (384 * modulusOfElasticity * finalMomentOfInertia);
  
  console.log(`[BEAM] Final selected size: ${width}×${depth}mm`);
  console.log(`[BEAM] Final deflection: ${finalDeflection.toFixed(1)}mm (limit: ${maxAllowableDeflection.toFixed(1)}mm)`);
  
  // Return detailed result
  return {
    width,
    depth,
    span,
    load,
    tributaryWidth,
    loadPerMeter,
    grade: timberGrade,
    fireRating,
    fireAllowance,
    engineering: {
      bendingMoment: maxBendingMoment,
      requiredSectionModulus,
      finalSectionModulus,
      allowableDeflection: maxAllowableDeflection,
      actualDeflection: finalDeflection
    }
  };
}

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
export function calculateMultiFloorBeamSize(
  span, 
  load, 
  joistSpacing, 
  numFloors, 
  fireRating = 'none', 
  joistsRunLengthwise = true, 
  avgBayWidth = 0, 
  avgBayLength = 0, 
  isEdgeBeam = false
) {
  console.log(`[BEAM] Multi-floor beam calculation for span=${span}m, load=${load}kPa, floors=${numFloors}`);
  console.log(`[BEAM] Configuration: ${isEdgeBeam ? 'Edge beam' : 'Interior beam'}, joists run ${joistsRunLengthwise ? 'lengthwise' : 'widthwise'}`);
  
  // Calculate tributary width for the beam (in meters)
  let tributaryWidth;
  
  if (avgBayWidth > 0 && avgBayLength > 0) {
    // If we have bay dimensions, use them for a more realistic tributary width
    if (isEdgeBeam) {
      // Edge beams support half of one bay
      tributaryWidth = joistsRunLengthwise ? avgBayWidth / 2 : avgBayLength / 2;
    } else {
      // Interior beams support half of the bay on each side
      // For uniform bay sizes, this is approximately the full bay width
      tributaryWidth = joistsRunLengthwise ? avgBayWidth : avgBayLength;
    }
  } else {
    // Fallback calculation if bay dimensions aren't provided
    tributaryWidth = isEdgeBeam ? 2.5 : 5.0;
  }
  
  // Convert the joistSpacing from millimeters to meters if needed
  const joistSpacingM = typeof joistSpacing === 'number' ? joistSpacing / 1000 : 0.8;
  
  // Scale the load by the number of floors
  const scaledLoad = load * numFloors;
  
  console.log(`[BEAM] Tributary width=${tributaryWidth.toFixed(2)}m, scaled load=${scaledLoad.toFixed(2)}kPa`);
  
  // Use the base beam calculation with scaled parameters
  return calculateBeamSize(span, scaledLoad, 'ML38', tributaryWidth, fireRating);
}

/**
 * Calculate the volume of beams in the building
 * 
 * @param {Object} interiorBeamSize - Interior beam dimensions (width, depth)
 * @param {Object} edgeBeamSize - Edge beam dimensions (width, depth)
 * @param {number} buildingLength - Building length in meters
 * @param {number} buildingWidth - Building width in meters
 * @param {number} lengthwiseBays - Number of bays in the length direction
 * @param {number} widthwiseBays - Number of bays in the width direction
 * @returns {number} Total beam volume in cubic meters
 */
export function calculateBeamVolume(
  interiorBeamSize, 
  edgeBeamSize, 
  buildingLength, 
  buildingWidth, 
  lengthwiseBays, 
  widthwiseBays,
  joistsRunLengthwise
) {
  // Convert beam dimensions from mm to m
  const interiorBeamWidth = interiorBeamSize.width / 1000;
  const interiorBeamDepth = interiorBeamSize.depth / 1000;
  const edgeBeamWidth = edgeBeamSize.width / 1000;
  const edgeBeamDepth = edgeBeamSize.depth / 1000;
  
  // Determine which directions have beams based on joist direction
  // Beams run perpendicular to joists
  let lengthwiseBeams = 0;
  let widthwiseBeams = 0;
  
  if (joistsRunLengthwise) {
    // If joists run lengthwise, beams run widthwise only
    widthwiseBeams = (lengthwiseBays + 1);
  } else {
    // If joists run widthwise, beams run lengthwise only
    lengthwiseBeams = (widthwiseBays + 1);
  }
  
  // Calculate the volume of interior and edge beams
  let totalVolume = 0;
  
  // Add volume of lengthwise beams if there are any
  if (lengthwiseBeams > 0) {
    // Interior lengthwise beams (all except the two edge beams)
    const interiorLengthwiseBeamCount = Math.max(0, lengthwiseBeams - 2);
    const interiorLengthwiseBeamVolume = interiorBeamWidth * interiorBeamDepth * buildingLength * interiorLengthwiseBeamCount;
    
    // Edge lengthwise beams (two of them, one on each side)
    const edgeLengthwiseBeamVolume = edgeBeamWidth * edgeBeamDepth * buildingLength * 2;
    
    totalVolume += interiorLengthwiseBeamVolume + edgeLengthwiseBeamVolume;
  }
  
  // Add volume of widthwise beams if there are any
  if (widthwiseBeams > 0) {
    // Interior widthwise beams (all except the two edge beams)
    const interiorWidthwiseBeamCount = Math.max(0, widthwiseBeams - 2);
    const interiorWidthwiseBeamVolume = interiorBeamWidth * interiorBeamDepth * buildingWidth * interiorWidthwiseBeamCount;
    
    // Edge widthwise beams (two of them, one on each side)
    const edgeWidthwiseBeamVolume = edgeBeamWidth * edgeBeamDepth * buildingWidth * 2;
    
    totalVolume += interiorWidthwiseBeamVolume + edgeWidthwiseBeamVolume;
  }
  
  console.log('[BEAM] Volume calculation details:', {
    interiorBeamDimensions: `${interiorBeamWidth}×${interiorBeamDepth}m`,
    edgeBeamDimensions: `${edgeBeamWidth}×${edgeBeamDepth}m`,
    lengthwiseBeams,
    widthwiseBeams,
    totalVolume
  });
  
  return totalVolume;
} 