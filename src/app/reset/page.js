"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Clear localStorage
    try {
      localStorage.clear();
      console.log('LocalStorage cleared successfully');
      
      // Add small delay before redirecting
      setTimeout(() => {
        // Redirect to home page
        router.push('/');
      }, 1000);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold mb-4">Resetting Application...</h1>
        <p className="mb-4">Clearing local storage and resetting to defaults.</p>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-500">You will be redirected to the home page automatically.</p>
      </div>
    </div>
  );
} 