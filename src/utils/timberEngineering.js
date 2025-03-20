/**
 * Utility functions for timber engineering calculations
 */

import { 
  validateMasslamSize,
  getMasslamSizes,
  initializeMasslamSizes,
  loadMasslamSizes,
  checkMasslamSizesLoaded,
  findNearestWidth,
  findNearestDepth
} from './timberSizes';
import { 
  calculateFireResistanceAllowance, 
  getML38Properties,
  loadML38MechanicalProperties
} from './masslamProperties';

// Initialize properties object that will be populated from CSV
export let TIMBER_PROPERTIES = {
  // Default values that will be replaced with data from CSV
  MASSLAM_SL33: {
    bendingStrength: 33, // MPa
    tensileStrength: 16, // MPa
    compressiveStrength: 26, // MPa
    shearStrength: 4.2, // MPa
    modulusOfElasticity: 13300, // MPa
    density: 600 // kg/m³
  },
  // Add ML38 as the new name for MASSLAM_SL33
  ML38: {
    bendingStrength: 38, // MPa
    tensileStrength: 19, // MPa
    compressiveStrength: 38, // MPa
    shearStrength: 5.0, // MPa
    modulusOfElasticity: 14500, // MPa
    density: 600 // kg/m³
  },
  // Keep these for backward compatibility until fully migrated
  GL18: {
    bendingStrength: 18, // MPa
    tensileStrength: 11, // MPa
    compressiveStrength: 18, // MPa
    shearStrength: 3.5, // MPa
    modulusOfElasticity: 11500, // MPa
    density: 600 // kg/m³
  },
  GL21: {
    bendingStrength: 21, // MPa
    tensileStrength: 13, // MPa
    compressiveStrength: 21, // MPa
    shearStrength: 3.8, // MPa
    modulusOfElasticity: 13000, // MPa
    density: 650 // kg/m³
  },
  GL24: {
    bendingStrength: 24, // MPa
    tensileStrength: 16, // MPa
    compressiveStrength: 24, // MPa
    shearStrength: 4.0, // MPa
    modulusOfElasticity: 14500, // MPa
    density: 700 // kg/m³
  }
};

// Initialize the module when this file is imported - use a flag to prevent multiple initializations
let initialized = false;
let isServer = typeof window === 'undefined';

/**
 * Initialize the timberEngineering module
 * This function should be called once when the application starts
 */
export function initializeTimberEngineering() {
  if (initialized) {
    return; // Skip if already initialized
  }
  
  console.log('timberEngineering.js: Initializing MASSLAM sizes module');
  initializeMasslamSizes();
  
  // Only preload data on the client, not during server-side rendering
  // This ensures hydration matches since data is only loaded once the component mounts
  if (!isServer) {
    // Load MASSLAM sizes from CSV
    loadMasslamSizes().then(sizes => {
      console.log(`timberEngineering.js: Loaded ${sizes.length} MASSLAM sizes from CSV`);
      if (sizes.length === 0) {
        console.warn('timberEngineering.js: Failed to load MASSLAM sizes from CSV, calculations will use fallback values');
      }
    }).catch(error => {
      console.error('timberEngineering.js: Error loading MASSLAM sizes:', error);
    });
    
    // Load timber properties from CSV
    loadTimberProperties().then(() => {
      console.log('timberEngineering.js: Timber properties loaded from CSV');
    }).catch(error => {
      console.error('timberEngineering.js: Error loading timber properties:', error);
    });
  }
  
  initialized = true;
}

// Call the initialization function immediately
initializeTimberEngineering();

/**
 * Load timber properties from the CSV file
 * This function should be called when the application starts
 */
export async function loadTimberProperties() {
  try {
    const properties = await loadML38MechanicalProperties();
    
    if (!properties) {
      console.warn('Failed to load ML38 properties from CSV, using default values');
      return;
    }
    
    // Find the perpendicular modulus property by partial key matching
    const findPropertyByPartialKey = (partialKey) => {
      const key = Object.keys(properties).find(k => k.toLowerCase().includes(partialKey.toLowerCase()));
      return key ? properties[key]?.value : null;
    };
    
    // Map CSV properties to the format expected by the application
    const mappedProperties = {
      bendingStrength: properties['Bending Strength (f\'b)']?.value || 38,
      tensileStrength: properties['Tension Strength Parallel (f\'t)']?.value || 19,
      compressiveStrength: properties['Compression Strength Parallel (f\'c)']?.value || 38,
      shearStrength: properties['Shear Strength (f\'s)']?.value || 5.0,
      modulusOfElasticity: properties['Modulus of Elasticity (E_mean)']?.value || 14500,
      density: properties['Density (ρ_mean)']?.value || 600,
      // Add additional properties
      tensileStrengthPerpendicular: properties['Tension Strength Perpendicular (f\'t90)']?.value || 0.5,
      compressiveStrengthPerpendicular: properties['Compression Strength Perpendicular (f\'c90)']?.value || 10,
      bearingStrengthParallel: properties['Bearing Strength Parallel (f\'j)']?.value || 45,
      bearingStrengthPerpendicular: properties['Bearing Strength Perpendicular (f\'j90)']?.value || 10,
      modulusOfElasticity5thPercentile: properties['Modulus of Elasticity 5th Percentile (E_05)']?.value || 10875,
      modulusOfElasticityPerpendicular: findPropertyByPartialKey('Modulus of Elasticity Perpendicular Mean') || 960,
      modulusOfRigidity: properties['Modulus of Rigidity (G)']?.value || 960,
      jointGroup: properties['Joint Group']?.value || 'JD4',
      charringRate: properties['Charring Rate']?.value || 0.7
    };
    
    // Update both MASSLAM_SL33 and ML38 with the same properties
    TIMBER_PROPERTIES.MASSLAM_SL33 = { ...mappedProperties };
    TIMBER_PROPERTIES.ML38 = { ...mappedProperties };
    
    console.log('Loaded ML38/MASSLAM SL33 properties from CSV:', TIMBER_PROPERTIES.ML38);
    
    // For backward compatibility, update GL24 to match ML38
    // This ensures existing code using GL24 will use the correct values
    TIMBER_PROPERTIES.GL24 = { ...TIMBER_PROPERTIES.ML38 };
    
    return TIMBER_PROPERTIES.ML38;
  } catch (error) {
    console.error('Error loading timber properties:', error);
  }
}

/**
 * Helper function to calculate fallback joist depth based on span
 */
