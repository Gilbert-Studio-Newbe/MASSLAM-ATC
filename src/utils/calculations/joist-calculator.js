/**
 * joist-calculator.js - Focused solely on joist calculations
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
 * Calculate joist size based on span, spacing, and load using proper structural engineering principles
 * @param {number} span - Span in meters
 * @param {number} spacing - Spacing between joists in mm
 * @param {number} load - Load in kPa
 * @param {string} timberGrade - Timber grade (e.g., 'ML38')
 * @param {string} fireRating - Fire rating ('none', '30/30/30', etc.)
 * @returns {Object} Joist size and calculation details
 */
export function calculateJoistSize(span, spacing, load, timberGrade, fireRating = 'none') {
  console.log(`[JOIST] Calculating for span=${span}m, spacing=${spacing}mm, load=${load}kPa, grade=${timberGrade}, fire=${fireRating}`);
  
  // Validate inputs more strictly
  if (!span || span <= 0 || !spacing || spacing <= 0 || !load || load <= 0) {
    console.error("[JOIST] Invalid input parameters:", { span, spacing, load });
    return { 
      width: 165, 
      depth: 270,
      error: "Invalid input parameters",
      span,
      spacing,
      load,
      grade: timberGrade,
      fireRating
    };
  }
  
  // Get timber properties for calculation
  const timberProps = TIMBER_PROPERTIES[timberGrade] || TIMBER_PROPERTIES.ML38;
  
  // Check if required data is available
  const sizesLoaded = checkMasslamSizesLoaded();
  console.log(`[JOIST] MASSLAM sizes loaded: ${sizesLoaded ? 'YES' : 'NO'}`);
  
  // Calculate initial fixed width based on fire rating
  const initialWidth = getFixedWidthForFireRating(fireRating);
  
  // Convert spacing from mm to m for calculations
  const spacingM = spacing / 1000;
  
  // Calculate load per meter
  const loadPerMeter = load * spacingM;
  
  // Calculate max bending moment
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
  const maxBendingMomentNmm = maxBendingMoment * 1000000;
  
  // Calculate required section modulus
  const bendingStrength = timberProps.bendingStrength;
  const requiredSectionModulus = maxBendingMomentNmm / bendingStrength;
  
  // Calculate required depth based on section modulus
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / initialWidth);
  
  // Calculate deflection - more accurate for short and long spans
  const deflectionLimit = load >= 5.0 ? 400 : (load >= 3.0 ? 360 : 300);
  const maxAllowableDeflection = (span * 1000) / deflectionLimit;
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
  
  console.log(`[JOIST] Depth requirements - Bending: ${requiredDepth.toFixed(1)}mm, Deflection: ${directDeflectionDepth.toFixed(1)}mm`);
  console.log(`[JOIST] Governing criteria: ${isDeflectionGoverning ? 'Deflection' : 'Bending'}`);
  
  // Add fire resistance allowance
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Adjusted depth with fire allowance
  const fireAdjustedDepth = Math.max(140, Math.ceil(adjustedDepth)) + fireAllowance;
  
  // Standard available depths
  const standardDepths = [200, 270, 335, 410, 480, 550, 620];
  
  // Apply different depth selection logic based on span length
  let depth;
  
  // Check specifically for long spans (8.5m+)
  const isLongSpan = span >= 8.5;
  
  if (isLongSpan) {
    console.log(`[JOIST] Long span detected (${span}m) - Enforcing minimum depth requirements`);
    const longSpanMinDepth = 410;
    const minIndex = standardDepths.indexOf(longSpanMinDepth);
    
    // Find the first depth >= fireAdjustedDepth starting from longSpanMinDepth
    const validDepths = standardDepths.slice(minIndex);
    depth = validDepths.find(d => d >= fireAdjustedDepth) || validDepths[validDepths.length - 1];
  } else {
    // For normal spans, just find the nearest standard depth
    depth = findNearestValue(fireAdjustedDepth, standardDepths);
  }
  
  // Extra check specifically for 9m spans
  if (span >= 9.0 && depth < 410) {
    console.log(`[JOIST] Critical 9m span detected - Enforcing 410mm minimum depth`);
    depth = 410;
  }
  
  // Final deflection check with selected size
  const finalMomentOfInertia = (initialWidth * Math.pow(depth, 3)) / 12;
  const finalDeflection = (5 * loadPerMeter * Math.pow(spanMm, 4)) / 
                        (384 * modulusOfElasticity * finalMomentOfInertia);
  
  console.log(`[JOIST] Final selected size: ${initialWidth}×${depth}mm`);
  console.log(`[JOIST] Final deflection: ${finalDeflection.toFixed(1)}mm (limit: ${maxAllowableDeflection.toFixed(1)}mm)`);
  
  // Return the calculated joist size and details
  return {
    width: initialWidth,
    depth,
    span,
    spacing,
    load,
    grade: timberGrade,
    fireRating,
    isDeflectionGoverning,
    deflection: finalDeflection,
    allowableDeflection: maxAllowableDeflection,
    bendingDepth: Math.ceil(requiredDepth),
    deflectionDepth: Math.ceil(directDeflectionDepth),
    fireAdjustedDepth
  };
}

/**
 * Calculate the volume of joists in the building
 * 
 * @param {Object} joistSize - Joist dimensions (width, depth)
 * @param {number} buildingLength - Building length in meters
 * @param {number} buildingWidth - Building width in meters
 * @param {number} joistSpacing - Spacing between joists in meters (typically 0.8)
 * @param {boolean} joistsRunLengthwise - Whether joists run lengthwise
 * @returns {number} Total joist volume in cubic meters
 */
export function calculateJoistVolume(joistSize, buildingLength, buildingWidth, joistSpacing, joistsRunLengthwise) {
  const joistWidth = joistSize.width / 1000; // Convert mm to m
  const joistDepth = joistSize.depth / 1000; // Convert mm to m
  
  let joistCount;
  let avgJoistLength;
  
  if (joistsRunLengthwise) {
    // Joists run lengthwise
    joistCount = Math.ceil(buildingWidth / joistSpacing);
    avgJoistLength = buildingLength;
  } else {
    // Joists run widthwise
    joistCount = Math.ceil(buildingLength / joistSpacing);
    avgJoistLength = buildingWidth;
  }
  
  const totalVolume = joistWidth * joistDepth * avgJoistLength * joistCount;
  
  console.log('[JOIST] Volume calculation details:', {
    joistWidth,
    joistDepth,
    joistCount,
    avgJoistLength,
    totalVolume
  });
  
  return totalVolume;
} 