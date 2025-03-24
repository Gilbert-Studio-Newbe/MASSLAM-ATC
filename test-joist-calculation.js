/**
 * Standalone test script for joist calculation
 * This script directly tests the joist calculator implementation and bypasses Next.js / React
 */

// Define the mock properties needed for testing
const TIMBER_PROPERTIES = {
  ML38: {
    bendingStrength: 38, // MPa
    tensileStrength: 28, // MPa
    compressiveStrength: 38, // MPa
    shearStrength: 4.2, // MPa
    modulusOfElasticity: 14000, // MPa
    density: 600 // kg/m³
  }
};

// Mock the timber-utils import
const timberUtils = {
  TIMBER_PROPERTIES,
  getFixedWidthForFireRating: (fireRating) => 165, // Standard width for joists
  checkMasslamSizesLoaded: () => ({
    sizesLoaded: true,
    availableDepths: {
      joist: [200, 270, 335, 410, 480, 550, 620],
      beam: [300, 380, 450, 530, 600, 680, 760, 830, 900],
      column: [165, 180, 200, 220, 240, 260, 280, 300]
    }
  }),
  calculateFireResistanceAllowance: (fireRating) => 0, // No allowance for 'none' fire rating
  findNearestValue: (value, array) => {
    if (!array.length) return value;
    return array.reduce((prev, curr) => 
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
  }
};

// Mock the joist calculator function
function calculateJoistSize(span, spacing, load, timberGrade, fireRating = 'none', deflectionLimit = 300, safetyFactor = 1.5) {
  console.log(`Calculating for span=${span}m, spacing=${spacing}mm, load=${load}kPa, deflection limit=L/${deflectionLimit}, safety factor=${safetyFactor}`);
  
  // Get timber properties
  const timberProps = timberUtils.TIMBER_PROPERTIES[timberGrade];
  
  // Calculate initial fixed width based on fire rating
  const initialWidth = timberUtils.getFixedWidthForFireRating(fireRating);
  
  // Convert spacing from mm to m
  const spacingM = spacing / 1000;
  
  // Calculate load per meter with safety factor
  const loadPerMeter = load * spacingM * safetyFactor;
  console.log(`Load per meter: ${loadPerMeter.toFixed(2)} kN/m (load ${load} × spacing ${spacingM} × safety factor ${safetyFactor})`);
  
  // Calculate max bending moment
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
  const maxBendingMomentNmm = maxBendingMoment * 1000000;
  
  // Calculate required section modulus
  const bendingStrength = timberProps.bendingStrength;
  const requiredSectionModulus = maxBendingMomentNmm / bendingStrength;
  
  // Calculate required depth based on section modulus
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / initialWidth);
  
  // Calculate deflection limit
  const maxAllowableDeflection = (span * 1000) / deflectionLimit;
  const modulusOfElasticity = timberProps.modulusOfElasticity;
  const spanMm = span * 1000;
  
  // Calculate deflection-governed depth
  const directDeflectionDepth = Math.pow(
    (5 * loadPerMeter * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * maxAllowableDeflection),
    1/3
  ) * Math.pow(12 / initialWidth, 1/3);
  
  // Use the larger of bending and deflection requirements
  let adjustedDepth = Math.max(requiredDepth, directDeflectionDepth);
  let isDeflectionGoverning = directDeflectionDepth > requiredDepth;
  
  console.log(`Depth requirements - Bending: ${requiredDepth.toFixed(1)}mm, Deflection: ${directDeflectionDepth.toFixed(1)}mm`);
  console.log(`Governing criteria: ${isDeflectionGoverning ? 'Deflection' : 'Bending'}`);
  
  // Add fire resistance allowance
  let fireAllowance = timberUtils.calculateFireResistanceAllowance(fireRating);
  
  // Adjusted depth with fire allowance
  const fireAdjustedDepth = Math.max(140, Math.ceil(adjustedDepth)) + fireAllowance;
  
  // Get available depths
  const { availableDepths } = timberUtils.checkMasslamSizesLoaded();
  const joistDepths = availableDepths.joist.sort((a, b) => a - b);
  
  console.log(`Available joist depths: ${joistDepths.join(', ')}mm`);
  console.log(`Required adjusted depth: ${fireAdjustedDepth}mm`);
  
  // Find the next available depth that meets or exceeds the required depth
  const depth = joistDepths.find(d => d >= fireAdjustedDepth) || joistDepths[joistDepths.length - 1];
  
  console.log(`Selected depth: ${depth}mm (next available depth >= ${fireAdjustedDepth}mm)`);
  
  // Selection process logging
  console.log(`Selection process:`);
  joistDepths.forEach(d => {
    const isSelected = d === depth;
    const isSuitable = d >= fireAdjustedDepth;
    console.log(`  ${isSelected ? '✓' : ' '} ${d}mm - ${isSuitable ? 'Suitable' : 'Too small'} (required: ${fireAdjustedDepth.toFixed(1)}mm)`);
  });
  
  // Final deflection check
  const finalMomentOfInertia = (initialWidth * Math.pow(depth, 3)) / 12;
  const finalDeflection = (5 * loadPerMeter * Math.pow(spanMm, 4)) / 
                      (384 * modulusOfElasticity * finalMomentOfInertia);
  
  console.log(`Final selected size: ${initialWidth}×${depth}mm`);
  console.log(`Final deflection: ${finalDeflection.toFixed(1)}mm (limit: ${maxAllowableDeflection.toFixed(1)}mm)`);
  
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

// Run the test
console.log("====== TESTING JOIST CALCULATION WITH 9M SPAN ======");
const span = 9;
const spacing = 800;
const load = 2;
const timberGrade = 'ML38';
const fireRating = 'none';
const deflectionLimit = 300;
const safetyFactor = 1.5;

const result = calculateJoistSize(
  span,
  spacing,
  load,
  timberGrade,
  fireRating,
  deflectionLimit,
  safetyFactor
);

console.log("\nFINAL RESULT:");
console.log(`Width: ${result.width}mm`);
console.log(`Depth: ${result.depth}mm`);
console.log(`Governing: ${result.isDeflectionGoverning ? 'Deflection' : 'Bending'}`);
console.log(`Required depth for bending: ${result.bendingDepth}mm`);
console.log(`Required depth for deflection: ${result.deflectionDepth}mm`);
console.log(`Fire adjusted depth: ${result.fireAdjustedDepth}mm`);

// Verify expected result
const expectedDepth = 480;
if (result.depth === expectedDepth) {
  console.log(`\n✅ SUCCESS: Joist depth matches expected value of ${expectedDepth}mm`);
} else {
  console.log(`\n❌ FAILURE: Expected depth of ${expectedDepth}mm but got ${result.depth}mm`);
}

// Test with different deflection limits to find when we need 480mm
console.log("\n====== TESTING DIFFERENT DEFLECTION LIMITS WITH 9M SPAN ======");
const deflectionLimits = [250, 240, 230, 220, 210, 200, 180, 150];

console.log("Varying deflection limits with 9m span, 800mm spacing, 2kPa load, safety factor 1.5");
deflectionLimits.forEach(limit => {
  const result = calculateJoistSize(
    span,
    spacing,
    load,
    timberGrade,
    fireRating,
    limit,
    safetyFactor
  );
  
  console.log(`\nDeflection limit L/${limit}: Selected depth ${result.depth}mm (required: ${result.fireAdjustedDepth}mm)`);
  
  if (result.depth >= 480) {
    console.log(`FOUND: Depth reaches 480mm with deflection limit L/${limit}`);
  }
});

// Test with different safety factors to find when we need 480mm
console.log("\n====== TESTING DIFFERENT SAFETY FACTORS WITH 9M SPAN ======");
const safetyFactors = [1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0];

console.log("Varying safety factors with 9m span, 800mm spacing, 2kPa load, deflection limit L/300");
safetyFactors.forEach(sf => {
  const result = calculateJoistSize(
    span,
    spacing,
    load,
    timberGrade,
    fireRating,
    deflectionLimit,
    sf
  );
  
  console.log(`\nSafety factor ${sf}: Selected depth ${result.depth}mm (required: ${result.fireAdjustedDepth}mm)`);
  
  if (result.depth >= 480) {
    console.log(`FOUND: Depth reaches 480mm with safety factor ${sf}`);
  }
});

// Test varying load values
console.log("\n====== TESTING DIFFERENT LOADS WITH 9M SPAN ======");
const loads = [2, 2.5, 3, 3.5, 4, 4.5, 5];

console.log("Varying loads with 9m span, 800mm spacing, safety factor 1.5, deflection limit L/300");
loads.forEach(loadValue => {
  const result = calculateJoistSize(
    span,
    spacing,
    loadValue,
    timberGrade,
    fireRating,
    deflectionLimit,
    safetyFactor
  );
  
  console.log(`\nLoad ${loadValue}kPa: Selected depth ${result.depth}mm (required: ${result.fireAdjustedDepth}mm)`);
  
  if (result.depth >= 480) {
    console.log(`FOUND: Depth reaches 480mm with load ${loadValue}kPa`);
  }
}); 