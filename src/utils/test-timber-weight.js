// Test script for timber weight calculation

// Test calculations for timber volume and weight

// Test with a complex object (similar to how it's called in TimberCalculator.js)
console.log('Test: Complex object (similar to TimberCalculator.js call)');
const joistSize = { width: 90, depth: 240, fireAllowance: 0 };
const beamSize = { width: 135, depth: 360, fireAllowance: 0 };
const columnSize = { width: 135, depth: 135, height: 3.0, fireAllowance: 0 };
const buildingLength = 18;
const buildingWidth = 14;
const numFloors = 6;

try {
  // Calculate joist volume
  const joistWidth = joistSize.width / 1000; // Convert mm to m
  const joistDepth = joistSize.depth / 1000; // Convert mm to m
  const joistSpacing = 0.8; // 800mm spacing
  const numJoistsPerBay = Math.ceil(buildingLength / joistSpacing);
  const totalJoistLength = buildingWidth * numJoistsPerBay;
  const joistVolume = joistWidth * joistDepth * totalJoistLength * numFloors;
  
  // Calculate beam volume
  const beamWidth = beamSize.width / 1000; // Convert mm to m
  const beamDepth = beamSize.depth / 1000; // Convert mm to m
  const totalBeamLength = buildingLength; // Simplified
  const beamVolume = beamWidth * beamDepth * totalBeamLength * numFloors;
  
  // Calculate column volume
  const columnWidth = columnSize.width / 1000; // Convert mm to m
  const columnDepth = columnSize.depth / 1000; // Convert mm to m
  const columnHeight = columnSize.height; // Already in m
  const numColumns = 4; // Simplified
  const columnVolume = columnWidth * columnDepth * columnHeight * numColumns;
  
  // Total volume
  const totalVolume = joistVolume + beamVolume + columnVolume;
  
  // Calculate weight using density
  const density = 600; // kg/m³ (default)
  const weight = totalVolume * density;
  
  // Calculate carbon savings
  const carbonSavings = (weight / density) * 0.9; // tonnes CO2e
  
  console.log('Calculated volumes:');
  console.log('joistVolume:', joistVolume.toFixed(2), 'm³');
  console.log('beamVolume:', beamVolume.toFixed(2), 'm³');
  console.log('columnVolume:', columnVolume.toFixed(2), 'm³');
  console.log('totalVolume:', totalVolume.toFixed(2), 'm³');
  console.log('Weight:', weight.toFixed(2), 'kg');
  console.log('Carbon Savings:', carbonSavings.toFixed(2), 'tonnes CO₂e');
} catch (error) {
  console.error('Error:', error.message);
} 