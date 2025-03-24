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
 * @param {number} deflectionLimit - User-specified deflection limit (e.g., 300 for L/300)
 * @param {number} safetyFactor - User-specified safety factor (default: 1.5)
 * @returns {Object} Joist size and calculation details
 */
export function calculateJoistSize(span, spacing, load, timberGrade, fireRating = 'none', deflectionLimit = 300, safetyFactor = 1.5) {
  console.log(`[JOIST] Calculating for span=${span}m, spacing=${spacing}mm, load=${load}kPa, grade=${timberGrade}, fire=${fireRating}, deflection limit=L/${deflectionLimit}, safety factor=${safetyFactor}`);
  
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
      fireRating,
      // Include default values for these parameters too
      isDeflectionGoverning: true,
      deflection: 0,
      allowableDeflection: 0,
      bendingDepth: 0,
      deflectionDepth: 0,
      fireAdjustedDepth: 0,
      deflectionLimit,
      safetyFactor
    };
  }
  
  // Get timber properties for calculation
  const timberProps = TIMBER_PROPERTIES[timberGrade] || TIMBER_PROPERTIES.ML38;
  
  // Check if required data is available
  const sizesLoaded = checkMasslamSizesLoaded();
  console.log(`[JOIST] MASSLAM sizes loaded: ${sizesLoaded ? 'YES' : 'NO'}`);
  
  // Get available depths from the MASSLAM sizes data
  const { availableDepths } = checkMasslamSizesLoaded();
  console.log(`[JOIST-DEBUG] Available depths from MASSLAM data:`, availableDepths);
  
  // Calculate initial fixed width based on fire rating
  const initialWidth = getFixedWidthForFireRating(fireRating);
  
  // Convert spacing from mm to m for calculations
  const spacingM = spacing / 1000;
  
  // Calculate load per meter, including safety factor
  const loadPerMeter = load * spacingM * safetyFactor;
  console.log(`[JOIST] Load per meter with safety factor: ${loadPerMeter.toFixed(2)} kN/m (load ${load} × spacing ${spacingM} × safety factor ${safetyFactor})`);
  
  // Calculate max bending moment
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
  const maxBendingMomentNmm = maxBendingMoment * 1000000;
  
  // Calculate required section modulus
  const bendingStrength = timberProps.bendingStrength;
  const requiredSectionModulus = maxBendingMomentNmm / bendingStrength;
  
  // Calculate required depth based on section modulus
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / initialWidth);
  
  // Calculate deflection - using user-specified deflection limit 
  // Higher deflectionLimit values (like 300) are more restrictive than lower values (like 200)
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
  
  // Get available depths for joists from the MASSLAM sizes data
  // These are the standard available joist depths
  const standardDepths = [200, 270, 335, 410, 480, 550, 620];
  const joistDepths = availableDepths?.joist?.length ? availableDepths.joist : standardDepths;
  
  // Sort depths to ensure they're in ascending order
  joistDepths.sort((a, b) => a - b);
  
  console.log(`[JOIST] Available joist depths: ${joistDepths.join(', ')}mm`);
  console.log(`[JOIST] Required adjusted depth: ${fireAdjustedDepth}mm`);
  
  // Find the next available depth that meets or exceeds the required depth
  const depth = joistDepths.find(d => d >= fireAdjustedDepth) || joistDepths[joistDepths.length - 1];
  
  console.log(`[JOIST] Selected depth: ${depth}mm (next available depth >= ${fireAdjustedDepth}mm)`);
  
  // Detailed logging to help debugging
  console.log(`[JOIST-DEBUG] Selection process:`);
  joistDepths.forEach(d => {
    const isSelected = d === depth;
    const isSuitable = d >= fireAdjustedDepth;
    console.log(`  ${isSelected ? '✓' : ' '} ${d}mm - ${isSuitable ? 'Suitable' : 'Too small'} (required: ${fireAdjustedDepth.toFixed(1)}mm)`);
  });
  
  // Final deflection check with selected size
  const finalMomentOfInertia = (initialWidth * Math.pow(depth, 3)) / 12;
  const finalDeflection = (5 * loadPerMeter * Math.pow(spanMm, 4)) / 
                        (384 * modulusOfElasticity * finalMomentOfInertia);
  
  console.log(`[JOIST] Final selected size: ${initialWidth}×${depth}mm`);
  console.log(`[JOIST] Final deflection: ${finalDeflection.toFixed(1)}mm (limit: ${maxAllowableDeflection.toFixed(1)}mm)`);
  
  // Return the calculated joist size and details with explicit span value to ensure it's propagated correctly
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
    fireAdjustedDepth,
    deflectionLimit,
    safetyFactor
  };
}

/**
 * Test function to verify calculation with 9m span
 * This is a standalone function for debugging
 */
export function test9mJoistCalculation() {
  console.log("==== JOIST MODULE: TESTING 9M JOIST CALCULATION ====");
  
  const span = 9; // 9 meters
  const spacing = 800; // 800mm spacing
  const load = 2; // 2kPa
  const timberGrade = 'ML38';
  const fireRating = 'none';
  const deflectionLimit = 300; // L/300
  const safetyFactor = 1.5;

  // Get available depths directly
  const { availableDepths } = checkMasslamSizesLoaded();
  console.log("Available depths from MASSLAM sizes data:", availableDepths);
  
  // Get available joist depths
  const joistDepths = availableDepths ? availableDepths.joist : [200, 270, 335, 410, 480, 550, 620];
  joistDepths.sort((a, b) => a - b);
  console.log("Sorted joist depths:", joistDepths);

  // Run the calculation
  const result = calculateJoistSize(
    span,
    spacing,
    load,
    timberGrade,
    fireRating,
    deflectionLimit,
    safetyFactor
  );

  // Log the results
  console.log('\nRESULT:');
  console.log(`Width: ${result.width}mm`);
  console.log(`Depth: ${result.depth}mm`);
  console.log(`Governing: ${result.isDeflectionGoverning ? 'Deflection' : 'Bending'}`);
  console.log(`Bending depth required: ${result.bendingDepth}mm`);
  console.log(`Deflection depth required: ${result.deflectionDepth}mm`);
  console.log(`Fire adjusted depth: ${result.fireAdjustedDepth}mm`);

  // Verify the expected depth
  const expectedDepth = 480;
  if (result.depth === expectedDepth) {
    console.log(`\n✅ SUCCESS: Joist depth matches expected value of ${expectedDepth}mm`);
  } else {
    console.log(`\n❌ FAILURE: Expected depth of ${expectedDepth}mm but got ${result.depth}mm`);
  }
  console.log("==== END OF TEST ====");
  
  return result;
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