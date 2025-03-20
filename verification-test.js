// Verification test script for comparing deflection calculations before and after changes
console.log("VERIFICATION TEST FOR TIMBER CALCULATOR DEFLECTION CHANGES");
console.log("========================================================\n");

// Test parameters - focus on shorter spans to verify that deflection is checked
const testSpans = [2.5, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
const spacing = 800; // mm
const commercialLoad = 3.0; // kPa
const residentialLoad = 2.0; // kPa
const width = 250; // mm (standard joist width)

// Timber properties
const TIMBER_PROPERTIES = {
  bendingStrength: 38, // MPa
  modulusOfElasticity: 14500, // MPa
};

// Mock of the original behavior (with 7m threshold for direct deflection calculation)
function calculateOldMethod(span, load) {
  const isCommercial = load === commercialLoad;
  const deflectionLimit = isCommercial ? 360 : 300;
  const spanMm = span * 1000;
  const loadPerMeter = load * (spacing / 1000);
  const maxAllowableDeflection = spanMm / deflectionLimit;
  
  // Bending calculation
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
  const maxBendingMomentNmm = maxBendingMoment * 1e6;
  const requiredSectionModulus = maxBendingMomentNmm / TIMBER_PROPERTIES.bendingStrength;
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / width);
  
  // Initial deflection check
  const momentOfInertia = (width * Math.pow(requiredDepth, 3)) / 12;
  const actualDeflection = (5 * loadPerMeter * Math.pow(spanMm, 4)) / 
                          (384 * TIMBER_PROPERTIES.modulusOfElasticity * momentOfInertia);
  
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
      (5 * loadPerMeter * Math.pow(spanMm, 4)) / (384 * TIMBER_PROPERTIES.modulusOfElasticity * maxAllowableDeflection),
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
function calculateNewMethod(span, load) {
  const isCommercial = load === commercialLoad;
  const deflectionLimit = isCommercial ? 360 : 300;
  const spanMm = span * 1000;
  const loadPerMeter = load * (spacing / 1000);
  const maxAllowableDeflection = spanMm / deflectionLimit;
  
  // Bending calculation
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
  const maxBendingMomentNmm = maxBendingMoment * 1e6;
  const requiredSectionModulus = maxBendingMomentNmm / TIMBER_PROPERTIES.bendingStrength;
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / width);
  
  // Initial deflection check
  const momentOfInertia = (width * Math.pow(requiredDepth, 3)) / 12;
  const actualDeflection = (5 * loadPerMeter * Math.pow(spanMm, 4)) / 
                          (384 * TIMBER_PROPERTIES.modulusOfElasticity * momentOfInertia);
  
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
    (5 * loadPerMeter * Math.pow(spanMm, 4)) / (384 * TIMBER_PROPERTIES.modulusOfElasticity * maxAllowableDeflection),
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

// Run tests for commercial loads
console.log("COMMERCIAL LOADS (3.0 kPa):");
console.log("Span | Bending | Old Method | New Method | Old Approach | New Approach | Difference");
console.log("--------------------------------------------------------------------------");

testSpans.forEach(span => {
  const oldResult = calculateOldMethod(span, commercialLoad);
  const newResult = calculateNewMethod(span, commercialLoad);
  const difference = (parseFloat(newResult.adjustedDepth) - parseFloat(oldResult.adjustedDepth)).toFixed(1);
  
  console.log(
    `${span.toFixed(1)}m | ${oldResult.bendingDepth}mm | ` +
    `${oldResult.adjustedDepth}mm | ${newResult.adjustedDepth}mm | ` +
    `${oldResult.deflectionMethod} | ${newResult.deflectionMethod} | ` +
    `${difference}mm`
  );
});

// Run tests for residential loads
console.log("\nRESIDENTIAL LOADS (2.0 kPa):");
console.log("Span | Bending | Old Method | New Method | Old Approach | New Approach | Difference");
console.log("--------------------------------------------------------------------------");

testSpans.forEach(span => {
  const oldResult = calculateOldMethod(span, residentialLoad);
  const newResult = calculateNewMethod(span, residentialLoad);
  const difference = (parseFloat(newResult.adjustedDepth) - parseFloat(oldResult.adjustedDepth)).toFixed(1);
  
  console.log(
    `${span.toFixed(1)}m | ${oldResult.bendingDepth}mm | ` +
    `${oldResult.adjustedDepth}mm | ${newResult.adjustedDepth}mm | ` +
    `${oldResult.deflectionMethod} | ${newResult.deflectionMethod} | ` +
    `${difference}mm`
  );
});

// Summary of the changes
console.log("\nSUMMARY OF CHANGES:");
console.log("1. The direct deflection calculation now runs for ALL spans, not just spans ≥ 7m");
console.log("2. This ensures deflection is properly evaluated as a governing criterion for all span lengths");
console.log("3. For spans < 7m, the code may now select larger depths when deflection governs");
console.log("4. The changes help ensure timber joists are properly sized for deflection in all cases"); 