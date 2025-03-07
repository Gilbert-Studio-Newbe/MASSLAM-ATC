import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

// Set the maximum size limit for the request body
export const dynamic = 'force-dynamic';
export const maxDuration = 10; // 10 seconds
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Check if the file is a CSV
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, message: 'File must be a CSV' },
        { status: 400 }
      );
    }
    
    // Convert the file to a Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Validate the CSV content
    const content = buffer.toString();
    const lines = content.trim().split('\n');
    
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
    
    // Get the index of each header
    const widthIndex = headers.indexOf('width');
    const depthIndex = headers.indexOf('depth');
    const typeIndex = headers.indexOf('type');
    
    // Validate each data row
    const validTypes = ['beam', 'column', 'joist'];
    const invalidRows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = line.split(',');
      
      // Ensure we have enough values
      if (values.length < Math.max(widthIndex, depthIndex, typeIndex) + 1) {
        invalidRows.push({ line: i + 1, reason: 'Insufficient values' });
        continue;
      }
      
      // Validate width and depth are numbers
      const width = Number(values[widthIndex]);
      const depth = Number(values[depthIndex]);
      const type = values[typeIndex].trim();
      
      if (isNaN(width) || width <= 0) {
        invalidRows.push({ line: i + 1, reason: 'Width must be a positive number' });
      }
      
      if (isNaN(depth) || depth <= 0) {
        invalidRows.push({ line: i + 1, reason: 'Depth must be a positive number' });
      }
      
      if (!validTypes.includes(type)) {
        invalidRows.push({ 
          line: i + 1, 
          reason: `Type must be one of: ${validTypes.join(', ')}` 
        });
      }
    }
    
    if (invalidRows.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `CSV file contains ${invalidRows.length} invalid rows`,
          invalidRows 
        },
        { status: 400 }
      );
    }
    
    // Save the file to the public directory
    const filePath = path.join(process.cwd(), 'public', 'data', 'masslam_sizes.csv');
    await writeFile(filePath, content);
    
    // Count the number of data rows (excluding header and empty lines)
    const dataRows = lines.slice(1).filter(line => line.trim()).length;
    
    return NextResponse.json({
      success: true,
      message: `CSV file uploaded successfully with ${dataRows} sizes.`,
      dataRows
    });
  } catch (error) {
    console.error('Error uploading CSV file:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
} 