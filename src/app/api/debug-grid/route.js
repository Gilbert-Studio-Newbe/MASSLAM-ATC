import { NextResponse } from 'next/server';
import { calculateBeamSize, calculateJoistSize } from '@/utils/timberEngineering';

export async function GET(request) {
  console.log("API: Debug grid calculation endpoint called");
  
  // Define odd-sized bays for testing
  const lengthwiseBayWidths = [5.55, 6.90]; // meters
  const widthwiseBayWidths = [4.20, 3.75]; // meters
  
  // Parameters
  const load = 2.0; // kPa
  const timberGrade = 'ML38';
  const fireRating = 'none';
  
  // Test both joist directions
  const results = {
    lengthwiseBayWidths,
    widthwiseBayWidths,
    tests: [
      {
        joistsRunLengthwise: true,
        gridCells: []
      },
      {
        joistsRunLengthwise: false,
        gridCells: []
      }
    ]
  };
  
  // Run tests for both joist directions
  for (let testIndex = 0; testIndex < 2; testIndex++) {
    const joistsRunLengthwise = results.tests[testIndex].joistsRunLengthwise;
    
    // Calculate for each grid cell
    for (let row = 0; row < widthwiseBayWidths.length; row++) {
      for (let col = 0; col < lengthwiseBayWidths.length; col++) {
        const bayWidth = lengthwiseBayWidths[col];
        const bayHeight = widthwiseBayWidths[row];
        
        // Joists - use global direction setting
        const joistsSpanLengthwise = joistsRunLengthwise;
        const joistSpan = joistsSpanLengthwise ? bayWidth : bayHeight;
        const joistSpacing = 800; // mm
        
        // Calculate joist size
        const joistSize = calculateJoistSize(joistSpan, joistSpacing, load, timberGrade, fireRating);
        
        // Beams - perpendicular to joists
        const beamsSpanLengthwise = !joistsSpanLengthwise;
        const beamSpan = beamsSpanLengthwise ? bayWidth : bayHeight;
        
        // Calculate tributary width (half the perpendicular span)
        const tributaryWidth = beamsSpanLengthwise ? bayHeight / 2 : bayWidth / 2;
        
        // Calculate beam size
        const beamSize = calculateBeamSize(beamSpan, load, timberGrade, tributaryWidth, fireRating);
        
        // Add to results
        results.tests[testIndex].gridCells.push({
          position: `R${row+1}C${col+1}`,
          dimensions: {
            width: bayWidth,
            height: bayHeight
          },
          joist: {
            span: joistSpan,
            spanDirection: joistsSpanLengthwise ? "lengthwise" : "widthwise",
            size: {
              width: joistSize.width,
              depth: joistSize.depth
            }
          },
          beam: {
            span: beamSpan,
            spanDirection: beamsSpanLengthwise ? "lengthwise" : "widthwise",
            tributaryWidth,
            size: {
              width: beamSize.width,
              depth: beamSize.depth
            }
          }
        });
      }
    }
  }
  
  return NextResponse.json({ success: true, results });
} 