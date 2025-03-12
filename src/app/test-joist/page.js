'use client';

import { useState, useEffect } from 'react';
import { 
  initializeMasslamSizes, 
  loadMasslamSizes, 
  getMasslamSizes,
  debugMasslamSizesLoading
} from '@/utils/timberSizes';
import { calculateJoistSize } from '@/utils/timberEngineering';

export default function TestJoistPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sizes, setSizes] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);
  const [joistResult, setJoistResult] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('TestJoistPage: Initializing MASSLAM sizes module');
        initializeMasslamSizes();
        
        console.log('TestJoistPage: Loading MASSLAM sizes from CSV');
        const loadedSizes = await loadMasslamSizes();
        console.log(`TestJoistPage: Loaded ${loadedSizes.length} MASSLAM sizes`);
        
        // Get debug info
        const debug = debugMasslamSizesLoading();
        setDebugInfo(debug);
        
        // Get all sizes
        const allSizes = getMasslamSizes();
        setSizes(allSizes);
        
        // Calculate joist size
        const span = 6.0; // 6 meters
        const spacing = 800; // 800mm
        const load = 2.0; // 2 kPa (residential)
        const timberGrade = 'ML38';
        const fireRating = 'none';
        
        console.log(`TestJoistPage: Calculating joist size for span=${span}m, spacing=${spacing}mm, load=${load}kPa, grade=${timberGrade}, fire=${fireRating}`);
        const result = calculateJoistSize(span, spacing, load, timberGrade, fireRating);
        console.log('TestJoistPage: Joist calculation result:', result);
        setJoistResult(result);
        
        setLoading(false);
      } catch (err) {
        console.error('TestJoistPage: Error:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Test Joist Calculation</h1>
      
      {loading && (
        <div className="bg-yellow-100 p-4 rounded mb-4">
          <p className="text-yellow-800">Loading and calculating...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 p-4 rounded mb-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}
      
      {debugInfo && (
        <div className="bg-blue-100 p-4 rounded mb-4">
          <h2 className="text-xl font-bold mb-2">Debug Info</h2>
          <pre className="bg-gray-100 p-2 rounded">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
      
      {joistResult && (
        <div className="bg-green-100 p-4 rounded mb-4">
          <h2 className="text-xl font-bold mb-2">Joist Calculation Result</h2>
          <div className="bg-white p-4 rounded shadow">
            <p className="font-bold">Final Joist Size:</p>
            <p className="text-xl">{joistResult.width}mm width × {joistResult.depth}mm depth</p>
            
            <div className="mt-4">
              <p className="font-bold">Input Parameters:</p>
              <ul className="list-disc pl-5">
                <li>Span: {joistResult.span} meters</li>
                <li>Spacing: {joistResult.spacing} mm</li>
                <li>Load: {joistResult.load} kPa</li>
                <li>Total Load (with self-weight): {joistResult.totalLoad?.toFixed(2)} kPa</li>
                <li>Timber Grade: {joistResult.grade}</li>
                <li>Fire Rating: {joistResult.fireRating}</li>
              </ul>
            </div>
            
            <div className="mt-4">
              <p className="font-bold">Engineering Details:</p>
              <ul className="list-disc pl-5">
                <li>Bending Moment: {joistResult.engineering?.bendingMoment?.toFixed(2)} kNm</li>
                <li>Shear Force: {joistResult.engineering?.shearForce?.toFixed(2)} kN</li>
                <li>Actual Deflection: {joistResult.engineering?.actualDeflection?.toFixed(2)} mm</li>
                <li>Allowable Deflection: {joistResult.engineering?.allowableDeflection?.toFixed(2)} mm</li>
              </ul>
            </div>
            
            <div className="mt-4">
              <p className="font-bold">Utilization Ratios:</p>
              <ul className="list-disc pl-5">
                <li>Bending: {(joistResult.engineering?.utilization?.bending * 100)?.toFixed(1)}%</li>
                <li>Shear: {(joistResult.engineering?.utilization?.shear * 100)?.toFixed(1)}%</li>
                <li>Deflection: {(joistResult.engineering?.utilization?.deflection * 100)?.toFixed(1)}%</li>
                <li>Overall: {(joistResult.engineering?.utilization?.overall * 100)?.toFixed(1)}%</li>
              </ul>
            </div>
            
            <div className="mt-4">
              <p className="font-bold">Using Fallback Values: {joistResult.usingFallback ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-2">MASSLAM Sizes</h2>
        
        {sizes.length === 0 ? (
          <p className="text-red-500">No sizes loaded!</p>
        ) : (
          <>
            <p className="mb-2">Loaded {sizes.length} sizes</p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b">Width (mm)</th>
                    <th className="py-2 px-4 border-b">Depth (mm)</th>
                    <th className="py-2 px-4 border-b">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {sizes
                    .filter(size => size.type === 'joist')
                    .slice(0, 20)
                    .map((size, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-2 px-4 border-b">{size.width}</td>
                      <td className="py-2 px-4 border-b">{size.depth}</td>
                      <td className="py-2 px-4 border-b">{size.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 