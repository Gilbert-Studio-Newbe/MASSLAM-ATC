import { NextResponse } from 'next/server';
import { 
  initializeMasslamSizes, 
  loadMasslamSizes, 
  getMasslamSizes,
  debugMasslamSizesLoading
} from '@/utils/timberSizes';
import { calculateJoistSize } from '@/utils/timberEngineering';

export async function GET() {
  try {
    console.log('API: Initializing MASSLAM sizes module');
    initializeMasslamSizes();
    
    console.log('API: Loading MASSLAM sizes from CSV');
    const loadedSizes = await loadMasslamSizes();
    console.log(`API: Loaded ${loadedSizes.length} MASSLAM sizes`);
    
    // Get debug info
    const debug = debugMasslamSizesLoading();
    
    // Get all sizes
    const allSizes = getMasslamSizes();
    
    // Calculate joist size
    const span = 2.0; // 2 meters (reduced from 4m to see if bending becomes the governing factor)
    const spacing = 800; // 800mm
    const load = 2.0; // 2 kPa (residential)
    const timberGrade = 'ML38';
    const fireRating = 'none';
    
    console.log(`API: Calculating joist size for span=${span}m, spacing=${spacing}mm, load=${load}kPa, grade=${timberGrade}, fire=${fireRating}`);
    const result = calculateJoistSize(span, spacing, load, timberGrade, fireRating);
    console.log('API: Joist calculation result:', result);
    
    // Manual deflection calculation for verification
    const width = result.width;
    const depth = result.depth;
    const loadPerMeter = result.engineering.bendingMoment * 8 / (span * span); // w = 8M/L²
    const loadPerMm = loadPerMeter; // kN/m is equivalent to N/mm
    const spanMm = span * 1000; // Convert m to mm
    const modulusOfElasticity = 14500; // MPa (N/mm²) for ML38
    const momentOfInertia = (width * Math.pow(depth, 3)) / 12;
    
    // Calculate deflection using the formula: δ = (5 × w × L⁴) / (384 × E × I)
    const manualDeflection = (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * momentOfInertia);
    
    // Get all joist sizes for reference
    const joistSizes = allSizes.filter(size => size.type === 'joist');
    
    return NextResponse.json({
      success: true,
      debug,
      joistResult: result,
      deflectionDebug: {
        width,
        depth,
        loadPerMeter,
        loadPerMm,
        spanMm,
        modulusOfElasticity,
        momentOfInertia,
        manualDeflection,
        formula: "δ = (5 × w × L⁴) / (384 × E × I)"
      },
      availableJoistSizes: joistSizes,
      totalSizes: allSizes.length,
      joistSizesCount: joistSizes.length
    });
  } catch (error) {
    console.error('API: Error calculating joist size:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 