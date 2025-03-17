'use client';

import BuildingVisualization from '../../components/BuildingVisualization';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VisualizationPage() {
  const router = useRouter();

  return (
    <div className="apple-container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <button 
          onClick={() => router.back()} 
          className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl md:text-3xl font-semibold">3D Building Visualization</h1>
      </div>

      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          This interactive 3D model shows your timber structure based on the calculated dimensions. 
          You can rotate, zoom, and pan to view the structure from different angles.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/" className="apple-button apple-button-secondary">
            Back to Calculator
          </Link>
        </div>
      </div>

      <div className="apple-card">
        <div className="apple-card-body p-0">
          <div className="h-[80vh] w-full">
            <BuildingVisualization />
          </div>
        </div>
      </div>
    </div>
  );
} 