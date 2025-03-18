/**
 * Utility functions for joist calculations
 */

/**
 * Calculate the volume of joists in the building
 * 
 * @param {Object} joistSize - Joist dimensions (width, depth)
 * @param {number} buildingLength - Building length in meters
 * @param {number} buildingWidth - Building width in meters
 * @param {number} joistSpacing - Spacing between joists in meters (typically 0.8)
 * @returns {number} Total joist volume in cubic meters
 */
export function calculateJoistVolume(joistSize, buildingLength, buildingWidth, joistSpacing) {
  const joistWidth = joistSize.width / 1000; // Convert mm to m
  const joistDepth = joistSize.depth / 1000; // Convert mm to m
  const joistCount = Math.ceil((buildingLength / joistSpacing) * buildingWidth);
  const avgJoistLength = buildingWidth; // Simplified calculation
  
  const totalVolume = joistWidth * joistDepth * avgJoistLength * joistCount;
  
  console.log('Joist volume calculation details:', {
    joistWidth,
    joistDepth,
    joistCount,
    avgJoistLength,
    totalVolume
  });
  
  return totalVolume;
} 