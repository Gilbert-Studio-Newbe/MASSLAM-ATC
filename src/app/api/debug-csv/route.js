import { 
  getMasslamSizes, 
  loadMasslamSizes, 
  debugMasslamSizesLoading 
} from '@/utils/timberSizes';
import { 
  getML38Properties, 
  loadML38MechanicalProperties 
} from '@/utils/masslamProperties';

export async function GET() {
  try {
    // Initialize and load MASSLAM sizes
    console.log('API: Loading MASSLAM sizes...');
    const sizes = await loadMasslamSizes();
    const sizesDebug = debugMasslamSizesLoading();
    
    // Load ML38 properties
    console.log('API: Loading ML38 properties...');
    const properties = await loadML38MechanicalProperties();
    
    // Return the debug information
    return Response.json({
      success: true,
      sizes: {
        count: sizes.length,
        debug: sizesDebug,
        sample: sizes.slice(0, 5)
      },
      properties: properties ? {
        count: Object.keys(properties).length,
        sample: Object.entries(properties).slice(0, 5).map(([key, value]) => ({ key, value }))
      } : null
    });
  } catch (error) {
    console.error('API: Error in debug-csv endpoint:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 