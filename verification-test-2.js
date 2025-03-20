// Advanced verification test script with cases where direct calculation might differ
console.log("ADVANCED VERIFICATION TEST FOR TIMBER CALCULATOR DEFLECTION CHANGES");
console.log("=================================================================\n");

// Test parameters
const testSpans = [2.5, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
const spacing = 800; // mm
const commercialLoad = 3.0; // kPa
const residentialLoad = 2.0; // kPa
const standardWidth = 250; // mm (standard joist width)

// Test multiple scenarios with different properties
const scenarios = [
  {
    name: "Standard (ML38 Grade)",
    bendingStrength: 38,
    modulusOfElasticity: 14500,
    width: 250
  },
  {
    name: "Lower Strength Material",
    bendingStrength: 28, // Lower bending strength
    modulusOfElasticity: 14500,
    width: 250
  },
  {
    name: "Lower Stiffness Material",
    bendingStrength: 38,
    modulusOfElasticity: 10000, // Lower E value
    width: 250
  },
  {
    name: "Higher Strength Material",
    bendingStrength: 48, // Higher bending strength
    modulusOfElasticity: 14500,
    width: 250
  },
  {
    name: "Wider Section (335mm)",
    bendingStrength: 38,
    modulusOfElasticity: 14500,
    width: 335 // Wider section
  },
  {
    name: "Narrow Section (165mm)",
    bendingStrength: 38,
    modulusOfElasticity: 14500,
    width: 165 // Narrower section
  }
];

// Mock of the original behavior (with 7m threshold for direct deflection calculation)
function calculateOldMethod(span, load, properties) {
  const { bendingStrength, modulusOfElasticity, width } = properties;
  
  const isCommercial = load === commercialLoad;
  const deflectionLimit = isCommercial ? 360 : 300;
  const spanMm = span * 1000;
  const loadPerMeter = load * (spacing / 1000);
  const maxAllowableDeflection = spanMm / deflectionLimit;
  
  // Bending calculation
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
  const maxBendingMomentNmm = maxBendingMoment * 1e6;
  const requiredSectionModulus = maxBendingMomentNmm / bendingStrength;
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / width);
  
  // Initial deflection check
  const momentOfInertia = (width * Math.pow(requiredDepth, 3)) / 12;
  const actualDeflection = (5 * loadPerMeter * Math.pow(spanMm, 4)) / 
                          (384 * modulusOfElasticity * momentOfInertia);
  
  // Adjust depth for deflection if necessary
  let adjustedDepth = requiredDepth;
  let deflectionMethod = "None";
  
  if (actualDeflection > maxAllowableDeflection) {
    const deflectionRatio = actualDeflection / maxAllowableDeflection;
    const depthIncreaseFactor = Math.pow(deflectionRatio, 1/3);
    adjustedDepth = requiredDepth * depthIncreaseFactor;
    deflectionMethod = "Ratio";
  }
  
  // Enhanced deflection handling only for long spans in old method
  let directDeflectionDepth = 0;
  if (span >= 7.0) {
    directDeflectionDepth = Math.pow(
      (5 * loadPerMeter * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * maxAllowableDeflection),
      1/3
    ) * Math.pow(12 / width, 1/3);
    
    if (directDeflectionDepth > adjustedDepth) {
      adjustedDepth = directDeflectionDepth;
      deflectionMethod = "Direct";
    }
  }
  
  return {
    span,
    load,
    isCommercial,
    bendingDepth: requiredDepth.toFixed(1),
    adjustedDepth: adjustedDepth.toFixed(1),
    deflectionMethod,
    directCalculation: span >= 7.0 ? "Yes" : "No"
  };
}

