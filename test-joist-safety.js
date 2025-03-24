// Test script for safety factors in joist calculations

// Mock the utility functions that are imported in the real calculator
const mockTimberUtils = {
  TIMBER_PROPERTIES: {
    ML38: {
      bendingStrength: 38,
      tensileStrength: 19,
      compressiveStrength: 38,
      shearStrength: 5.0,
      modulusOfElasticity: 14500,
      density: 600
    }
  },
  getFixedWidthForFireRating: () => 120,
  checkMasslamSizesLoaded: () => ({
    availableDepths: {
      joist: [200, 270, 335, 410, 480, 550, 620]
    }
  }),
  calculateFireResistanceAllowance: () => 0
};

// Create a simple mock implementation of the joist calculator
function calculateJoistSize(span, spacing, load, timberGrade, fireRating = 'none', deflectionLimit = 300, safetyFactor = 1.5) {
  // Get timber properties for calculation
  const timberProps = mockTimberUtils.TIMBER_PROPERTIES[timberGrade] || mockTimberUtils.TIMBER_PROPERTIES.ML38;
  
  // Calculate initial fixed width based on fire rating
  const initialWidth = mockTimberUtils.getFixedWidthForFireRating(fireRating);
  
  // Convert spacing from mm to m for calculations
  const spacingM = spacing / 1000;
  
  // Calculate load per meter, including safety factor
  const loadPerMeter = load * spacingM * safetyFactor;
  
  // Calculate max bending moment
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
  const maxBendingMomentNmm = maxBendingMoment * 1000000;
  
  // Calculate required section modulus
  const bendingStrength = timberProps.bendingStrength;
  const requiredSectionModulus = maxBendingMomentNmm / bendingStrength;
  
  // Calculate required depth based on section modulus
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / initialWidth);
  
  // Calculate deflection - using user-specified deflection limit 
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
  
  // Add fire resistance allowance
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = mockTimberUtils.calculateFireResistanceAllowance(fireRating);
  }
  
  // Adjusted depth with fire allowance
  const fireAdjustedDepth = Math.max(140, Math.ceil(adjustedDepth)) + fireAllowance;
  
  // Get available depths for joists from the MASSLAM sizes data
  const { availableDepths } = mockTimberUtils.checkMasslamSizesLoaded();
  const joistDepths = availableDepths ? availableDepths.joist : [200, 270, 335, 410, 480, 550, 620];
  
  // Sort depths to ensure they're in ascending order
  joistDepths.sort((a, b) => a - b);
  
  // Find the next available depth that meets or exceeds the required depth
  const depth = joistDepths.find(d => d >= fireAdjustedDepth) || joistDepths[joistDepths.length - 1];
  
  // Final deflection check with selected size
  const finalMomentOfInertia = (initialWidth * Math.pow(depth, 3)) / 12;
  const finalDeflection = (5 * loadPerMeter * Math.pow(spanMm, 4)) / 
                        (384 * modulusOfElasticity * finalMomentOfInertia);
  
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
    fireAdjustedDepth,
    loadPerMeter,
    safetyFactor
  };
}

// Fixed parameters for testing
const span = 6.0; // m
const spacing = 800; // mm
const load = 3.0; // kPa
const timberGrade = 'ML38';
const fireRating = 'none';
const deflectionLimit = 300;

// Test with different safety factors
const safetyFactors = [1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

// Display the test parameters
console.log('Test Parameters:');
console.log(`- Span: ${span}m`);
console.log(`- Spacing: ${spacing}mm`);
console.log(`- Load: ${load}kPa`);
console.log(`- Timber Grade: ${timberGrade}`);
console.log(`- Fire Rating: ${fireRating}`);
console.log(`- Deflection Limit: L/${deflectionLimit}`);
console.log('\n');

// Run the tests
console.log('Safety | Load/m (kN) | Width (mm) | Depth (mm) | Bending (mm) | Deflection (mm) | Governing');
console.log('-------|-------------|------------|------------|--------------|----------------|----------');

safetyFactors.forEach(safetyFactor => {
  const result = calculateJoistSize(span, spacing, load, timberGrade, fireRating, deflectionLimit, safetyFactor);
  console.log(`  ${safetyFactor.toFixed(1).padStart(4)} | ${result.loadPerMeter.toFixed(2).padStart(11)} | ${result.width.toString().padStart(10)} | ${result.depth.toString().padStart(9)} | ${result.bendingDepth.toString().padStart(11)} | ${result.deflectionDepth.toString().padStart(14)} | ${result.isDeflectionGoverning ? 'Deflection' : 'Bending'}`);
}); 