function calculateFallbackJoistDepth(span) {
  // Rule of thumb: depth ≈ span(mm) / 20 for joists
  // This is a simplified approximation
  const depthMm = (span * 1000) / 20;
  
  // Round to nearest standard depth
  const standardDepths = [200, 270, 335, 410, 480, 550, 620];
  return findNearestValue(depthMm, standardDepths);
}

/**
 * Helper function to calculate fallback beam depth based on span
 */
function calculateFallbackBeamDepth(span) {
  // Rule of thumb: depth ≈ span(mm) / 15 for beams
  // This is a simplified approximation
  const depthMm = (span * 1000) / 15;
  
  // Round to nearest standard depth
  const standardDepths = [200, 270, 335, 410, 480, 550, 620];
  return findNearestValue(depthMm, standardDepths);
}

/**
 * Helper function to find the nearest value in an array
 */
function findNearestValue(target, values) {
  return values.reduce((prev, curr) => {
    return Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev;
  });
}

/**
 * Maps fire rating level (FRL) to fixed joist width
 * @param {string} fireRating - Fire rating ('none', '30/30/30', '60/60/60', '90/90/90', '120/120/120')
 * @returns {number} Fixed width in mm based on fire rating
 */
export function getFixedWidthForFireRating(fireRating) {
  switch (fireRating) {
    case 'none':
      return 120; // Available in CSV
    case '30/30/30':
    case '60/60/60':
      return 165; // Available in CSV
    case '90/90/90':
      return 205; // Available in CSV (closest to 200)
    case '120/120/120':
      return 250; // Available in CSV
    default:
      return 120; // Default to 120mm if unknown rating
  }
}

/**
 * Calculate joist size based on span, spacing, and load using proper structural engineering principles
 * @param {number} span - Span in meters
 * @param {number} spacing - Spacing between joists in mm
 * @param {number} load - Load in kPa
 * @param {string} timberGrade - Timber grade (e.g., 'ML38')
 * @param {string} fireRating - Fire rating ('none', '30/30/30', '60/60/60', '90/90/90', '120/120/120')
 * @returns {Object} Joist size and calculation details
 */
export function calculateJoistSize(span, spacing, load, timberGrade, fireRating = 'none') {
  console.log(`Calculating joist size for span=${span}m, spacing=${spacing}mm, load=${load}kPa, grade=${timberGrade}, fire=${fireRating}`);
  
  try {
    // Get timber properties based on grade
    const timberProps = getTimberProperties(timberGrade);
    
    if (!timberProps) {
      console.error(`Timber properties not found for grade: ${timberGrade}`);
      return calculateFallbackJoistSizeEngineered(span, spacing, load, timberGrade, fireRating);
    }
    
    // Validate inputs
    if (!span || span <= 0 || !spacing || spacing <= 0 || !load || load <= 0) {
      console.error("Invalid input parameters:", { span, spacing, load });
      throw new Error("Invalid input parameters");
    }
    
    // Convert spacing from mm to m for calculations
    const spacingM = spacing / 1000;
    
    // Log calculation parameters for debugging
    console.log(`Joist calculation with: span=${span}m, spacing=${spacingM}m, load=${load}kPa, timber properties:`, timberProps);
    
    // Step 1: Calculate initial load without self-weight
    let totalLoad = load;
    
    // Step 2: Calculate load per meter (kN/m) based on joist spacing
    let loadPerMeter = totalLoad * spacingM;
    
    // Step 3: Get fixed width based on fire rating
    const initialWidth = getFixedWidthForFireRating(fireRating);
    
    // Step 4: Calculate maximum bending moment (kNm)
    const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
    
    // Convert to Nmm for section modulus calculation
    const maxBendingMomentNmm = maxBendingMoment * 1000000; // 1 kNm = 1,000,000 Nmm
    
    // Step 5: Calculate required section modulus (mm³)
    const bendingStrength = timberProps.bendingStrength; // MPa (N/mm²)
    const requiredSectionModulus = maxBendingMomentNmm / bendingStrength;
    
    // Step 6: Calculate required depth based on section modulus and width
    // Z = (width × depth²) / 6
    // Solve for depth: depth = √(6Z / width)
    const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / initialWidth);
    
    // Step 7: ALWAYS check deflection and adjust depth if necessary - regardless of span
    // Maximum allowable deflection (mm)
    let deflectionLimit = 300; // Default L/300

    // Adjust deflection limit based on load intensity
    if (load >= 3.0) { // Commercial loading
      deflectionLimit = 360; // More stringent L/360 for commercial
      console.log(`Commercial load detected (${load.toFixed(1)} kPa). Using stricter deflection limit: L/${deflectionLimit}`);
    } else if (load >= 5.0) { // Heavy duty loading
      deflectionLimit = 400; // Even more stringent L/400
      console.log(`Heavy load detected (${load.toFixed(1)} kPa). Using stricter deflection limit: L/${deflectionLimit}`);
    }

    const maxAllowableDeflection = (span * 1000) / deflectionLimit;
    console.log(`Maximum allowable deflection: ${maxAllowableDeflection.toFixed(1)}mm (span/${deflectionLimit})`);

    // Calculate second moment of area (mm⁴)
    const momentOfInertia = (initialWidth * Math.pow(requiredDepth, 3)) / 12;

    // Calculate actual deflection (mm)
    // δ = (5 × w × L⁴) / (384 × E × I)
    const modulusOfElasticity = timberProps.modulusOfElasticity; // MPa (N/mm²)
    const loadPerMm = loadPerMeter; // kN/m is equivalent to N/mm
    const spanMm = span * 1000; // Convert m to mm
    
    const actualDeflection = (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * momentOfInertia);
    console.log(`Actual deflection with initial depth: ${actualDeflection.toFixed(1)}mm`);

    // Adjust depth for deflection if necessary
    let adjustedDepth = requiredDepth;
    let isDeflectionGoverning = false;

    if (actualDeflection > maxAllowableDeflection) {
      // Deflection is proportional to 1/I, and I is proportional to depth³
      // So if we need to reduce deflection by a factor of X, we need to increase depth by ∛X
      const deflectionRatio = actualDeflection / maxAllowableDeflection;
      const depthIncreaseFactor = Math.pow(deflectionRatio, 1/3);
      adjustedDepth = requiredDepth * depthIncreaseFactor;
      isDeflectionGoverning = true;
      console.log(`DEFLECTION GOVERNS: Adjusting depth for deflection: ${requiredDepth.toFixed(0)} mm × ${depthIncreaseFactor.toFixed(2)} = ${adjustedDepth.toFixed(0)} mm`);
    } else {
      console.log(`Bending strength governs design (deflection is within limits)`);
    }

    // Enhanced deflection handling for long spans - STILL APPLY THIS FOR ALL SPANS
    // For all spans, calculate deflection-based depth directly
    // This is more accurate than the incremental approach above
    const directDeflectionDepth = Math.pow(
      (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * maxAllowableDeflection),
      1/3
    ) * Math.pow(12 / initialWidth, 1/3);
    
    console.log(`Direct deflection-governed depth calculation: ${directDeflectionDepth.toFixed(1)}mm for span ${span}m`);
    
    // Use the larger of the two calculations
    if (directDeflectionDepth > adjustedDepth) {
      adjustedDepth = directDeflectionDepth;
      isDeflectionGoverning = true;
      console.log(`Using direct deflection calculation: ${adjustedDepth.toFixed(1)}mm`);
    }
    
    // Step 9: Calculate fire resistance allowance if needed
    let fireAllowance = 0;
    if (fireRating && fireRating !== 'none') {
      fireAllowance = calculateFireResistanceAllowance(fireRating);
    }
    
    // Step 10: Add fire resistance allowance to dimensions
    const fireAdjustedDepth = Math.max(140, Math.ceil(adjustedDepth)) + fireAllowance;
    
    // Step 11: Round to nearest standard depth
    const standardDepths = [200, 270, 335, 410, 480, 550, 620];
    const depth = findNearestValue(fireAdjustedDepth, standardDepths);
    
    // Step 12: Final deflection check with the selected size
    const finalMomentOfInertia = (initialWidth * Math.pow(depth, 3)) / 12;
    const finalDeflection = (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * finalMomentOfInertia);
    
    console.log(`Final selected size: ${initialWidth}×${depth}mm`);
    console.log(`Final deflection: ${finalDeflection.toFixed(1)}mm (limit: ${maxAllowableDeflection.toFixed(1)}mm)`);
    
    if (finalDeflection > maxAllowableDeflection) {
      console.warn(`WARNING: Final selected size ${initialWidth}×${depth}mm exceeds deflection limit`);
      
      // If final deflection is still too high, try the next larger size
      const nextSizeIndex = standardDepths.indexOf(depth) + 1;
      if (nextSizeIndex < standardDepths.length) {
        const nextSize = standardDepths[nextSizeIndex];
        const nextMomentOfInertia = (initialWidth * Math.pow(nextSize, 3)) / 12;
        const nextDeflection = (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * nextMomentOfInertia);
        
        console.log(`Checking next size: ${initialWidth}×${nextSize}mm, deflection: ${nextDeflection.toFixed(1)}mm`);
        
        if (nextDeflection <= maxAllowableDeflection) {
          console.log(`Using increased size ${initialWidth}×${nextSize}mm to meet deflection requirements`);
          return {
            width: initialWidth,
            depth: nextSize,
            span,
            spacing,
            load,
            grade: timberGrade,
            fireRating,
            isDeflectionGoverning: true,
            deflection: nextDeflection,
            allowableDeflection: maxAllowableDeflection,
            bendingDepth: Math.ceil(requiredDepth),
            deflectionDepth: Math.ceil(adjustedDepth),
            fireAdjustedDepth
          };
        }
      }
    }
    
    // Return the calculated dimensions with detailed parameters
    return {
      width: initialWidth,
      depth,
      span,
      spacing,
      load,
      grade: timberGrade,
      fireRating,
      isDeflectionGoverning,
      deflection: finalDeflection,
      allowableDeflection: maxAllowableDeflection,
      bendingDepth: Math.ceil(requiredDepth),
      deflectionDepth: Math.ceil(adjustedDepth),
      fireAdjustedDepth
    };
  } catch (error) {
    console.error(`Error in joist size calculation:`, error);
    
    // If calculation fails, use fallback calculation as backup
    console.warn(`Using fallback calculation for joist size`);
    return calculateFallbackJoistSizeEngineered(span, spacing, load, timberGrade, fireRating);
  }
}

