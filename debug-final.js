// Final debug script showing complete joist size calculation process
// This script logs every step of the process and validates against actual CSV data

console.log("FINAL JOIST CALCULATION DEBUGGING TOOL");
console.log("======================================\n");

// CSV Data from masslam_sizes.csv
const MASSLAM_SIZES = [
  // Showing only the 250mm width options for joists for clarity
  { width: 250, depth: 200, type: "joist" },
  { width: 250, depth: 270, type: "joist" },
  { width: 250, depth: 335, type: "joist" },
  { width: 250, depth: 410, type: "joist" },
  { width: 250, depth: 480, type: "joist" },
  { width: 250, depth: 550, type: "joist" },
  { width: 250, depth: 620, type: "joist" }
];

// Timber mechanical properties from ML38_Mechanical_Properties.csv
const TIMBER_PROPERTIES = {
  bendingStrength: 38, // MPa
  modulusOfElasticity: 14500, // MPa
  shearStrength: 5.0, // MPa
  density: 600 // kg/m3
};

// ------------------------------------------------------
// Calculation parameters - can be adjusted for testing
// ------------------------------------------------------

const span = 9.0; // meters
const spacing = 800; // mm
const load = 3.0; // kPa (Commercial load)
const fireRating = '120/120/120';
const width = 250; // mm - standard joist width

// ------------------------------------------------------
// Helper functions - mimic the production code
// ------------------------------------------------------

function findNearestDepth(width, targetDepth) {
  console.log(`\nFinding nearest depth for width=${width}mm and targetDepth=${targetDepth}mm`);
  
  // Filter depths available for the given width
  const availableDepths = MASSLAM_SIZES
    .filter(size => size.width === width && size.type === 'joist')
    .map(size => size.depth)
    .sort((a, b) => a - b);
  
  console.log(`Available depths from CSV: ${availableDepths.join(', ')}mm`);
  
  if (availableDepths.length === 0) {
    console.warn(`No depths available for width ${width}mm in the data`);
    return targetDepth;
  }
  
  // Find the smallest depth that is >= targetDepth
  const roundedUpDepth = availableDepths.find(d => d >= targetDepth) || availableDepths[availableDepths.length - 1];
  console.log(`Selected depth: ${roundedUpDepth}mm (rounded up from ${targetDepth}mm)`);
  
  return roundedUpDepth;
}

// ------------------------------------------------------
// Main calculation process
// ------------------------------------------------------

console.log("Initial Parameters:");
console.log(`- Span: ${span} m`);
console.log(`- Spacing: ${spacing} mm`);
console.log(`- Load: ${load} kPa (Commercial)`);
console.log(`- Fire rating: ${fireRating}`);
console.log(`- Initial width: ${width} mm`);
console.log(`- Bending strength: ${TIMBER_PROPERTIES.bendingStrength} MPa`);
console.log(`- Modulus of Elasticity: ${TIMBER_PROPERTIES.modulusOfElasticity} MPa`);

// Step 1: Load and Moment Calculations
const spanMm = span * 1000; // Convert to mm
const loadPerMeter = load * (spacing / 1000); // kN/m
const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8; // kNm
const maxBendingMomentNmm = maxBendingMoment * 1e6; // Convert to Nmm

console.log("\nStep 1: Load and Moment Calculations");
console.log(`- Span in mm: ${spanMm} mm`);
console.log(`- Load per meter: ${loadPerMeter.toFixed(2)} kN/m`);
console.log(`- Maximum bending moment: ${maxBendingMoment.toFixed(2)} kNm (${maxBendingMomentNmm.toFixed(0)} Nmm)`);

// Step 2: Calculate required section modulus for bending
const requiredSectionModulus = maxBendingMomentNmm / TIMBER_PROPERTIES.bendingStrength;
console.log("\nStep 2: Section Modulus Calculation");
console.log(`- Required section modulus: ${requiredSectionModulus.toFixed(0)} mm³`);

// Step 3: Calculate required depth based on section modulus
const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / width);
console.log("\nStep 3: Depth Calculation (Bending)");
console.log(`- Required depth based on bending: ${requiredDepth.toFixed(1)} mm`);

// Step 4: Check deflection
const deflectionLimit = 360; // L/360 for commercial loads
const maxAllowableDeflection = spanMm / deflectionLimit;
const momentOfInertia = (width * Math.pow(requiredDepth, 3)) / 12;
const actualDeflection = (5 * loadPerMeter * Math.pow(spanMm, 4)) / 
                        (384 * TIMBER_PROPERTIES.modulusOfElasticity * momentOfInertia);

console.log("\nStep 4: Initial Deflection Check");
console.log(`- Deflection limit: L/${deflectionLimit} (Commercial)`);
console.log(`- Maximum allowable deflection: ${maxAllowableDeflection.toFixed(1)} mm`);
console.log(`- Moment of inertia with bending depth: ${momentOfInertia.toFixed(0)} mm⁴`);
console.log(`- Actual deflection with bending depth: ${actualDeflection.toFixed(1)} mm`);

