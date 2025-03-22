"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetAllPage() {
  const router = useRouter();
  
  useEffect(() => {
    try {
      // Clear all localStorage
      localStorage.clear();
      console.log('All localStorage data has been cleared');
      
      // Force a complete page reload (not just client-side navigation)
      window.location.href = '/';
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      // If error, still try to redirect back home
      router.push('/');
    }
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold mb-4">Resetting Application...</h1>
        <p className="mb-6">Clearing all local storage and reloading the application from scratch.</p>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-sm text-gray-500">You will be redirected to the home page automatically.</p>
      </div>
    </div>
  );
} 