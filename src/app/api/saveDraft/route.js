import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Here you would typically save the draft data to a database
    // For now, we'll just return a success response
    
    return NextResponse.json({
      success: true,
      message: 'Draft saved successfully',
      data: data
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

