// Comparison of joist calculations for commercial vs residential loads
console.log("COMPARING JOIST CALCULATIONS: COMMERCIAL VS RESIDENTIAL LOADS");
console.log("=============================================================\n");

// Common constants
const span = 9.0; // meters
const spacing = 800; // mm
const width = 250; // mm - standard joist width

// Load scenarios
const scenarios = [
  { name: "Commercial", load: 3.0, fireRating: '120/120/120', deflectionLimit: 360 },
  { name: "Residential", load: 2.0, fireRating: '90/90/90', deflectionLimit: 300 }
];

// Timber properties
const bendingStrength = 38; // MPa
const modulusOfElasticity = 14500; // MPa
const shearStrength = 5; // MPa

// Standard depths for 250mm width
const standardDepths = [200, 240, 270, 335, 380, 410, 480, 550, 620];

// Function to calculate joist size for a scenario
function calculateJoistSize(scenario) {
  console.log(`\n>>> ${scenario.name.toUpperCase()} LOAD SCENARIO (${scenario.load} kPa) <<<`);
  
  const loadPerMeter = scenario.load * (spacing / 1000); // kN/m
  const spanMm = span * 1000; // mm
  const maxAllowableDeflection = spanMm / scenario.deflectionLimit;
  
  console.log(`Input parameters:`);
  console.log(`- Span: ${span} m`);
  console.log(`- Spacing: ${spacing} mm`);
  console.log(`- Load: ${scenario.load} kPa (${scenario.name})`);
  console.log(`- Fire rating: ${scenario.fireRating}`);
  console.log(`- Deflection limit: L/${scenario.deflectionLimit}`);
  console.log(`- Initial width: ${width} mm`);

  // Step 1: Calculate maximum bending moment
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8; // kNm
  const maxBendingMomentNmm = maxBendingMoment * 1e6; // Convert to Nmm

  console.log(`\nBending Calculation:`);
  console.log(`- Load per meter: ${loadPerMeter.toFixed(2)} kN/m`);
  console.log(`- Maximum bending moment: ${maxBendingMoment.toFixed(2)} kNm`);

  // Step 2: Calculate required section modulus & depth
  const requiredSectionModulus = maxBendingMomentNmm / bendingStrength;
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / width);

  console.log(`- Required section modulus: ${requiredSectionModulus.toFixed(0)} mm³`);
  console.log(`- Bending-governed depth: ${requiredDepth.toFixed(1)} mm`);

  // Step 3: Check deflection
  const momentOfInertia = (width * Math.pow(requiredDepth, 3)) / 12;
  const loadPerMm = loadPerMeter; // kN/m is equivalent to N/mm
  const actualDeflection = (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * momentOfInertia);

  console.log(`\nDeflection Calculation:`);
  console.log(`- Maximum allowable deflection: ${maxAllowableDeflection.toFixed(1)} mm`);
  console.log(`- Initial deflection: ${actualDeflection.toFixed(1)} mm`);
  
  // Step 4: Adjust depth for deflection if necessary
  let adjustedDepth = requiredDepth;
  let isDeflectionGoverning = false;

  if (actualDeflection > maxAllowableDeflection) {
    const deflectionRatio = actualDeflection / maxAllowableDeflection;
    const depthIncreaseFactor = Math.pow(deflectionRatio, 1/3);
    adjustedDepth = requiredDepth * depthIncreaseFactor;
    isDeflectionGoverning = true;
    
    console.log(`- Depth needs adjustment for deflection`);
    console.log(`- Deflection ratio: ${deflectionRatio.toFixed(2)}`);
    console.log(`- Adjusted depth: ${adjustedDepth.toFixed(1)} mm`);
  } else {
    console.log(`- No depth adjustment needed for deflection`);
  }

  // Step 5: Direct deflection calculation for long span
  let directDeflectionDepth = 0;
  if (span >= 7.0) {
    directDeflectionDepth = Math.pow(
      (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * maxAllowableDeflection),
      1/3
    ) * Math.pow(12 / width, 1/3);
    
    console.log(`\nLong Span Direct Calculation:`);
    console.log(`- Direct deflection depth: ${directDeflectionDepth.toFixed(1)} mm`);
    
    if (directDeflectionDepth > adjustedDepth) {
      adjustedDepth = directDeflectionDepth;
      isDeflectionGoverning = true;
      console.log(`- Using direct deflection calculation as governing`);
    } else {
      console.log(`- Keeping previous depth calculation`);
    }
  }

  // Step 6: Fire resistance
  const fireAllowance = scenario.fireRating === '120/120/120' ? 30 : 20; // mm per exposed face
  const fireAdjustedDepth = Math.max(140, Math.ceil(adjustedDepth)) + fireAllowance;

  console.log(`\nFire Resistance:`);
  console.log(`- Fire allowance: ${fireAllowance} mm for ${scenario.fireRating}`);
  console.log(`- Fire adjusted depth: ${fireAdjustedDepth.toFixed(1)} mm`);

  // Step 7: Find nearest standard size
  const depth = standardDepths.find(d => d >= fireAdjustedDepth) || standardDepths[standardDepths.length - 1];

  console.log(`\nSize Selection:`);
  console.log(`- Selected standard depth: ${depth} mm`);

  // Step 8: Final deflection check
  const finalMomentOfInertia = (width * Math.pow(depth, 3)) / 12;
  const finalDeflection = (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * finalMomentOfInertia);
  const deflectionRatio = finalDeflection / maxAllowableDeflection;

  console.log(`\nFinal Verification:`);
  console.log(`- Final moment of inertia: ${finalMomentOfInertia.toFixed(0)} mm⁴`);
  console.log(`- Final deflection: ${finalDeflection.toFixed(1)} mm`);
  console.log(`- Allowable deflection: ${maxAllowableDeflection.toFixed(1)} mm`);
  console.log(`- Deflection ratio: ${deflectionRatio.toFixed(2)}`);

  const result = {
    scenario: scenario.name,
    load: scenario.load,
    fireRating: scenario.fireRating,
    deflectionLimit: scenario.deflectionLimit,
    bendingDepth: Math.ceil(requiredDepth),
    deflectionDepth: Math.ceil(adjustedDepth),
    fireAdjustedDepth: Math.ceil(fireAdjustedDepth),
    finalDepth: depth,
    finalDeflection: finalDeflection.toFixed(1),
    allowableDeflection: maxAllowableDeflection.toFixed(1),
    deflectionRatio: deflectionRatio.toFixed(2),
    isDeflectionGoverning
  };

  console.log(`\n${scenario.name} RESULT: ${width}mm width × ${depth}mm depth`);
  console.log(`Governing criteria: ${isDeflectionGoverning ? 'deflection' : 'bending'}`);
  
  return result;
}

