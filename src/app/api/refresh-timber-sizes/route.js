import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// Set the endpoint to be dynamic
export const dynamic = 'force-dynamic';
export const maxDuration = 10; // 10 seconds
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    // Path to the CSV file
    const filePath = path.join(process.cwd(), 'public', 'data', 'masslam_sizes.csv');
    
    // Read the current CSV file
    const fileContent = await readFile(filePath, 'utf8');
    const lines = fileContent.trim().split('\n');
    
    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, message: 'CSV file must have at least a header row and one data row' },
        { status: 400 }
      );
    }
    
    const headers = lines[0].split(',');
    const requiredHeaders = ['width', 'depth', 'type'];
    
    // Check if all required headers are present
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `CSV file is missing required headers: ${missingHeaders.join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    // Count the number of data rows (excluding header and empty lines)
    const dataRows = lines.slice(1).filter(line => line.trim()).length;
    
    return NextResponse.json({
      success: true,
      message: `Timber sizes refreshed successfully with ${dataRows} sizes.`,
      dataRows
    });
  } catch (error) {
    console.error('Error refreshing timber sizes:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
} 