// New method - always using direct deflection calculation
function calculateNewMethod(span, load, properties) {
  const { bendingStrength, modulusOfElasticity, width } = properties;
  
  const isCommercial = load === commercialLoad;
  const deflectionLimit = isCommercial ? 360 : 300;
  const spanMm = span * 1000;
  const loadPerMeter = load * (spacing / 1000);
  const maxAllowableDeflection = spanMm / deflectionLimit;
  
  // Bending calculation
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
  const maxBendingMomentNmm = maxBendingMoment * 1e6;
  const requiredSectionModulus = maxBendingMomentNmm / bendingStrength;
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / width);
  
  // Initial deflection check
  const momentOfInertia = (width * Math.pow(requiredDepth, 3)) / 12;
  const actualDeflection = (5 * loadPerMeter * Math.pow(spanMm, 4)) / 
                          (384 * modulusOfElasticity * momentOfInertia);
  
  // Adjust depth for deflection if necessary
  let adjustedDepth = requiredDepth;
  let deflectionMethod = "None";
  
  if (actualDeflection > maxAllowableDeflection) {
    const deflectionRatio = actualDeflection / maxAllowableDeflection;
    const depthIncreaseFactor = Math.pow(deflectionRatio, 1/3);
    adjustedDepth = requiredDepth * depthIncreaseFactor;
    deflectionMethod = "Ratio";
  }
  
  // Enhanced deflection handling for ALL spans in new method
  const directDeflectionDepth = Math.pow(
    (5 * loadPerMeter * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * maxAllowableDeflection),
    1/3
  ) * Math.pow(12 / width, 1/3);
  
  if (directDeflectionDepth > adjustedDepth) {
    adjustedDepth = directDeflectionDepth;
    deflectionMethod = "Direct";
  }
  
  return {
    span,
    load,
    isCommercial,
    bendingDepth: requiredDepth.toFixed(1),
    adjustedDepth: adjustedDepth.toFixed(1),
    deflectionMethod,
    directCalculation: "Yes"
  };
}

// Run tests for all scenarios
scenarios.forEach(scenario => {
  console.log(`\n\n${scenario.name.toUpperCase()} (Width: ${scenario.width}mm):`);
  console.log(`Bending strength: ${scenario.bendingStrength} MPa, E: ${scenario.modulusOfElasticity} MPa`);
  
  // Commercial loads
  console.log("\nCOMMERCIAL LOADS (3.0 kPa):");
  console.log("Span | Bending | Old Method | New Method | Old Approach | New Approach | Difference");
  console.log("--------------------------------------------------------------------------");
  
  testSpans.forEach(span => {
    const oldResult = calculateOldMethod(span, commercialLoad, scenario);
    const newResult = calculateNewMethod(span, commercialLoad, scenario);
    const difference = (parseFloat(newResult.adjustedDepth) - parseFloat(oldResult.adjustedDepth)).toFixed(1);
    const differenceHighlight = parseFloat(difference) !== 0 ? `${difference}mm *` : `${difference}mm`;
    
    console.log(
      `${span.toFixed(1)}m | ${oldResult.bendingDepth}mm | ` +
      `${oldResult.adjustedDepth}mm | ${newResult.adjustedDepth}mm | ` +
      `${oldResult.deflectionMethod} | ${newResult.deflectionMethod} | ` +
      `${differenceHighlight}`
    );
  });
  
  // Residential loads
  console.log("\nRESIDENTIAL LOADS (2.0 kPa):");
  console.log("Span | Bending | Old Method | New Method | Old Approach | New Approach | Difference");
  console.log("--------------------------------------------------------------------------");
  
  testSpans.forEach(span => {
    const oldResult = calculateOldMethod(span, residentialLoad, scenario);
    const newResult = calculateNewMethod(span, residentialLoad, scenario);
    const difference = (parseFloat(newResult.adjustedDepth) - parseFloat(oldResult.adjustedDepth)).toFixed(1);
    const differenceHighlight = parseFloat(difference) !== 0 ? `${difference}mm *` : `${difference}mm`;
    
    console.log(
      `${span.toFixed(1)}m | ${oldResult.bendingDepth}mm | ` +
      `${oldResult.adjustedDepth}mm | ${newResult.adjustedDepth}mm | ` +
      `${oldResult.deflectionMethod} | ${newResult.deflectionMethod} | ` +
      `${differenceHighlight}`
    );
  });
});

// Summary of the changes
console.log("\n\n=================================================================");
console.log("SUMMARY OF CHANGES:");
console.log("1. The direct deflection calculation now runs for ALL spans, not just spans ≥ 7m");
console.log("2. This ensures deflection is properly evaluated as a governing criterion for all span lengths");
console.log("3. In some cases, especially with higher strength or different width materials,");
console.log("   the direct calculation may provide a more accurate depth than the ratio method");
console.log("4. The changes make the calculator more robust for all timber specifications");
console.log("================================================================="); 