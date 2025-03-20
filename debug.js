// Manual debugging of the joist calculation for a 9m span with commercial loads
console.log("DEBUGGING JOIST CALCULATION FOR 9m SPAN WITH COMMERCIAL LOADS");

// Constants
const span = 9.0; // meters
const spacing = 800; // mm
const load = 3.0; // kPa commercial load
const fireRating = '120/120/120';
const width = 250; // mm - standard joist width (changed from 205mm)

// Timber properties (similar to ML38 grade)
const bendingStrength = 38; // MPa
const modulusOfElasticity = 14500; // MPa
const shearStrength = 5; // MPa
const loadPerMeter = load * (spacing / 1000); // kN/m
const spanMm = span * 1000; // mm

console.log(`\nInput parameters:`);
console.log(`- Span: ${span} m`);
console.log(`- Spacing: ${spacing} mm`);
console.log(`- Load: ${load} kPa (Commercial)`);
console.log(`- Fire rating: ${fireRating}`);
console.log(`- Initial width: ${width} mm`);

// Step 1: Calculate maximum bending moment
const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8; // kNm
const maxBendingMomentNmm = maxBendingMoment * 1e6; // Convert to Nmm

console.log(`\nStep 1: Calculate bending moment`);
console.log(`- Load per meter: ${loadPerMeter.toFixed(2)} kN/m`);
console.log(`- Maximum bending moment: ${maxBendingMoment.toFixed(2)} kNm (${maxBendingMomentNmm.toFixed(0)} Nmm)`);

// Step 2: Calculate required section modulus
const requiredSectionModulus = maxBendingMomentNmm / bendingStrength;

console.log(`\nStep 2: Calculate required section modulus`);
console.log(`- Bending strength: ${bendingStrength} MPa`);
console.log(`- Required section modulus: ${requiredSectionModulus.toFixed(0)} mm³`);

// Step 3: Calculate required depth based on section modulus
const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / width);

console.log(`\nStep 3: Calculate required depth based on bending`);
console.log(`- Required depth: ${requiredDepth.toFixed(1)} mm`);

// Step 4: Check deflection with commercial load criteria
const deflectionLimit = 360; // Commercial load (L/360)
const maxAllowableDeflection = (span * 1000) / deflectionLimit;
const momentOfInertia = (width * Math.pow(requiredDepth, 3)) / 12;
const loadPerMm = loadPerMeter; // kN/m is equivalent to N/mm
const actualDeflection = (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * momentOfInertia);

console.log(`\nStep 4: Check deflection with commercial load criteria`);
console.log(`- Deflection limit: L/${deflectionLimit} (Commercial)`);
console.log(`- Maximum allowable deflection: ${maxAllowableDeflection.toFixed(1)} mm`);
console.log(`- Moment of inertia with required depth: ${momentOfInertia.toFixed(0)} mm⁴`);
console.log(`- Actual deflection with required depth: ${actualDeflection.toFixed(1)} mm`);

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
  console.log(`\nStep 5: Adjust depth for deflection`);
  console.log(`- Deflection ratio: ${deflectionRatio.toFixed(2)}`);
  console.log(`- Depth increase factor: ${depthIncreaseFactor.toFixed(2)}`);
  console.log(`- Adjusted depth: ${adjustedDepth.toFixed(1)} mm`);
} else {
  console.log(`\nStep 5: No depth adjustment needed for deflection`);
}

// Step 6: Direct deflection calculation for long span
if (span >= 7.0) {
  // For long spans, calculate deflection-based depth directly
  const directDeflectionDepth = Math.pow(
    (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * maxAllowableDeflection),
    1/3
  ) * Math.pow(12 / width, 1/3);
  
  console.log(`\nStep 6: Direct deflection calculation for long span`);
  console.log(`- Direct deflection depth: ${directDeflectionDepth.toFixed(1)} mm`);
  
  // Use the larger of the two calculations
  if (directDeflectionDepth > adjustedDepth) {
    adjustedDepth = directDeflectionDepth;
    isDeflectionGoverning = true;
    console.log(`- Using direct deflection calculation: ${adjustedDepth.toFixed(1)} mm`);
  } else {
    console.log(`- Keeping previous depth: ${adjustedDepth.toFixed(1)} mm`);
  }
}

// Step 7: Calculate fire resistance allowance
const fireAllowance = 30; // mm per exposed face for 120/120/120
console.log(`\nStep 7: Add fire resistance allowance`);
console.log(`- Fire allowance: ${fireAllowance} mm`);

// Step 8: Add fire resistance allowance to dimensions
const fireAdjustedDepth = Math.max(140, Math.ceil(adjustedDepth)) + fireAllowance;
console.log(`- Fire adjusted depth: ${fireAdjustedDepth.toFixed(1)} mm`);

// Step 9: Find nearest standard size
// Simulate MASSLAM standard depths for 250mm width
const standardDepths = [200, 240, 270, 335, 380, 410, 480, 550, 620];
const depth = standardDepths.find(d => d >= fireAdjustedDepth) || standardDepths[standardDepths.length - 1];

console.log(`\nStep 9: Find nearest standard size`);
console.log(`- Available standard depths: ${standardDepths.join(', ')} mm`);
console.log(`- Selected depth: ${depth} mm`);

// Step 10: Verify final selected size meets deflection requirements
const finalMomentOfInertia = (width * Math.pow(depth, 3)) / 12;
const finalDeflection = (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * finalMomentOfInertia);

console.log(`\nStep 10: Final deflection check`);
console.log(`- Final moment of inertia: ${finalMomentOfInertia.toFixed(0)} mm⁴`);
console.log(`- Final deflection: ${finalDeflection.toFixed(1)} mm`);
console.log(`- Allowable deflection: ${maxAllowableDeflection.toFixed(1)} mm`);
console.log(`- Deflection ratio: ${(finalDeflection/maxAllowableDeflection).toFixed(2)}`);

if (finalDeflection > maxAllowableDeflection) {
  console.log(`WARNING: Final selected size ${width}×${depth}mm does not meet deflection requirements.`);
} else {
  console.log(`SUCCESS: Final selected size ${width}×${depth}mm meets deflection requirements.`);
}

console.log(`\nFinal joist size: ${width}mm width × ${depth}mm depth`);
console.log(`Governing criteria: ${isDeflectionGoverning ? 'deflection' : 'bending'}`); 