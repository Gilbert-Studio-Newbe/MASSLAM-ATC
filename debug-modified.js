// Modified debug script showing joist calculation with deflection check for ALL spans
console.log("DEFLECTION CHECK FOR ALL SPANS - DEBUGGING TOOL");
console.log("===============================================\n");

// CSV Data from masslam_sizes.csv - simplified for clarity
const MASSLAM_SIZES = [
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

// Test multiple span scenarios
const testScenarios = [
  { span: 3.0, load: 3.0, isCommercial: true },
  { span: 5.0, load: 3.0, isCommercial: true },
  { span: 7.0, load: 3.0, isCommercial: true },
  { span: 9.0, load: 3.0, isCommercial: true },
  { span: 3.0, load: 2.0, isCommercial: false },
  { span: 5.0, load: 2.0, isCommercial: false },
  { span: 7.0, load: 2.0, isCommercial: false },
  { span: 9.0, load: 2.0, isCommercial: false }
];

// Helper functions
function findNearestDepth(width, targetDepth) {
  const availableDepths = MASSLAM_SIZES
    .filter(size => size.width === width && size.type === 'joist')
    .map(size => size.depth)
    .sort((a, b) => a - b);
  
  if (availableDepths.length === 0) {
    return targetDepth;
  }
  
  const roundedUpDepth = availableDepths.find(d => d >= targetDepth) || availableDepths[availableDepths.length - 1];
  return roundedUpDepth;
}

// Main calculation function with deflection check for ALL spans
function calculateJoistSize(scenario) {
  const { span, load, isCommercial } = scenario;
  const spacing = 800; // mm
  const width = 250; // mm
  const fireRating = isCommercial ? '120/120/120' : '90/90/90';
  const fireAllowance = isCommercial ? 30 : 20; // mm
  
  console.log(`\n\n========= SCENARIO: ${span}m span, ${load}kPa ${isCommercial ? 'commercial' : 'residential'} load =========`);
  
  // Step 1: Load and moment calculations
  const spanMm = span * 1000;
  const loadPerMeter = load * (spacing / 1000);
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
  const maxBendingMomentNmm = maxBendingMoment * 1e6;
  
  console.log(`1. Load per meter: ${loadPerMeter.toFixed(2)} kN/m`);
  console.log(`2. Maximum bending moment: ${maxBendingMoment.toFixed(2)} kNm`);
  
  // Step 2: Bending calculation
  const requiredSectionModulus = maxBendingMomentNmm / TIMBER_PROPERTIES.bendingStrength;
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / width);
  
  console.log(`3. Required section modulus: ${requiredSectionModulus.toFixed(0)} mm³`);
  console.log(`4. Bending-governed depth: ${requiredDepth.toFixed(1)} mm`);
  
  // Step 3: Deflection check - now for ALL spans
  const deflectionLimit = isCommercial ? 360 : 300; // L/360 commercial, L/300 residential
  const maxAllowableDeflection = spanMm / deflectionLimit;
  const momentOfInertia = (width * Math.pow(requiredDepth, 3)) / 12;
  const actualDeflection = (5 * loadPerMeter * Math.pow(spanMm, 4)) / 
                           (384 * TIMBER_PROPERTIES.modulusOfElasticity * momentOfInertia);
  
  console.log(`\nDeflection Check:`);
  console.log(`- Deflection limit: L/${deflectionLimit} (${isCommercial ? 'Commercial' : 'Residential'})`);
  console.log(`- Maximum allowable deflection: ${maxAllowableDeflection.toFixed(1)} mm`);
  console.log(`- Actual deflection with bending depth: ${actualDeflection.toFixed(1)} mm`);
  
  // Step 4: Adjust depth for deflection if necessary (for ALL spans)
  let adjustedDepth = requiredDepth;
  let isDeflectionGoverning = false;
  
  if (actualDeflection > maxAllowableDeflection) {
    // Deflection is proportional to 1/I, and I is proportional to depth³
    // So if we need to reduce deflection by a factor of X, we need to increase depth by ∛X
    const deflectionRatio = actualDeflection / maxAllowableDeflection;
    const depthIncreaseFactor = Math.pow(deflectionRatio, 1/3);
    adjustedDepth = requiredDepth * depthIncreaseFactor;
    isDeflectionGoverning = true;
    
    console.log(`\nDepth Adjustment Required:`);
    console.log(`- Deflection ratio: ${deflectionRatio.toFixed(2)}`);
    console.log(`- Depth increase factor: ${depthIncreaseFactor.toFixed(2)}`);
    console.log(`- Adjusted depth: ${adjustedDepth.toFixed(1)} mm`);
  } else {
    console.log(`\nNo Depth Adjustment Needed - Deflection is within limits`);
  }
  
  // Step 5: Direct deflection calculation - regardless of span length
  // Important: We're now calculating this for ALL spans, not just ≥ 7m
  const directDeflectionDepth = Math.pow(
    (5 * loadPerMeter * Math.pow(spanMm, 4)) / (384 * TIMBER_PROPERTIES.modulusOfElasticity * maxAllowableDeflection),
    1/3
  ) * Math.pow(12 / width, 1/3);
  
  console.log(`\nDirect Deflection Calculation:`);
  console.log(`- Direct deflection depth: ${directDeflectionDepth.toFixed(1)} mm`);
  
  // Use the larger of the two calculations
  if (directDeflectionDepth > adjustedDepth) {
    const oldDepth = adjustedDepth;
    adjustedDepth = directDeflectionDepth;
    isDeflectionGoverning = true;
    console.log(`- Using direct deflection calculation: ${adjustedDepth.toFixed(1)} mm (increased from ${oldDepth.toFixed(1)} mm)`);
  } else {
    console.log(`- Keeping previous depth: ${adjustedDepth.toFixed(1)} mm`);
  }
  
  // Step 6: Fire resistance and standard size selection
  const fireAdjustedDepth = Math.max(140, Math.ceil(adjustedDepth)) + fireAllowance;
  console.log(`\nFire Resistance and Final Size:`);
  console.log(`- Fire rating: ${fireRating}`);
  console.log(`- Fire allowance: ${fireAllowance} mm`);
  console.log(`- Fire adjusted depth: ${fireAdjustedDepth} mm`);
  
  const depth = findNearestDepth(width, fireAdjustedDepth);
  console.log(`- Final selected standard depth: ${depth} mm`);
  
  // Step 7: Final verification
  const finalMomentOfInertia = (width * Math.pow(depth, 3)) / 12;
  const finalDeflection = (5 * loadPerMeter * Math.pow(spanMm, 4)) / 
                          (384 * TIMBER_PROPERTIES.modulusOfElasticity * finalMomentOfInertia);
  
  console.log(`\nFinal Verification:`);
  console.log(`- Final moment of inertia: ${finalMomentOfInertia.toFixed(0)} mm⁴`);
  console.log(`- Final deflection: ${finalDeflection.toFixed(1)} mm`);
  console.log(`- Allowable deflection: ${maxAllowableDeflection.toFixed(1)} mm`);
  console.log(`- Deflection ratio: ${(finalDeflection/maxAllowableDeflection).toFixed(2)}`);
  
  if (finalDeflection > maxAllowableDeflection) {
    console.log(`WARNING: Final selected size ${width}×${depth}mm does not meet deflection requirements.`);
  } else {
    console.log(`SUCCESS: Final selected size ${width}×${depth}mm meets deflection requirements.`);
  }
  
  // Return summarized results
  return {
    span,
    load,
    isCommercial,
    bendingDepth: Math.ceil(requiredDepth),
    deflectionDepth: Math.ceil(adjustedDepth),
    fireAdjustedDepth,
    finalDepth: depth,
    finalDeflection: finalDeflection.toFixed(1),
    allowableDeflection: maxAllowableDeflection.toFixed(1),
    isDeflectionGoverning,
    passesFinalCheck: finalDeflection <= maxAllowableDeflection
  };
}

// Run all test scenarios
console.log("Running calculation for multiple span scenarios...");
const results = testScenarios.map(calculateJoistSize);

// Display summary table
console.log("\n\n===============================================");
console.log("SUMMARY OF ALL SCENARIOS");
console.log("===============================================");
console.log("Span | Load | Type | Bending | Deflection | Final | Governing");
console.log("---------------------------------------------------------");

results.forEach(r => {
  console.log(
    `${r.span}m | ${r.load}kPa | ${r.isCommercial ? 'Comm' : 'Res.'} | ` +
    `${r.bendingDepth}mm | ${r.deflectionDepth}mm | ${r.finalDepth}mm | ` +
    `${r.isDeflectionGoverning ? 'Deflection' : 'Bending'}`
  );
});

console.log("==============================================="); 