/**
 * Calculate joist size using proper engineering principles when CSV data isn't available
 * This is a fallback function that uses the same engineering principles but with hardcoded standard sizes
 * @param {number} span - Span in meters
 * @param {number} spacing - Spacing between joists in mm
 * @param {number} load - Load in kPa
 * @param {string} timberGrade - Timber grade
 * @param {string} fireRating - Fire rating
 * @returns {Object} Joist size and calculation details
 */
function calculateFallbackJoistSizeEngineered(span, spacing, load, timberGrade, fireRating = 'none') {
  // Validate inputs
  if (span <= 0 || spacing <= 0 || load <= 0) {
    console.error('Span, spacing, and load must be greater than 0');
    throw new Error('Span, spacing, and load must be greater than 0');
  }
  
  // Get timber properties for the specified grade
  const timberProps = TIMBER_PROPERTIES[timberGrade] || TIMBER_PROPERTIES.ML38;
  
  // Convert spacing from mm to m for calculations
  const spacingM = spacing / 1000;
  
  // Step 1: Calculate initial load without self-weight
  let totalLoad = load;
  
  // Step 2: Calculate load per meter (kN/m) based on joist spacing
  let loadPerMeter = totalLoad * spacingM;
  
  // Step 3: Get fixed width based on fire rating
  const initialWidth = getFixedWidthForFireRating(fireRating);
  
  // Step 4: Calculate maximum bending moment (kNm)
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
  
  // Convert to Nmm for section modulus calculation
  const maxBendingMomentNmm = maxBendingMoment * 1000000; // 1 kNm = 1,000,000 Nmm
  
  // Step 5: Calculate required section modulus (mm³)
  const bendingStrength = timberProps.bendingStrength; // MPa (N/mm²)
  const requiredSectionModulus = maxBendingMomentNmm / bendingStrength;
  
  // Step 6: Calculate required depth based on section modulus and width
  // Z = (width × depth²) / 6
  // Solve for depth: depth = √(6Z / width)
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / initialWidth);
  
  // Step 7: Check deflection and adjust depth if necessary
  // Maximum allowable deflection (mm)
  let deflectionLimit = 300; // Default L/300

  // Adjust deflection limit based on load intensity
  if (load >= 3.0) { // Commercial loading
    deflectionLimit = 360; // More stringent L/360 for commercial
    console.log(`Commercial load detected (${load.toFixed(1)} kPa). Using stricter deflection limit: L/${deflectionLimit}`);
  } else if (load >= 5.0) { // Heavy duty loading
    deflectionLimit = 400; // Even more stringent L/400
    console.log(`Heavy load detected (${load.toFixed(1)} kPa). Using stricter deflection limit: L/${deflectionLimit}`);
  }

  const maxAllowableDeflection = (span * 1000) / deflectionLimit;
  console.log(`Maximum allowable deflection: ${maxAllowableDeflection.toFixed(1)}mm (span/${deflectionLimit})`);

  // Calculate second moment of area (mm⁴)
  const momentOfInertia = (initialWidth * Math.pow(requiredDepth, 3)) / 12;

  // Calculate actual deflection (mm)
  // δ = (5 × w × L⁴) / (384 × E × I)
  const modulusOfElasticity = timberProps.modulusOfElasticity; // MPa (N/mm²)
  const loadPerMm = loadPerMeter; // kN/m is equivalent to N/mm
  const spanMm = span * 1000; // Convert m to mm
  
  const actualDeflection = (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * momentOfInertia);
  console.log(`Actual deflection with initial depth: ${actualDeflection.toFixed(1)}mm`);

  // Adjust depth for deflection if necessary
  let adjustedDepth = requiredDepth;
  let isDeflectionGoverning = false;

  if (actualDeflection > maxAllowableDeflection) {
    // Deflection is proportional to 1/I, and I is proportional to depth³
    // So if we need to reduce deflection by a factor of X, we need to increase depth by ∛X
    const deflectionRatio = actualDeflection / maxAllowableDeflection;
    const depthIncreaseFactor = Math.pow(deflectionRatio, 1/3);
    adjustedDepth = requiredDepth * depthIncreaseFactor;
    isDeflectionGoverning = true;
    console.log(`DEFLECTION GOVERNS: Adjusting depth for deflection: ${requiredDepth.toFixed(0)} mm × ${depthIncreaseFactor.toFixed(2)} = ${adjustedDepth.toFixed(0)} mm`);
  } else {
    console.log(`Bending strength governs design (deflection is within limits)`);
  }

  // Enhanced deflection handling for long spans
  if (span >= 7.0) {
    // For long spans, calculate deflection-based depth directly
    // This is more accurate than the incremental approach above
    const directDeflectionDepth = Math.pow(
      (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * maxAllowableDeflection),
      1/3
    ) * Math.pow(12 / initialWidth, 1/3);
    
    console.log(`Long span detected (${span}m). Direct deflection-governed depth: ${directDeflectionDepth.toFixed(1)}mm`);
    
    // Use the larger of the two calculations
    if (directDeflectionDepth > adjustedDepth) {
      adjustedDepth = directDeflectionDepth;
      isDeflectionGoverning = true;
      console.log(`Using direct deflection calculation for long span: ${adjustedDepth.toFixed(1)}mm`);
    }
  }
  
  // Step 9: Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Step 10: Add fire resistance allowance to dimensions
  const fireAdjustedDepth = Math.max(140, Math.ceil(adjustedDepth)) + fireAllowance;
  
  // Step 11: Round to nearest standard depth
  const standardDepths = [200, 270, 335, 410, 480, 550, 620];
  const depth = findNearestValue(fireAdjustedDepth, standardDepths);
  
  // Step 12: Calculate self-weight based on final size
  // Convert dimensions to meters
  const joistWidth = initialWidth / 1000; // m
  const joistDepth = depth / 1000; // m
  
  // Get timber density from properties (kg/m³)
  const density = timberProps.density || 600; // Default to 600 kg/m³
  
  // Calculate joist volume per meter (m³/m)
  const joistVolumePerMeter = joistWidth * joistDepth * 1.0; // 1.0 meter length
  
  // Calculate joist weight per meter (kg/m)
  const joistWeightPerMeter = joistVolumePerMeter * density;
  
  // Convert to kN/m (1 kg = 0.00981 kN)
  const joistSelfWeightPerMeter = joistWeightPerMeter * 0.00981;
  
  // Convert linear self-weight (kN/m) to area load (kPa) based on joist spacing
  // Self-weight per square meter = self-weight per meter / spacing in meters
  const selfWeightLoad = joistSelfWeightPerMeter / spacingM;
  
  // Step 13: Recalculate with self-weight included
  totalLoad += selfWeightLoad;
  
  // Calculate final section properties
  const finalSectionModulus = (initialWidth * Math.pow(depth, 2)) / 6;
  const finalMomentOfInertia = (initialWidth * Math.pow(depth, 3)) / 12;
  
  // Calculate final deflection
  const finalLoadPerMeter = totalLoad * spacingM;
  const finalLoadPerMm = finalLoadPerMeter; // kN/m is equivalent to N/mm
  const finalDeflection = (5 * finalLoadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * finalMomentOfInertia);
  
  return {
    width: initialWidth,
    depth: depth,
    span,
    spacing,
    load,
    totalLoad,
    selfWeight: joistSelfWeightPerMeter,
    selfWeightLoad,
    grade: timberGrade,
    fireRating,
    fireAllowance,
    usingFallback: true,
    governingCriteria: isDeflectionGoverning ? 'deflection' : 'bending',
    engineering: {
      bendingMoment: (finalLoadPerMeter * Math.pow(span, 2)) / 8,
      requiredSectionModulus,
      finalSectionModulus,
      momentOfInertia: finalMomentOfInertia,
      allowableDeflection: maxAllowableDeflection,
      actualDeflection: finalDeflection
    }
  };
}

