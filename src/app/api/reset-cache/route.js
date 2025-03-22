"use server";

import { NextResponse } from 'next/server';

// API route to clear cache and reset to defaults
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Cache reset API route. Use the included JavaScript to clear localStorage.',
    script: `
      // Clear localStorage
      localStorage.clear();
      
      // Reload the page
      window.location.href = '/';
    `
  });
} 