// Step 5: Adjust depth for deflection if necessary
let adjustedDepth = requiredDepth;
let isDeflectionGoverning = false;

if (actualDeflection > maxAllowableDeflection) {
  // Deflection is proportional to 1/I, and I is proportional to depth³
  // So if we need to reduce deflection by a factor of X, we need to increase depth by ∛X
  const deflectionRatio = actualDeflection / maxAllowableDeflection;
  const depthIncreaseFactor = Math.pow(deflectionRatio, 1/3);
  adjustedDepth = requiredDepth * depthIncreaseFactor;
  isDeflectionGoverning = true;
  
  console.log("\nStep 5: Depth Adjustment for Deflection");
  console.log(`- Deflection ratio: ${deflectionRatio.toFixed(2)}`);
  console.log(`- Depth increase factor: ${depthIncreaseFactor.toFixed(2)}`);
  console.log(`- Adjusted depth: ${adjustedDepth.toFixed(1)} mm`);
} else {
  console.log("\nStep 5: No Depth Adjustment Needed");
  console.log(`- Deflection is within limits`);
}

// Step 6: Direct deflection calculation for long span
if (span >= 7.0) {
  // For long spans, calculate deflection-based depth directly
  const directDeflectionDepth = Math.pow(
    (5 * loadPerMeter * Math.pow(spanMm, 4)) / (384 * TIMBER_PROPERTIES.modulusOfElasticity * maxAllowableDeflection),
    1/3
  ) * Math.pow(12 / width, 1/3);
  
  console.log("\nStep 6: Direct Deflection Calculation for Long Span");
  console.log(`- Direct deflection depth: ${directDeflectionDepth.toFixed(1)} mm`);
  
  // Use the larger of the two calculations
  if (directDeflectionDepth > adjustedDepth) {
    const oldDepth = adjustedDepth;
    adjustedDepth = directDeflectionDepth;
    isDeflectionGoverning = true;
    console.log(`- Using direct deflection calculation: ${adjustedDepth.toFixed(1)} mm (was ${oldDepth.toFixed(1)} mm)`);
  } else {
    console.log(`- Keeping previous depth: ${adjustedDepth.toFixed(1)} mm`);
  }
}

// Step 7: Calculate fire resistance allowance
const fireAllowance = fireRating === '120/120/120' ? 30 : 20; // mm per exposed face

console.log("\nStep 7: Fire Resistance Allowance");
console.log(`- Fire rating: ${fireRating}`);
console.log(`- Fire allowance: ${fireAllowance} mm`);

// Step 8: Add fire resistance allowance to dimensions
const fireAdjustedDepth = Math.max(140, Math.ceil(adjustedDepth)) + fireAllowance;
console.log("\nStep 8: Apply Fire Adjustment");
console.log(`- Final engineered depth: ${Math.ceil(adjustedDepth)} mm`);
console.log(`- Fire adjusted depth: ${fireAdjustedDepth} mm`);

// Step 9: Find nearest standard size
const depth = findNearestDepth(width, fireAdjustedDepth);

// Step 10: Verify final selected size meets deflection requirements
const finalMomentOfInertia = (width * Math.pow(depth, 3)) / 12;
const finalDeflection = (5 * loadPerMeter * Math.pow(spanMm, 4)) / 
                       (384 * TIMBER_PROPERTIES.modulusOfElasticity * finalMomentOfInertia);

console.log("\nStep 10: Final Verification");
console.log(`- Final moment of inertia: ${finalMomentOfInertia.toFixed(0)} mm⁴`);
console.log(`- Final deflection: ${finalDeflection.toFixed(1)} mm`);
console.log(`- Allowable deflection: ${maxAllowableDeflection.toFixed(1)} mm`);
console.log(`- Deflection ratio: ${(finalDeflection/maxAllowableDeflection).toFixed(2)}`);

if (finalDeflection > maxAllowableDeflection) {
  console.log(`WARNING: Final selected size ${width}×${depth}mm does not meet deflection requirements.`);
} else {
  console.log(`SUCCESS: Final selected size ${width}×${depth}mm meets deflection requirements.`);
}

// Final results
console.log("\n======================================");
console.log("FINAL RESULTS:");
console.log(`Joist size: ${width}mm width × ${depth}mm depth`);
console.log(`Governing criteria: ${isDeflectionGoverning ? 'deflection' : 'bending'}`);
console.log(`Final deflection: ${finalDeflection.toFixed(1)} mm (limit: ${maxAllowableDeflection.toFixed(1)} mm)`);

// Print calculation flow summary
console.log("\nCALCULATION FLOW SUMMARY:");
console.log(`1. Bending required depth: ${requiredDepth.toFixed(1)} mm`);
console.log(`2. After deflection check: ${adjustedDepth.toFixed(1)} mm (${isDeflectionGoverning ? 'deflection governing' : 'bending governing'})`);
console.log(`3. After fire adjustment: ${fireAdjustedDepth} mm`);
console.log(`4. Final standard size: ${depth} mm`);
console.log("======================================"); 