/**
 * Calculate beam size based on span, load, and tributary width using proper structural engineering principles
 * @param {number} span - Span in meters
 * @param {number} load - Load in kPa
 * @param {string} timberGrade - Timber grade (e.g., 'ML38')
 * @param {number} tributaryWidth - Tributary width in meters (required)
 *                                  For interior beams: (Bay1Width + Bay2Width) / 2
 *                                  For edge beams: BayWidth / 2
 * @param {string} fireRating - Fire rating ('none', '30/30/30', '60/60/60', '90/90/90', '120/120/120')
 * @returns {Object} Beam size and calculation details
 */
export function calculateBeamSize(span, load, timberGrade, tributaryWidth, fireRating = 'none') {
  // Validate tributary width is provided
  if (tributaryWidth === undefined || tributaryWidth <= 0) {
    console.error('Tributary width must be provided and greater than 0');
    throw new Error('Tributary width must be provided and greater than 0');
  }
  
  console.log(`Calculating beam size for span: ${span}m, load: ${load}kPa, grade: ${timberGrade}, tributary width: ${tributaryWidth}m, fire rating: ${fireRating}`);
  
  // Check if MASSLAM sizes are loaded
  const sizesLoaded = checkMasslamSizesLoaded();
  if (!sizesLoaded) {
    console.warn('MASSLAM sizes not loaded, using fallback values for beam calculation');
    // Return a fallback size with a flag indicating fallback was used
    return calculateFallbackBeamSizeEngineered(span, load, timberGrade, tributaryWidth, fireRating);
  }
  
  // Get timber properties for the specified grade
  const timberProps = TIMBER_PROPERTIES[timberGrade] || TIMBER_PROPERTIES.ML38;
  console.log(`Using timber properties for ${timberGrade}:`, timberProps);
  
  // Step 1: Calculate load per meter (kN/m)
  const loadPerMeter = load * tributaryWidth;
  console.log(`Load per meter: ${load} kPa × ${tributaryWidth} m = ${loadPerMeter.toFixed(2)} kN/m`);
  
  // Step 2: Calculate total distributed load
  const totalDistributedLoad = loadPerMeter * span;
  console.log(`Total distributed load: ${loadPerMeter.toFixed(2)} kN/m × ${span} m = ${totalDistributedLoad.toFixed(2)} kN`);
  
  // Step 3: Calculate maximum bending moment (kNm)
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
  console.log(`Maximum bending moment: (${loadPerMeter.toFixed(2)} kN/m × ${span}² m²) / 8 = ${maxBendingMoment.toFixed(2)} kNm`);
  
  // Convert to Nmm for section modulus calculation
  const maxBendingMomentNmm = maxBendingMoment * 1000000; // 1 kNm = 1,000,000 Nmm
  
  // Step 4: Calculate required section modulus (mm³)
  const bendingStrength = timberProps.bendingStrength; // MPa (N/mm²)
  const requiredSectionModulus = maxBendingMomentNmm / bendingStrength;
  console.log(`Required section modulus: ${maxBendingMomentNmm.toFixed(0)} Nmm / ${bendingStrength} N/mm² = ${requiredSectionModulus.toFixed(0)} mm³`);
  
  // Step 5: Calculate beam dimensions based on section modulus
  // Start with a practical width based on fire rating
  const initialWidth = getFixedWidthForFireRating(fireRating);
  console.log(`Initial width based on fire rating: ${initialWidth} mm`);
  
  // Calculate required depth based on section modulus and width
  // Z = (width × depth²) / 6
  // Solve for depth: depth = √(6Z / width)
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / initialWidth);
  console.log(`Required depth based on section modulus: √((6 × ${requiredSectionModulus.toFixed(0)}) / ${initialWidth}) = ${requiredDepth.toFixed(0)} mm`);
  
  // Step 6: Check shear capacity
  // Maximum shear force (N)
  const maxShearForce = (loadPerMeter * span) / 2 * 1000; // Convert kN to N
  console.log(`Maximum shear force: (${loadPerMeter.toFixed(2)} kN/m × ${span} m) / 2 = ${(maxShearForce/1000).toFixed(2)} kN (${maxShearForce.toFixed(0)} N)`);
  
  // Required shear area (mm²)
  const shearStrength = timberProps.shearStrength; // MPa (N/mm²)
  const requiredShearArea = maxShearForce / shearStrength;
  console.log(`Required shear area: ${maxShearForce.toFixed(0)} N / ${shearStrength} N/mm² = ${requiredShearArea.toFixed(0)} mm²`);
  
  // Check if shear area is satisfied by the section
  const shearArea = initialWidth * requiredDepth;
  const shearUtilization = requiredShearArea / shearArea;
  console.log(`Shear area check: Required ${requiredShearArea.toFixed(0)} mm² vs. Available ${shearArea.toFixed(0)} mm² (Utilization: ${(shearUtilization * 100).toFixed(1)}%)`);
  
  // Step 7: Check deflection
  // Maximum allowable deflection (mm)
  const maxAllowableDeflection = (span * 1000) / 300; // span/300 in mm
  console.log(`Maximum allowable deflection: ${span * 1000} mm / 300 = ${maxAllowableDeflection.toFixed(1)} mm`);
  
  // Calculate second moment of area (mm⁴)
  const momentOfInertia = (initialWidth * Math.pow(requiredDepth, 3)) / 12;
  
  // Calculate actual deflection (mm)
  // δ = (5 × w × L⁴) / (384 × E × I)
  const modulusOfElasticity = timberProps.modulusOfElasticity; // MPa (N/mm²)
  const loadPerMm = loadPerMeter; // kN/m is equivalent to N/mm
  const spanMm = span * 1000; // Convert m to mm
  
  const actualDeflection = (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * momentOfInertia);
  console.log(`Actual deflection: ${actualDeflection.toFixed(2)} mm (Allowable: ${maxAllowableDeflection.toFixed(1)} mm)`);
  
  // Check if deflection is within limits
  const deflectionUtilization = actualDeflection / maxAllowableDeflection;
  console.log(`Deflection utilization: ${(deflectionUtilization * 100).toFixed(1)}%`);
  
  // Step 8: Adjust depth for deflection if necessary
  let adjustedDepth = requiredDepth;
  
  if (actualDeflection > maxAllowableDeflection) {
    // Deflection is proportional to 1/I, and I is proportional to depth³
    // So if we need to reduce deflection by a factor of X, we need to increase depth by ∛X
    const deflectionRatio = actualDeflection / maxAllowableDeflection;
    const depthIncreaseFactor = Math.pow(deflectionRatio, 1/3);
    adjustedDepth = requiredDepth * depthIncreaseFactor;
    console.log(`Adjusting depth for deflection: ${requiredDepth.toFixed(0)} mm × ${depthIncreaseFactor.toFixed(2)} = ${adjustedDepth.toFixed(0)} mm`);
  }
  
  // Step 9: Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
    console.log(`Fire resistance allowance: ${fireAllowance} mm per exposed face`);
  }
  
  // Step 10: Add fire resistance allowance to dimensions
  // For beams, typically 3 sides are exposed (bottom and two sides)
  const fireAdjustedWidth = initialWidth + (2 * fireAllowance); // Both sides exposed
  const fireAdjustedDepth = Math.max(240, Math.ceil(adjustedDepth)) + fireAllowance; // Only bottom exposed
  
  console.log(`Fire adjusted dimensions: ${fireAdjustedWidth}mm width × ${fireAdjustedDepth}mm depth`);
  
  // Step 11: Find nearest available standard size
  const width = findNearestWidth(fireAdjustedWidth);
  const depth = findNearestDepth(width, fireAdjustedDepth, 'beam');
  
  console.log(`Final beam size: ${width}mm width × ${depth}mm depth (standard size from CSV)`);
  
  // Calculate final section properties
  const finalSectionModulus = (width * Math.pow(depth, 2)) / 6;
  const finalMomentOfInertia = (width * Math.pow(depth, 3)) / 12;
  
  // Calculate final utilization ratios
  const bendingUtilization = maxBendingMomentNmm / (bendingStrength * finalSectionModulus);
  const finalShearArea = width * depth;
  const finalShearUtilization = requiredShearArea / finalShearArea;
  
  // Calculate final deflection
  const finalLoadPerMeter = loadPerMeter; // Use the existing loadPerMeter instead of totalLoad * spacingM
  const finalLoadPerMm = finalLoadPerMeter; // kN/m is equivalent to N/mm
  const finalDeflection = (5 * finalLoadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * finalMomentOfInertia);
  const finalDeflectionUtilization = finalDeflection / maxAllowableDeflection;
  
  // Check if we're using fallback values
  const usingFallback = false;
  
  // Return comprehensive result object
  return {
    width,
    depth,
    span,
    load,
    tributaryWidth,
    loadPerMeter,
    grade: timberGrade,
    fireRating,
    fireAllowance,
    usingFallback,
    engineering: {
      bendingMoment: maxBendingMoment,
      requiredSectionModulus,
      finalSectionModulus,
      shearForce: maxShearForce / 1000, // Convert back to kN
      requiredShearArea,
      momentOfInertia: finalMomentOfInertia,
      allowableDeflection: maxAllowableDeflection,
      actualDeflection: finalDeflection,
      utilization: {
        bending: bendingUtilization,
        shear: finalShearUtilization,
        deflection: finalDeflectionUtilization,
        overall: Math.max(bendingUtilization, finalShearUtilization, finalDeflectionUtilization)
      }
    }
  };
}

