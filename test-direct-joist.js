// Test script to directly calculate joist size for a 9m span
// Run with: node test-direct-joist.js

// Import required modules
const fs = require('fs');

// Mock the timber utils environment
const timberUtils = {
  TIMBER_PROPERTIES: {
    ML38: {
      bendingStrength: 38.0,      // MPa
      modulusOfElasticity: 14000,  // MPa
      density: 600                 // kg/m³
    }
  },
  findNearestValue: (value, array) => {
    return array.reduce((prev, curr) => 
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
  },
  getFixedWidthForFireRating: (fireRating) => 165, // Fixed width for MASSLAM joists (mm)
  checkMasslamSizesLoaded: () => {
    return {
      loaded: true,
      availableDepths: {
        joist: [200, 270, 335, 410, 480, 550, 620]
      }
    };
  },
  calculateFireResistanceAllowance: (fireRating) => 0 // No fire allowance for this test
};

// Calculate joist size
function calculateJoistSize(span, spacing, load, timberGrade, fireRating = 'none', deflectionLimit = 300, safetyFactor = 1.5) {
  console.log(`Calculating for span=${span}m, spacing=${spacing}mm, load=${load}kPa, deflection limit=L/${deflectionLimit}, safety factor=${safetyFactor}`);
  
  // Get timber properties for calculation
  const timberProps = timberUtils.TIMBER_PROPERTIES.ML38;
  
  // Get available depths from the MASSLAM sizes data
  const { availableDepths } = timberUtils.checkMasslamSizesLoaded();
  console.log(`Available depths:`, availableDepths.joist);
  
  // Calculate initial fixed width based on fire rating
  const initialWidth = timberUtils.getFixedWidthForFireRating(fireRating);
  
  // Convert spacing from mm to m for calculations
  const spacingM = spacing / 1000;
  
  // Calculate load per meter, including safety factor
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
  
  console.log(`Depth requirements - Bending: ${requiredDepth.toFixed(1)}mm, Deflection: ${directDeflectionDepth.toFixed(1)}mm`);
  console.log(`Governing criteria: ${isDeflectionGoverning ? 'Deflection' : 'Bending'}`);
  
  // Adjusted depth without fire allowance
  const fireAdjustedDepth = Math.max(140, Math.ceil(adjustedDepth));
  
  // Get available depths for joists from the MASSLAM sizes data
  const joistDepths = availableDepths.joist;
  
  // Sort depths to ensure they're in ascending order
  joistDepths.sort((a, b) => a - b);
  
  console.log(`Required adjusted depth: ${fireAdjustedDepth}mm`);
  
  // Find the next available depth that meets or exceeds the required depth
  const depth = joistDepths.find(d => d >= fireAdjustedDepth) || joistDepths[joistDepths.length - 1];
  
  console.log(`Selected depth: ${depth}mm (next available depth >= ${fireAdjustedDepth}mm)`);
  
  // Detailed logging to help debugging
  console.log(`Selection process:`);
  joistDepths.forEach(d => {
    const isSelected = d === depth;
    const isSuitable = d >= fireAdjustedDepth;
    console.log(`  ${isSelected ? '✓' : ' '} ${d}mm - ${isSuitable ? 'Suitable' : 'Too small'} (required: ${fireAdjustedDepth.toFixed(1)}mm)`);
  });
  
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
    bendingDepth: Math.ceil(requiredDepth),
    deflectionDepth: Math.ceil(directDeflectionDepth),
    fireAdjustedDepth,
    deflectionLimit,
    safetyFactor
  };
}

// Run the test
const span = 9;
const spacing = 800; // 800mm
const load = 2; // 2kPa
const result = calculateJoistSize(span, spacing, load, 'ML38');

// Print the result
console.log('\nRESULT:');
console.log(`Width: ${result.width}mm`);
console.log(`Depth: ${result.depth}mm`);
console.log(`Governing: ${result.isDeflectionGoverning ? 'Deflection' : 'Bending'}`);
console.log(`Required depth for bending: ${result.bendingDepth}mm`);
console.log(`Required depth for deflection: ${result.deflectionDepth}mm`); 