// Calculate results for both scenarios
const results = scenarios.map(calculateJoistSize);

// Display comparison summary
console.log("\n\n=============================================================");
console.log("COMPARISON SUMMARY");
console.log("=============================================================");
console.log("                     | COMMERCIAL        | RESIDENTIAL");
console.log("-------------------------------------------------------------");
console.log(`Load                 | ${results[0].load} kPa             | ${results[1].load} kPa`);
console.log(`Fire Rating          | ${results[0].fireRating}        | ${results[1].fireRating}`);
console.log(`Deflection Limit     | L/${results[0].deflectionLimit}            | L/${results[1].deflectionLimit}`);
console.log(`Bending Depth        | ${results[0].bendingDepth} mm             | ${results[1].bendingDepth} mm`);
console.log(`Deflection Depth     | ${results[0].deflectionDepth} mm             | ${results[1].deflectionDepth} mm`);
console.log(`Fire Adjusted Depth  | ${results[0].fireAdjustedDepth} mm             | ${results[1].fireAdjustedDepth} mm`);
console.log(`Final Selected Depth | ${results[0].finalDepth} mm             | ${results[1].finalDepth} mm`);
console.log(`Final Deflection     | ${results[0].finalDeflection} mm            | ${results[1].finalDeflection} mm`);
console.log(`Allowable Deflection | ${results[0].allowableDeflection} mm            | ${results[1].allowableDeflection} mm`);
console.log(`Deflection Ratio     | ${results[0].deflectionRatio}              | ${results[1].deflectionRatio}`);
console.log(`Governing Criteria   | ${results[0].isDeflectionGoverning ? 'Deflection' : 'Bending'}       | ${results[1].isDeflectionGoverning ? 'Deflection' : 'Bending'}`);
console.log("=============================================================");

console.log("\nCONCLUSION:");
if (results[0].finalDepth !== results[1].finalDepth) {
  console.log(`Different member sizes selected: ${results[0].finalDepth}mm for commercial vs ${results[1].finalDepth}mm for residential`);
} else {
  console.log(`Same member size selected for both load cases: ${results[0].finalDepth}mm depth`);
}

// Highlight the key differences in calculation
console.log("\nKEY DIFFERENCES:");
console.log(`1. Loading: Commercial uses ${results[0].load}kPa vs Residential ${results[1].load}kPa (${((results[0].load/results[1].load)-1)*100}% higher for commercial)`);
console.log(`2. Deflection limit: Commercial L/${results[0].deflectionLimit} vs Residential L/${results[1].deflectionLimit} (${((results[1].deflectionLimit/results[0].deflectionLimit)-1)*100}% stricter for residential)`);
console.log(`3. Fire rating: Commercial ${results[0].fireRating} (${results[0].fireAdjustedDepth - results[0].deflectionDepth}mm added) vs Residential ${results[1].fireRating} (${results[1].fireAdjustedDepth - results[1].deflectionDepth}mm added)`); 