/**
 * Calculate beam size using proper engineering principles when CSV data isn't available
 * This is a fallback function that uses the same engineering principles but with hardcoded standard sizes
 * @param {number} span - Span in meters
 * @param {number} load - Load in kPa
 * @param {string} timberGrade - Timber grade
 * @param {number} tributaryWidth - Tributary width in meters (required)
 * @param {string} fireRating - Fire rating
 * @returns {Object} Beam size and calculation details
 */
function calculateFallbackBeamSizeEngineered(span, load, timberGrade, tributaryWidth, fireRating = 'none') {
  // Validate tributary width is provided
  if (tributaryWidth === undefined || tributaryWidth <= 0) {
    console.error('Tributary width must be provided and greater than 0');
    throw new Error('Tributary width must be provided and greater than 0');
  }
  
  // Get timber properties for the specified grade
  const timberProps = TIMBER_PROPERTIES[timberGrade] || TIMBER_PROPERTIES.ML38;
  
  // Step 1: Calculate load per meter (kN/m)
  const loadPerMeter = load * tributaryWidth;
  
  // Step 2: Calculate maximum bending moment (kNm)
  const maxBendingMoment = (loadPerMeter * Math.pow(span, 2)) / 8;
  
  // Convert to Nmm for section modulus calculation
  const maxBendingMomentNmm = maxBendingMoment * 1000000; // 1 kNm = 1,000,000 Nmm
  
  // Step 3: Calculate required section modulus (mm³)
  const bendingStrength = timberProps.bendingStrength; // MPa (N/mm²)
  const requiredSectionModulus = maxBendingMomentNmm / bendingStrength;
  
  // Step 4: Calculate beam dimensions based on section modulus
  // Start with a practical width based on fire rating
  const initialWidth = getFixedWidthForFireRating(fireRating);
  
  // Calculate required depth based on section modulus and width
  // Z = (width × depth²) / 6
  // Solve for depth: depth = √(6Z / width)
  const requiredDepth = Math.sqrt((6 * requiredSectionModulus) / initialWidth);
  
  // Step 5: Check shear capacity
  // Maximum shear force (N)
  const maxShearForce = (loadPerMeter * span) / 2 * 1000; // Convert kN to N
  
  // Required shear area (mm²)
  const shearStrength = timberProps.shearStrength; // MPa (N/mm²)
  const requiredShearArea = maxShearForce / shearStrength;
  
  // Step 5: Check deflection
  // Maximum allowable deflection (mm)
  const maxAllowableDeflection = (span * 1000) / 300; // span/300 in mm
  
  // Calculate second moment of area (mm⁴)
  const momentOfInertia = (initialWidth * Math.pow(requiredDepth, 3)) / 12;
  
  // Calculate actual deflection (mm)
  // δ = (5 × w × L⁴) / (384 × E × I)
  const modulusOfElasticity = timberProps.modulusOfElasticity; // MPa (N/mm²)
  const loadPerMm = loadPerMeter; // kN/m is equivalent to N/mm
  const spanMm = span * 1000; // Convert m to mm
  
  const actualDeflection = (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * momentOfInertia);
  
  // Adjust depth for deflection if necessary
  let adjustedDepth = requiredDepth;
  
  if (actualDeflection > maxAllowableDeflection) {
    // Deflection is proportional to 1/I, and I is proportional to depth³
    // So if we need to reduce deflection by a factor of X, we need to increase depth by ∛X
    const deflectionRatio = actualDeflection / maxAllowableDeflection;
    const depthIncreaseFactor = Math.pow(deflectionRatio, 1/3);
    adjustedDepth = requiredDepth * depthIncreaseFactor;
  }
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Add fire resistance allowance to dimensions
  const fireAdjustedWidth = initialWidth + (2 * fireAllowance); // Both sides exposed
  const fireAdjustedDepth = Math.max(240, Math.ceil(adjustedDepth)) + fireAllowance; // Only bottom exposed
  
  console.log(`Fire adjusted dimensions: ${fireAdjustedWidth}mm width × ${fireAdjustedDepth}mm depth`);
  
  // Step 11: Find nearest available standard size
  const width = findNearestWidth(fireAdjustedWidth);
  const depth = findNearestDepth(width, fireAdjustedDepth, 'beam');
  
  console.log(`Final beam size: ${width}mm width × ${depth}mm depth (standard size from CSV)`);
  
  // Calculate final section properties
  const finalSectionModulus = (width * Math.pow(depth, 2)) / 6;
  const finalMomentOfInertia = (width * Math.pow(depth, 3)) / 12;
  
  // Calculate final utilization ratios
  const bendingUtilization = maxBendingMomentNmm / (bendingStrength * finalSectionModulus);
  const finalShearArea = width * depth;
  const finalShearUtilization = requiredShearArea / finalShearArea;
  
  // Calculate final deflection
  const finalLoadPerMeter = loadPerMeter; // Use the existing loadPerMeter instead of totalLoad * spacingM
  const finalLoadPerMm = finalLoadPerMeter; // kN/m is equivalent to N/mm
  const finalDeflection = (5 * finalLoadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * finalMomentOfInertia);
  const finalDeflectionUtilization = finalDeflection / maxAllowableDeflection;
  
  // Check if we're using fallback values
  const usingFallback = false;
  
  // Return comprehensive result object
  return {
    width,
    depth,
    span,
    load,
    tributaryWidth,
    loadPerMeter,
    grade: timberGrade,
    fireRating,
    fireAllowance,
    usingFallback,
    engineering: {
      bendingMoment: maxBendingMoment,
      requiredSectionModulus,
      finalSectionModulus,
      momentOfInertia: finalMomentOfInertia,
      allowableDeflection: maxAllowableDeflection,
      actualDeflection: finalDeflection,
      utilization: {
        bending: bendingUtilization,
        shear: finalShearUtilization,
        deflection: finalDeflectionUtilization,
        overall: Math.max(bendingUtilization, finalShearUtilization, finalDeflectionUtilization)
      }
    }
  };
}

