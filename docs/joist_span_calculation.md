# Joist Span Calculation Process in the Timber Calculator

This document outlines the complete flow of how joist spans are calculated in the MASSLAM Timber Calculator, from user input to final joist size determination.

## Overview of Calculation Flow

1. User inputs building dimensions
2. System calculates bay dimensions
3. Joist span is determined based on building orientation
4. Loads are calculated
5. Joist size is computed based on engineering formulas

## Detailed Process

### 1. User Input

The user provides the following inputs that affect joist span calculations:

- Building length and width
- Number of bays (lengthwise and widthwise)
- Joist direction preference (lengthwise or widthwise)
- Load ratings
- Fire resistance requirements
- Custom bay dimensions (optional)

### 2. Bay Dimension Calculation

Bay dimensions are calculated in the `calculateBayDimensions()` function:

```javascript
const calculateBayDimensions = () => {
  try {
    // Validate bay counts to ensure they're positive integers
    const lengthwiseBays = Math.max(1, parseInt(buildingData.lengthwiseBays) || 1);
    const widthwiseBays = Math.max(1, parseInt(buildingData.widthwiseBays) || 1);
    
    if (buildingData.useCustomBayDimensions) {
      // If using custom dimensions, use the custom bay widths
      return {
        lengthwiseBayWidths: [...buildingData.customLengthwiseBayWidths],
        widthwiseBayWidths: [...buildingData.customWidthwiseBayWidths]
      };
    } else {
      // Calculate equal bay widths
      const lengthwiseBayWidth = buildingData.buildingLength / lengthwiseBays;
      const widthwiseBayWidth = buildingData.buildingWidth / widthwiseBays;
      
      // Create arrays with equal bay widths
      const lengthwiseBayWidths = Array(lengthwiseBays).fill(lengthwiseBayWidth);
      const widthwiseBayWidths = Array(widthwiseBays).fill(widthwiseBayWidth);
      
      return {
        lengthwiseBayWidths,
        widthwiseBayWidths
      };
    }
  } catch (error) {
    console.error("Error calculating bay dimensions:", error);
    // Return default values to avoid further errors
    return {
      lengthwiseBayWidths: [buildingData.buildingLength],
      widthwiseBayWidths: [buildingData.buildingWidth]
    };
  }
};
```

### 3. Joist Span Determination

In the `calculateResults()` function, the joist span is determined based on:
1. The bay dimensions calculated above
2. The joist orientation setting selected by the user

```javascript
// Get bay dimensions
const { lengthwiseBayWidths, widthwiseBayWidths } = calculateBayDimensions();

// Find the maximum bay span (for joists)
let maxLengthwiseSpan = Math.max(...lengthwiseBayWidths);
let maxWidthwiseSpan = Math.max(...widthwiseBayWidths);

// Determine joist span based on global direction setting
// instead of automatically using the shorter distance
const joistSpan = buildingData.joistsRunLengthwise ? maxLengthwiseSpan : maxWidthwiseSpan;
```

The key points here:
- The system finds the maximum span in each direction
- The joist orientation setting (`buildingData.joistsRunLengthwise`) determines which span to use
- If joists run lengthwise, the joists span across the length of each bay
- If joists run widthwise, the joists span across the width of each bay

### 4. Load Calculation

The system calculates the total load that the joists must bear, including:
- User-specified imposed load
- Concrete load based on fire resistance requirements

```javascript
// Calculate concrete thickness based on fire rating
const getConcreteThickness = (frl) => {
  switch (frl) {
    case 'none':
    case '30/30/30':
    case '60/60/60':
      return 100; // 100mm for FRL 0/0/0, 30/30/30, 60/60/60
    case '90/90/90':
      return 110; // 110mm for FRL 90/90/90
    case '120/120/120':
      return 120; // 120mm for FRL 120/120/120
    default:
      return 100; // Default to 100mm
  }
};

// Calculate concrete load based on thickness
const calculateConcreteLoad = (thickness) => {
  const CONCRETE_DENSITY = 2400; // kg/m³
  
  // Calculate concrete volume per m²
  const concreteVolumePerM2 = thickness / 1000; // m³/m² (thickness in m)
  
  // Calculate concrete mass per m²
  const concreteMassPerM2 = concreteVolumePerM2 * CONCRETE_DENSITY; // kg/m²
  
  // Convert to kPa (1 kg/m² = 0.00981 kPa)
  const concreteLoadKpa = concreteMassPerM2 * 0.00981;
  
  return {
    thickness,
    massPerM2: concreteMassPerM2.toFixed(1),
    loadKpa: concreteLoadKpa.toFixed(2)
  };
};

// Get concrete thickness and load based on current fire rating
const concreteThickness = getConcreteThickness(buildingData.fireRating);
const concreteLoadData = calculateConcreteLoad(concreteThickness);

// Calculate total load including concrete load
const totalLoad = parseFloat(load) + parseFloat(concreteLoadData.loadKpa);
```

### 5. Joist Size Calculation

Once the span and load are determined, the system calculates the required joist size:

```javascript
// Calculate joist size based on span and load
let joistSize;
try {
  joistSize = calculateJoistSize(joistSpan, 800, totalLoad, timberGrade, buildingData.fireRating);
  console.log("JOIST DEBUG - Standard calculation successful:", joistSize);
  
  // Verify joist size is valid
  if (!joistSize || !joistSize.width || !joistSize.depth) {
    throw new Error("Invalid joist dimensions returned from calculation");
  }
} catch (error) {
  console.error("JOIST DEBUG - Error in joist calculation:", error);
  // Set an error and exit early
  setError(`Joist calculation failed: ${error.message}. Please adjust your inputs and try again.`);
  return;
}
```

The application uses a comprehensive engineering calculation in the `calculateJoistSize` function that accounts for:
- Bending strength requirements
- Deflection limits
- Shear strength requirements
- Fire resistance requirements
- Standard timber sizes available

### 6. Error Handling and Validation

The application includes multiple layers of error handling:

1. Input validation to ensure all values are positive
2. Explicit error messages when calculations fail
3. Validation of calculation results to ensure they contain required dimensions
4. User-friendly error notifications displayed in the UI

```javascript
// Sample of error handling
try {
  // Calculation code...
} catch (error) {
  console.error("JOIST DEBUG - Error in joist calculation:", error);
  // Display a clear error message
  setError(`Joist calculation failed: ${error.message}. Please adjust your inputs and try again.`);
  return;
}
```

The error messaging system:
- Provides specific information about what went wrong
- Suggests what the user might do to fix the issue
- Prevents the application from proceeding with invalid data

## Conclusion

The joist span calculation in the Timber Calculator follows a logical progression from user inputs to engineering calculations. The system is designed to be robust, with clear error handling to ensure users receive appropriate feedback when calculations cannot be completed with the given inputs. 