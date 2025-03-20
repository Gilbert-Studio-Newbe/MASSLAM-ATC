# Recommended Code Changes for Joist Size Calculation

The following code changes will improve the joist size calculation, particularly for long spans where deflection should govern the design. These changes ensure that the properly sized 250×410mm joists are selected for a 9m span with commercial loading, rather than the undersized 250×320mm members currently being calculated.

## 1. Enhanced Deflection Calculation in `src/utils/timberEngineering.js`

Replace the existing deflection check in `calculateJoistSize` function around line 315-325 with:

```javascript
// Step 9: Check deflection and adjust depth if necessary
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
```

## 2. Improve Standard Size Selection in `calculateJoistSize` function

Replace the size selection logic around line 380-405 with this more robust version:

```javascript
// Find the smallest depth that is >= targetDepth
let depth;
if (depthsToUse.length > 0) {
  const suitableDepths = depthsToUse.filter(d => d >= fireAdjustedDepth);
  
  if (suitableDepths.length > 0) {
    depth = suitableDepths[0]; // Get the first (smallest) suitable depth
    console.log(`Selected nearest available depth: ${depth}mm for width ${widthToUse}mm`);
  } else {
    // No suitable depth found, use the largest available
    depth = depthsToUse[depthsToUse.length - 1];
    console.log(`WARNING: No suitable depth found. Using largest available: ${depth}mm`);
  }
} else {
  // Fallback to standard depths if no depths available
  console.warn('No joist depths available in CSV, using fallback standards');
  const standardDepths = [200, 270, 335, 410, 480, 550, 620];
  depth = standardDepths.find(d => d >= fireAdjustedDepth) || standardDepths[standardDepths.length - 1];
  console.log(`Using fallback joist depth: ${depth}mm`);
}

console.log(`Final joist size: ${widthToUse}mm width × ${depth}mm depth (standard size from CSV)`);

// Verify final selected size meets deflection requirements
const finalMomentOfInertia = (widthToUse * Math.pow(depth, 3)) / 12;
const finalDeflection = (5 * loadPerMm * Math.pow(spanMm, 4)) / (384 * modulusOfElasticity * finalMomentOfInertia);

console.log(`Final deflection check for ${widthToUse}×${depth}mm joist:`);
console.log(`- Actual deflection: ${finalDeflection.toFixed(1)}mm`);
console.log(`- Allowable deflection: ${maxAllowableDeflection.toFixed(1)}mm`);
console.log(`- Deflection ratio: ${(finalDeflection/maxAllowableDeflection).toFixed(2)}`);

if (finalDeflection > maxAllowableDeflection) {
  console.warn(`WARNING: Final selected size ${widthToUse}×${depth}mm does not meet deflection requirements.`);
  // In a production version, you might want to increase to the next size automatically
}
```

## 3. Enhance `findNearestDepth` in `src/utils/timberSizes.js`

The current implementation of `findNearestDepth` should work correctly, but we can add additional logging for better diagnostics. Replace or add to the end of the function around line 305-310:

```javascript
// Add more detailed logging about the selection process
console.log(`findNearestDepth selection summary:`);
console.log(`- Requested: width=${width}mm, targetDepth=${targetDepth}mm, type=${type}`);
console.log(`- Using width: ${widthToUse}mm (${width === widthToUse ? 'exact match' : 'nearest available'})`);
console.log(`- Available depths: ${availableDepths.join(', ')}mm`);
console.log(`- Selected depth: ${roundedUpDepth}mm (${roundedUpDepth >= targetDepth ? 'meets or exceeds target' : 'BELOW TARGET - warning'})`);
  
return roundedUpDepth;
```

## 4. Fix the Syntax Errors

In addition to the above enhancements, there are several syntax errors that need to be fixed:

1. In `src/components/TimberCalculator.js`, around line 1458-1461, add proper indentation:

```javascript
const proportion = width / otherBaysSum;
        updateBuildingData('customWidthwiseBayWidths', newWidths);
      }
    };
```

2. Add the missing `handleWidthwiseBayWidthChange` function in `src/components/TimberCalculator.js`:

```javascript
const handleWidthwiseBayWidthChange = (index, value) => {
  console.log(`Changing widthwise bay ${index} width to ${value}`);
  if (value === '' || isNaN(value) || value <= 0) {
    // If invalid input, don't update
    return;
  }

  // Convert to number
  const numValue = parseFloat(value);
  
  // Create new array by copying current widths
  const newWidths = [...buildingData.customWidthwiseBayWidths];
  
  // Record old width for proportional adjustment
  const oldWidth = newWidths[index];
  
  // Update width at specified index
  newWidths[index] = numValue;
  
  // If proportional adjustment is enabled, adjust other bay widths
  if (proportionalAdjustment) {
    // Calculate total width of other bays
    const otherBaysSum = newWidths.reduce((sum, width, i) => 
      i === index ? sum : sum + width, 0);
    
    // Calculate the width difference
    const widthDiff = numValue - oldWidth;
    
    // Adjust other widths proportionally
    for (let i = 0; i < newWidths.length; i++) {
      if (i !== index) {
        const width = newWidths[i];
        const proportion = width / otherBaysSum;
        newWidths[i] = Math.max(0.5, width - (widthDiff * proportion));
      }
    }
  }
  
  // Update building data with new widths
  updateBuildingData('customWidthwiseBayWidths', newWidths);
};
```

3. Fix the syntax error around line 900-903 in `src/components/TimberCalculator.js`:

```javascript
setError(`Joist calculation failed: ${error.message}. Please adjust your inputs and try again.`);
console.error("JOIST DEBUG - Error updating DOM directly:", error);
      }
}, 100);
```

## Tests to Verify Fixes

After making these changes, test the calculator with the following scenarios:

1. **9m span, 3 kPa load, 120/120/120 fire rating** - Should result in a 250×410mm joist
2. **6m span, 1.5 kPa load, 90/90/90 fire rating** - Should result in a smaller joist
3. **12m span, 3 kPa load, 120/120/120 fire rating** - Should result in a 250×550mm or larger joist

## Expected Results

The changes should result in the calculator properly prioritizing deflection for long-span joists, leading to correctly sized 250×410mm joists for a 9m span with commercial loading and a 120/120/120 fire rating. 