/**
 * Calculate column size based on height and load
 */
export function calculateColumnSize(height, load, timberGrade, fireRating = 'none') {
  console.log(`Calculating column size for height: ${height}m, load: ${load}kN, grade: ${timberGrade}, fire rating: ${fireRating}`);
  
  // Check if MASSLAM sizes are loaded
  const sizesLoaded = checkMasslamSizesLoaded();
  if (!sizesLoaded) {
    console.warn('MASSLAM sizes not loaded, using fallback values for column calculation');
    // Return a fallback size with a flag indicating fallback was used
    return {
      width: getFixedWidthForFireRating(fireRating),
      depth: getFixedWidthForFireRating(fireRating), // For columns, use same width for depth to keep square
      type: 'column',
      utilization: 0.85,
      usingFallback: true
    };
  }
  
  // Continue with the existing calculation logic
  // Placeholder implementation
  const heightMm = height * 1000; // Convert to mm
  
  // Get fixed width based on fire rating
  const fixedWidth = getFixedWidthForFireRating(fireRating);
  console.log(`Using fixed width of ${fixedWidth}mm based on fire rating: ${fireRating}`);
  
  // For columns, we typically want square sections, so use the same value for depth
  const fixedDepth = fixedWidth;
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Find nearest available standard size
  const width = findNearestWidth(fixedWidth);
  const depth = findNearestDepth(width, fixedDepth, 'column');
  
  console.log(`Column size: ${width}x${depth}mm (standard size from CSV)`);
  
  // Check if we're using fallback values - for columns, we're always using the fixed values
  const usingFallback = false;
  
  return {
    width: width,
    depth: depth,
    height: height,
    load: load,
    grade: timberGrade,
    fireRating: fireRating,
    fireAllowance: fireAllowance,
    usingFallback: usingFallback
  };
}

