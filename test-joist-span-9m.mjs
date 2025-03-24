// Test script for joist calculator with 9m span
// This script verifies if the joist calculator returns the expected depth of 480mm for a 9m span

// Using ES modules syntax for imports
import { calculateJoistSize } from './src/utils/calculations/joist-calculator.js';
import { initializeTimberUtils } from './src/utils/timber-utils.js';

// Initialize the timber utils (needed for the calculation)
initializeTimberUtils();

// Define test parameters
const span = 9; // 9 meters
const spacing = 800; // 800mm spacing
const load = 2; // 2kPa
const timberGrade = 'ML38';
const fireRating = 'none';
const deflectionLimit = 300; // L/300
const safetyFactor = 1.5;

// Run the calculation
console.log(`Testing joist calculation with span=${span}m`);
const result = calculateJoistSize(
  span,
  spacing,
  load,
  timberGrade,
  fireRating,
  deflectionLimit,
  safetyFactor
);

// Log the results
console.log('\nRESULT:');
console.log(`Width: ${result.width}mm`);
console.log(`Depth: ${result.depth}mm`);
console.log(`Governing: ${result.isDeflectionGoverning ? 'Deflection' : 'Bending'}`);
console.log(`Bending depth required: ${result.bendingDepth}mm`);
console.log(`Deflection depth required: ${result.deflectionDepth}mm`);
console.log(`Fire adjusted depth: ${result.fireAdjustedDepth}mm`);

// Verify the expected depth
const expectedDepth = 480;
if (result.depth === expectedDepth) {
  console.log(`\n✅ SUCCESS: Joist depth matches expected value of ${expectedDepth}mm`);
} else {
  console.log(`\n❌ FAILURE: Expected depth of ${expectedDepth}mm but got ${result.depth}mm`);
} 