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
const lengthwiseBays = 3;
const widthwiseBays = 2;

try {
  // Calculate bay dimensions
  const bayLengthWidth = buildingLength / lengthwiseBays; // Width of each bay in the length direction
  const bayWidthWidth = buildingWidth / widthwiseBays; // Width of each bay in the width direction
  
  // Calculate number of joists
  const joistSpacing = 0.8; // 800mm spacing in meters
  const joistsRunLengthwise = true; // Assuming joists run lengthwise by default
  
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
  
  // Calculate number of beams
  // Beams run along the grid lines
  // Lengthwise beams: (widthwiseBays + 1) * lengthwiseBays
  // Widthwise beams: (lengthwiseBays + 1) * widthwiseBays
  const numLengthwiseBeams = (widthwiseBays + 1) * lengthwiseBays;
  const numWidthwiseBeams = (lengthwiseBays + 1) * widthwiseBays;
  
  // Total number of beams
  const totalBeams = (numLengthwiseBeams + numWidthwiseBeams) * numFloors;
  
  // Calculate beam volume
  const beamWidth = beamSize.width / 1000; // Convert mm to m
  const beamDepth = beamSize.depth / 1000; // Convert mm to m
  const lengthwiseBeamLength = bayLengthWidth;
  const widthwiseBeamLength = bayWidthWidth;
  const beamVolume = beamWidth * beamDepth * 
    ((numLengthwiseBeams * lengthwiseBeamLength) + (numWidthwiseBeams * widthwiseBeamLength)) * numFloors;
  
  // Calculate number of columns
  // Columns are at the intersections of grid lines
  // Number of columns = (lengthwiseBays + 1) * (widthwiseBays + 1)
  const totalColumns = (lengthwiseBays + 1) * (widthwiseBays + 1);
  
  // Calculate column volume
  const columnWidth = columnSize.width / 1000; // Convert mm to m
  const columnDepth = columnSize.depth / 1000; // Convert mm to m
  const columnHeight = columnSize.height; // Already in m
  const columnVolume = columnWidth * columnDepth * columnHeight * totalColumns;
  
  // Total volume
  const totalVolume = joistVolume + beamVolume + columnVolume;
  
  // Calculate weight using density
  const density = 600; // kg/m³ (default)
  const weight = totalVolume * density;
  
  // Calculate carbon savings
  const carbonSavings = totalVolume * 0.9; // tonnes CO2e
  
  console.log('Building dimensions:', buildingLength, 'm x', buildingWidth, 'm,', numFloors, 'floors');
  console.log('Bay dimensions:', lengthwiseBays, 'x', widthwiseBays, 'bays');
  console.log('Bay size:', bayLengthWidth.toFixed(2), 'm x', bayWidthWidth.toFixed(2), 'm');
  console.log();
  
  console.log('Structural elements:');
  console.log('Joists:', totalJoists, 'pieces,', numJoistsPerBay, 'per bay,', joistLength.toFixed(2), 'm length each');
  console.log('Beams:', totalBeams, 'pieces (', numLengthwiseBeams, 'lengthwise,', numWidthwiseBeams, 'widthwise)');
  console.log('Columns:', totalColumns, 'pieces');
  console.log();
  
  console.log('Calculated volumes:');
  console.log('Joist volume:', joistVolume.toFixed(2), 'm³');
  console.log('Beam volume:', beamVolume.toFixed(2), 'm³');
  console.log('Column volume:', columnVolume.toFixed(2), 'm³');
  console.log('Total volume:', totalVolume.toFixed(2), 'm³');
  console.log('Weight:', weight.toFixed(2), 'kg');
  console.log('Carbon Savings:', carbonSavings.toFixed(2), 'tonnes CO₂e');
} catch (error) {
  console.error('Error:', error.message);
} 