// Test for joist calculations
const fs = require('fs');

// Define constants
const TIMBER_PROPERTIES = {
  ML38: {
    bendingStrength: 38,
    tensileStrength: 19,
    compressiveStrength: 38,
    shearStrength: 5.0,
    modulusOfElasticity: 14500,
    density: 600
  }
};

// Function to calculate joist size
function calculateJoistSize(span, spacing, load, timberGrade, fireRating = 'none', deflectionLimit = 300, safetyFactor = 1.5) {
  // Get timber properties for calculation
  const timberProps = TIMBER_PROPERTIES[timberGrade] || TIMBER_PROPERTIES.ML38;
  
  // Calculate initial fixed width based on fire rating
  const initialWidth = 120; // Simplified for test
  
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
  
  // Adjusted depth with fire allowance (0 for 'none')
  const fireAdjustedDepth = Math.max(140, Math.ceil(adjustedDepth));
  
  // Get available depths for joists
  const joistDepths = [200, 270, 335, 410, 480, 550, 620];
  
  // Find the next available depth that meets or exceeds the required depth
  const depth = joistDepths.find(d => d >= fireAdjustedDepth) || joistDepths[joistDepths.length - 1];
  
  return {
    span,
    width: initialWidth,
    depth,
    bending: Math.ceil(requiredDepth),
    deflection: Math.ceil(directDeflectionDepth),
    adjustedDepth: fireAdjustedDepth,
    isDeflectionGoverning
  };
}

// Parameters
const spacing = 800; // mm
const span = 6.0; // m
const load = 3.0; // kPa
const timberGrade = 'ML38';
const fireRating = 'none';
const safetyFactor = 1.5;

// Test with different deflection limits
const deflectionLimits = [200, 300, 400, 500];
const results = deflectionLimits.map(deflectionLimit => 
  calculateJoistSize(span, spacing, load, timberGrade, fireRating, deflectionLimit, safetyFactor)
);

// Format results
console.log('Defl Limit | Width (mm) | Depth (mm) | Bending (mm) | Deflection (mm) | Adjusted (mm) | Governing');
console.log('----------|------------|------------|--------------|----------------|---------------|----------');
results.forEach((r, i) => {
  console.log(`      ${deflectionLimits[i]} | ${r.width.toString().padStart(10)} | ${r.depth.toString().padStart(9)} | ${r.bending.toString().padStart(11)} | ${r.deflection.toString().padStart(14)} | ${r.adjustedDepth.toString().padStart(12)} | ${r.isDeflectionGoverning ? 'Deflection' : 'Bending'}`);
});
