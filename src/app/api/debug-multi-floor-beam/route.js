import { NextResponse } from 'next/server';
import { TIMBER_PROPERTIES } from '@/utils/timberEngineering';

// Helper functions from TimberCalculator.js
const findNearestWidth = (targetWidth) => {
  // Simplified version for testing
  const availableWidths = [120, 165, 205, 250, 290, 335, 380, 420, 450];
  return availableWidths.find(w => w >= targetWidth) || availableWidths[availableWidths.length - 1];
};

const findNearestDepth = (width, targetDepth) => {
  // Simplified version for testing
  const availableDepths = [200, 270, 335, 410, 480, 550, 620, 690, 760, 830];
  return availableDepths.find(d => d >= targetDepth) || availableDepths[availableDepths.length - 1];
};

const calculateFireResistanceAllowance = (fireRating) => {
  // Simplified version for testing
  const fireRatings = {
    'none': 0,
    '30min': 15,
    '60min': 30,
    '90min': 45,
    '120min': 60
  };
  return fireRatings[fireRating] || 0;
};

// Copy of calculateMultiFloorBeamSize from TimberCalculator.js
const calculateMultiFloorBeamSize = (span, load, joistSpacing, numFloors, fireRating = 'none', joistsRunLengthwise = true, avgBayWidth = 0, avgBayLength = 0) => {
  // Calculate tributary width for the beam (in meters)
  // For a more realistic calculation, use half the perpendicular dimension to the beam span
  // If beam spans lengthwise (joists run widthwise), tributary width is half the bay width
  // If beam spans widthwise (joists run lengthwise), tributary width is half the bay length
  let tributaryWidth;
  
  if (avgBayWidth > 0 && avgBayLength > 0) {
    // If we have bay dimensions, use them for a more realistic tributary width
    tributaryWidth = joistsRunLengthwise ? avgBayWidth / 2 : avgBayLength / 2;
  } else {
    // Fallback to the old calculation if bay dimensions aren't provided
    tributaryWidth = joistSpacing;
  }
  
  console.log(`Beam tributary width: ${tributaryWidth.toFixed(2)} m`);
  
  // Calculate load per meter of beam (kN/m)
  // load is in kPa (kN/m²), so multiply by tributary width to get kN/m
  let loadPerMeter = load * tributaryWidth;
  console.log(`Initial beam load per meter (without self-weight): ${loadPerMeter.toFixed(2)} kN/m`);
  
  // Calculate theoretical width and depth
  const spanMm = span * 1000; // Convert to mm
  const theoreticalWidth = Math.max(65, Math.ceil(spanMm / 25)); // Simplified calculation
  const theoreticalDepth = Math.max(240, Math.ceil(spanMm / 12)); // Simplified calculation
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Add fire resistance allowance to width and depth
  // For beams, typically 3 sides are exposed (bottom and two sides)
  const fireAdjustedWidth = theoreticalWidth + (2 * fireAllowance); // Both sides exposed
  const fireAdjustedDepth = theoreticalDepth + fireAllowance; // Only bottom exposed
  
  // Find the nearest available width and depth
  const width = findNearestWidth(fireAdjustedWidth);
  const depth = findNearestDepth(width, fireAdjustedDepth);
  
  // Calculate self-weight based on size estimate
  // Convert dimensions to meters
  const beamWidth = width / 1000; // m
  const beamDepth = depth / 1000; // m
  
  // Get timber density from properties (kg/m³)
  const density = TIMBER_PROPERTIES['ML38']?.density || 600; // Default to 600 kg/m³
  
  // Calculate beam volume per meter (m³/m)
  const beamVolumePerMeter = beamWidth * beamDepth * 1.0; // 1.0 meter length
  
  // Calculate beam weight per meter (kg/m)
  const beamWeightPerMeter = beamVolumePerMeter * density;
  
  // Convert to kN/m (1 kg = 0.00981 kN)
  const beamSelfWeightPerMeter = beamWeightPerMeter * 0.00981;
  
  console.log(`Beam self-weight: ${beamSelfWeightPerMeter.toFixed(2)} kN/m`);
  
  // Add self-weight to the load per meter
  loadPerMeter += beamSelfWeightPerMeter;
  console.log(`Total beam load per meter (with self-weight): ${loadPerMeter.toFixed(2)} kN/m`);
  
  // Calculate total distributed load on the beam (including self-weight)
  const totalDistributedLoad = loadPerMeter * span;
  console.log(`Total distributed load on beam (including self-weight): ${totalDistributedLoad.toFixed(2)} kN`);
  
  console.log(`Beam size before fire adjustment: ${theoreticalWidth}x${theoreticalDepth}mm`);
  console.log(`Beam size after fire adjustment: ${fireAdjustedWidth}x${fireAdjustedDepth}mm`);
  
  return {
    width: width,
    depth: depth,
    span: span,
    tributaryWidth: tributaryWidth,
    loadPerMeter: loadPerMeter,
    selfWeight: beamSelfWeightPerMeter,
    fireAllowance: fireAllowance
  };
};

export async function GET(request) {
  console.log('API: Debug multi-floor beam calculation endpoint called');
  
  try {
    // Define test parameters
    const span = 7.0; // 7m span
    const load = 2.0; // 2kPa load
    const joistSpacing = 0.8; // 800mm spacing
    const numFloors = 1;
    const fireRating = 'none';
    const joistsRunLengthwise = true;
    
    // Test different scenarios
    const tests = [
      {
        name: 'Old method (joist spacing)',
        avgBayWidth: 0,
        avgBayLength: 0,
        description: 'Using joist spacing as tributary width (old method)'
      },
      {
        name: 'New method (realistic tributary width)',
        avgBayWidth: 7.0,
        avgBayLength: 7.0,
        description: 'Using half the perpendicular bay dimension (new method)'
      }
    ];
    
    // Run tests
    const results = [];
    for (const test of tests) {
      console.log(`API: Calculating multi-floor beam size for span=${span}m, load=${load}kPa, joistSpacing=${joistSpacing}m, numFloors=${numFloors}, fire=${fireRating}, joistsRunLengthwise=${joistsRunLengthwise}, avgBayWidth=${test.avgBayWidth}m, avgBayLength=${test.avgBayLength}m`);
      
      const beamSize = calculateMultiFloorBeamSize(
        span,
        load,
        joistSpacing,
        numFloors,
        fireRating,
        joistsRunLengthwise,
        test.avgBayWidth,
        test.avgBayLength
      );
      
      results.push({
        ...test,
        result: {
          width: beamSize.width,
          depth: beamSize.depth,
          span: beamSize.span,
          tributaryWidth: beamSize.tributaryWidth,
          loadPerMeter: beamSize.loadPerMeter,
          selfWeight: beamSize.selfWeight
        }
      });
    }
    
    return NextResponse.json({
      span,
      load,
      joistSpacing,
      numFloors,
      fireRating,
      joistsRunLengthwise,
      tests: results
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 