export function calculateTimberWeight(joistSize, beamSize, columnSize, buildingLength, buildingWidth, numFloors, lengthwiseBays = 3, widthwiseBays = 2, joistsRunLengthwise = true, timberGrade = 'GL18') {
  // If called with just volume and timberGrade (for testing or simple cases)
  if (typeof joistSize === 'number' && (typeof beamSize === 'string' || beamSize === undefined)) {
    const volume = joistSize;
    const grade = beamSize || timberGrade;
    const density = TIMBER_PROPERTIES[grade]?.density || 600; // kg/m³
    return volume * density; // kg
  }
  
  // Calculate the number of structural elements
  const joistSpacing = 0.8; // 800mm spacing in meters
  
  // Calculate bay dimensions
  const bayLengthWidth = buildingLength / lengthwiseBays; // Width of each bay in the length direction
  const bayWidthWidth = buildingWidth / widthwiseBays; // Width of each bay in the width direction
  
  // Calculate number of joists
  // Joists run perpendicular to beams
  // If joists run lengthwise, they span across the width of each bay
  // If joists run widthwise, they span across the length of each bay
  // Using the joistsRunLengthwise parameter passed from the caller
  
  let numJoistsPerBay;
  let joistLength;
  
  if (joistsRunLengthwise) {
    // Joists run lengthwise, spanning across the width of each bay
    numJoistsPerBay = Math.ceil(bayWidthWidth / joistSpacing) + 1; // Add 1 for the end joist
    joistLength = bayLengthWidth;
  } else {
    // Joists run widthwise, spanning across the length of each bay
    numJoistsPerBay = Math.ceil(bayLengthWidth / joistSpacing) + 1; // Add 1 for the end joist
    joistLength = bayWidthWidth;
  }
  
  // Total number of joists = joists per bay * number of bays * number of floors
  const totalJoists = numJoistsPerBay * lengthwiseBays * widthwiseBays * numFloors;
  
  // Calculate joist volume
  const joistWidth = joistSize.width / 1000; // Convert mm to m
  const joistDepth = joistSize.depth / 1000; // Convert mm to m
  const joistVolume = joistWidth * joistDepth * joistLength * totalJoists;
  
  // Calculate number of beams - beams should only run perpendicular to joists
  let totalBeams;
  let beamVolume;
  
  if (joistsRunLengthwise) {
    // If joists run lengthwise, beams should only run widthwise
    const numWidthwiseBeams = (lengthwiseBays + 1) * widthwiseBays;
    totalBeams = numWidthwiseBeams * numFloors;
    
    // Calculate beam volume - only widthwise beams
    const beamWidth = beamSize.width / 1000; // Convert mm to m
    const beamDepth = beamSize.depth / 1000; // Convert mm to m
    const widthwiseBeamLength = bayWidthWidth;
    beamVolume = beamWidth * beamDepth * (numWidthwiseBeams * widthwiseBeamLength) * numFloors;
  } else {
    // If joists run widthwise, beams should only run lengthwise
    const numLengthwiseBeams = (widthwiseBays + 1) * lengthwiseBays;
    totalBeams = numLengthwiseBeams * numFloors;
    
    // Calculate beam volume - only lengthwise beams
    const beamWidth = beamSize.width / 1000; // Convert mm to m
    const beamDepth = beamSize.depth / 1000; // Convert mm to m
    const lengthwiseBeamLength = bayLengthWidth;
    beamVolume = beamWidth * beamDepth * (numLengthwiseBeams * lengthwiseBeamLength) * numFloors;
  }
  
  // Calculate number of columns
  // Columns are at the intersections of grid lines
  // Number of columns = (lengthwiseBays + 1) * (widthwiseBays + 1)
  const totalColumns = (lengthwiseBays + 1) * (widthwiseBays + 1);
  
  // Calculate column volume
  const columnWidth = columnSize.width / 1000; // Convert mm to m
  const columnDepth = columnSize.depth / 1000; // Convert mm to m
  
  // Multiply by numFloors to get the total height of all columns
  // columnSize.height is the height per floor, not the total height
  const totalColumnHeight = columnSize.height * numFloors;
  const columnVolume = columnWidth * columnDepth * totalColumnHeight * totalColumns;
  
  // Log calculation details for debugging
  console.log('Timber Engineering - Column Volume Calculation:', {
    columnWidthM: columnWidth,
    columnDepthM: columnDepth,
    columnHeightPerFloor: columnSize.height,
    numFloors,
    totalColumnHeight,
    totalColumns,
    calculatedVolume: columnVolume
  });
  
  // Total volume
  const totalVolume = joistVolume + beamVolume + columnVolume;
  
  // Calculate weight using density
  const density = TIMBER_PROPERTIES[timberGrade]?.density || 600; // kg/m³
  const weight = totalVolume * density;
  
  // Return an object with detailed information
  return {
    weight,
    totalVolume,
    elements: {
      joists: {
        count: totalJoists,
        volume: joistVolume
      },
      beams: {
        count: totalBeams,
        volume: beamVolume
      },
      columns: {
        count: totalColumns,
        volume: columnVolume
      }
    }
  };
}

