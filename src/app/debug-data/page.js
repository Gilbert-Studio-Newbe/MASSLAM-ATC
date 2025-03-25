'use client';

import { useEffect, useState } from 'react';
import { useBuildingData } from '@/contexts/BuildingDataContext';
import { calculateStructure } from '@/utils/timber-calculator';

export default function DebugPage() {
  const { buildingData } = useBuildingData();
  const [results, setResults] = useState(null);
  
  useEffect(() => {
    try {
      // Use default values if none are set
      const testData = {
        buildingLength: 20,
        buildingWidth: 15,
        numFloors: 1,
        floorHeight: 3.0,
        joistsRunLengthwise: true,
        joistSpacing: 0.4,
        load: 2.0,
        timberGrade: 'GL18C',
        fireRating: 'none',
        lengthwiseBays: 3,
        widthwiseBays: 2
      };
      
      // Calculate results
      const testResults = calculateStructure(testData);
      setResults(testResults);
    } catch (error) {
      console.error('Error calculating test data:', error);
    }
  }, []);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Debug Data Page</h1>
      
      <div className="bg-blue-50 p-4 mb-6 rounded">
        <h2 className="text-xl font-bold mb-2">Test Calculation Data</h2>
        {results ? (
          <div>
            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        ) : (
          <p>Calculating test data...</p>
        )}
      </div>
      
      <div className="bg-yellow-50 p-4 rounded">
        <h2 className="text-xl font-bold mb-2">Context Building Data</h2>
        <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-96">
          {JSON.stringify(buildingData, null, 2)}
        </pre>
      </div>
    </div>
  );
} 