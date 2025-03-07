/**
 * Utility functions for validating timber sizes
 */
import { TIMBER_SIZES } from "./timberSizes";

/**
 * Validate if a timber size is valid for a specific component type
 * 
 * @param {number} width - Width in mm
 * @param {number} depth - Depth in mm
 * @param {string} componentType - Component type ("joist", "beam", or "post")
 * @returns {Object} Validation result with isValid flag and message
 */
export function validateTimberSize(width, depth, componentType) {
  const sizeData = TIMBER_SIZES[componentType];
  if (!sizeData) {
    return { 
      isValid: false, 
      message: `Unknown component type: ${componentType}` 
    };
  }
  
  // Check if width is valid
  if (!sizeData.widths.includes(width)) {
    return { 
      isValid: false, 
      message: `Invalid width: ${width}mm is not a standard ${componentType} width` 
    };
  }
  
  // Check if depth is valid
  if (!sizeData.depths.includes(depth)) {
    return { 
      isValid: false, 
      message: `Invalid depth: ${depth}mm is not a standard ${componentType} depth` 
    };
  }
  
  // Check if the combination is valid
  const combination = sizeData.validCombinations.find(combo => combo.width === width);
  if (!combination || !combination.depths.includes(depth)) {
    return { 
      isValid: false, 
      message: `Invalid combination: ${width}mm × ${depth}mm is not a standard ${componentType} size` 
    };
  }
  
  return { 
    isValid: true, 
    message: `Valid ${componentType} size: ${width}mm × ${depth}mm` 
  };
}

/**
 * Check if a timber size is adequate for a given span and load
 * 
 * @param {number} width - Width in mm
 * @param {number} depth - Depth in mm
 * @param {string} componentType - Component type ("joist", "beam", or "post")
 * @param {number} span - Span in meters
 * @param {number} load - Load in kPa
 * @param {string} usage - Usage type ("residential", "commercial", or "heavyDuty")
 * @returns {Object} Assessment result with isAdequate flag and message
 */
export function assessTimberSize(width, depth, componentType, span, load, usage = "residential") {
  // First validate that the size is valid
  const validationResult = validateTimberSize(width, depth, componentType);
  if (!validationResult.isValid) {
    return {
      isAdequate: false,
      message: validationResult.message
    };
  }
  
  const sizeData = TIMBER_SIZES[componentType];
  
  // Convert span to mm
  const spanMm = span * 1000;
  
  // Calculate minimum depth based on span ratio
  const minDepth = Math.ceil(spanMm * (sizeData.minSpanRatios[usage] || sizeData.minSpanRatios.residential));
  
  if (depth < minDepth) {
    return {
      isAdequate: false,
      message: `Depth is inadequate for the span. Minimum recommended depth: ${minDepth}mm`,
      recommendation: {
        type: "increase_depth",
        minValue: minDepth
      }
    };
  }
  
  // For posts, check height ratio
  if (componentType === "post") {
    const maxHeight = width * sizeData.heightRatios.unbraced; // Using unbraced as the most conservative
    if (spanMm > maxHeight) {
      return {
        isAdequate: false,
        message: `Post height exceeds maximum recommended for this width. Consider bracing or increasing width.`,
        recommendation: {
          type: "increase_width",
          minValue: Math.ceil(spanMm / sizeData.heightRatios.unbraced)
        }
      };
    }
  }
  
  // For high loads, check if a wider section would be better
  if (load > 3 && componentType !== "post") {
    const widthIndex = sizeData.widths.indexOf(width);
    if (widthIndex < sizeData.widths.length - 1) {
      return {
        isAdequate: true,
        message: `Size is adequate, but a wider section may be better for the high load.`,
        recommendation: {
          type: "consider_wider",
          suggestedValue: sizeData.widths[widthIndex + 1]
        }
      };
    }
  }
  
  return {
    isAdequate: true,
    message: `Size is adequate for the specified span and load.`
  };
}