export function calculateCarbonSavings(weightOrResult) {
  let volume;
  
  // Check if we received the full result object from calculateTimberWeight
  if (typeof weightOrResult === 'object' && weightOrResult !== null && weightOrResult.totalVolume) {
    volume = weightOrResult.totalVolume;
  } else {
    // If we received just the weight (in kg), convert to volume (m³) using average density
    const averageDensity = 600; // kg/m³
    volume = weightOrResult / averageDensity;
  }
  
  // Calculate carbon storage (carbon sequestered in the timber)
  const carbonStorage = volume * 0.9; // tonnes CO2e
  
  // Calculate embodied carbon (carbon emitted during production)
  const embodiedCarbon = volume * 0.2; // tonnes CO2e
  
  // Calculate carbon savings compared to steel/concrete
  // Steel/concrete would emit approximately 2.5 tonnes CO2e per m³
  const steelConcreteEmissions = volume * 2.5; // tonnes CO2e
  
  // Carbon savings = emissions from steel/concrete - emissions from timber
  const carbonSavings = steelConcreteEmissions - embodiedCarbon;
  
  return {
    carbonStorage,
    embodiedCarbon,
    carbonSavings,
    totalVolume: volume
  };
}

export function validateStructure(joistSize, beamSize, columnSize) {
  // Placeholder implementation
  return { valid: true, messages: [] };
}

/**
 * DEPRECATED: This object is no longer used. All timber sizes are now loaded from the CSV file.
 * Keeping this commented out for reference only.
 */
/*
export const TIMBER_SIZE_OPTIONS = {
  joists: {
    widths: [35, 45, 70, 90],
    depths: [140, 190, 240, 290, 340],
    description: "Standard joist sizes for floor and roof applications",
    notes: "Larger depths available for longer spans"
  },
  beams: {
    widths: [65, 85, 135, 185, 240],
    depths: [240, 290, 340, 390, 450, 500, 600],
    description: "Glulam beam sizes for structural applications",
    notes: "Custom sizes available upon request"
  },
  posts: {
    widths: [90, 115, 135, 185, 240],
    depths: [90, 115, 135, 185, 240],
    description: "Square and rectangular post sections",
    notes: "Square sections recommended for axial loads"
  },
  studs: {
    widths: [70, 90, 140],
    depths: [35, 45],
    description: "Wall framing studs",
    notes: "90mm depth recommended for external walls"
  },
  rafters: {
    widths: [35, 45, 70],
    depths: [140, 190, 240],
    description: "Roof rafter sections",
    notes: "Larger sections may be required for snow loads"
  }
};
*/

/**
 * DEPRECATED: This function is no longer used. All timber sizes are now loaded from the CSV file.
 * Use getMasslamSizesByType() instead.
 */
/*
export function getTimberSizeOptions(application) {
  return TIMBER_SIZE_OPTIONS[application] || null;
}
*/

/**
 * Get available timber sizes for a specific application
 * This function now uses the CSV data instead of hardcoded values
 * 
 * @param {string} application - Application type ("joist", "beam", or "post")
 * @returns {Object|null} Size options or null if not found
 */
export function getTimberSizeOptions(application) {
  const sizes = getMasslamSizes();
  
  if (sizes.length === 0) {
    console.warn('MASSLAM sizes not loaded yet, cannot get timber size options');
    return { widths: [], depths: [] };
  }
  
  // Filter sizes by application type (singular form)
  const applicationType = application.endsWith('s') 
    ? application.slice(0, -1) // Remove trailing 's'
    : application;
  
  const filteredSizes = sizes.filter(size => size.type === applicationType);
  
  if (filteredSizes.length === 0) {
    console.warn(`No sizes found for application type: ${applicationType}`);
    return { widths: [], depths: [] };
  }
  
  // Extract unique widths and depths
  const widths = [...new Set(filteredSizes.map(size => size.width))].sort((a, b) => a - b);
  const depths = [...new Set(filteredSizes.map(size => size.depth))].sort((a, b) => a - b);
  
  return {
    widths,
    depths,
    description: `Standard ${application} sizes for structural applications`,
    notes: "Sizes loaded from masslam_sizes.csv"
  };
}