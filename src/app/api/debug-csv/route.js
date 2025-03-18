import { NextResponse } from 'next/server';
import { 
  initializeMasslamSizes, 
  loadMasslamSizes, 
  getMasslamSizes,
  debugMasslamSizesLoading
} from '@/utils/timberSizes';
import { loadML38MechanicalProperties } from '@/utils/masslamProperties';

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
    
    // Load ML38 properties
    console.log('API: Loading ML38 properties...');
    const properties = await loadML38MechanicalProperties();
    
    return NextResponse.json({
      success: true,
      debug,
      sizes: allSizes.slice(0, 20), // Only return first 20 sizes to keep response size reasonable
      totalSizes: allSizes.length,
      properties: properties ? {
        count: Object.keys(properties).length,
        sample: Object.entries(properties).slice(0, 3).map(([key, value]) => ({ key, value }))
      } : null
    });
  } catch (error) {
    console.error('API: Error loading MASSLAM sizes:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 