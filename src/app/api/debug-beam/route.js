import { NextResponse } from 'next/server';
import { calculateBeamSize } from '@/utils/timberEngineering';

export async function GET(request) {
  console.log('API: Debug beam calculation endpoint called');
  
  try {
    // Define test parameters
    const span = 7.0; // 7m span
    const load = 2.0; // 2kPa load
    const timberGrade = 'ML38';
    const fireRating = 'none';
    
    // Test different tributary width scenarios
    const tests = [
      {
        name: 'Edge beam (small tributary width)',
        tributaryWidth: 0.8, // 800mm joist spacing
        description: 'Using joist spacing as tributary width (old method)'
      },
      {
        name: 'Interior beam (realistic tributary width)',
        tributaryWidth: 3.5, // Half of a 7m bay
        description: 'Using half the perpendicular bay dimension (new method)'
      }
    ];
    
    // Run tests
    const results = [];
    for (const test of tests) {
      console.log(`API: Calculating beam size for span=${span}m, load=${load}kPa, grade=${timberGrade}, tributary width=${test.tributaryWidth}m, fire=${fireRating}`);
      const beamSize = calculateBeamSize(span, load, timberGrade, test.tributaryWidth, fireRating);
      
      results.push({
        ...test,
        result: {
          width: beamSize.width,
          depth: beamSize.depth,
          span: span,
          loadPerMeter: beamSize.loadPerMeter,
          selfWeight: beamSize.selfWeight
        }
      });
    }
    
    return NextResponse.json({
      span,
      load,
      timberGrade,
      fireRating,
      tests: results
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 