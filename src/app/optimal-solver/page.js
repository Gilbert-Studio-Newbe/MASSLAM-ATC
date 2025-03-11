'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  calculateJoistSize, 
  calculateBeamSize, 
  calculateTimberWeight,
  TIMBER_PROPERTIES
} from '@/utils/timberEngineering';
import { calculateCost, formatCurrency } from '@/utils/costEstimator';

// Optimal Structural Solver Page
export default function OptimalSolverPage() {
  // Input parameters
  const [buildingLength, setBuildingLength] = useState(12);
  const [buildingWidth, setBuildingWidth] = useState(9);
  const [numFloors, setNumFloors] = useState(1);
  const [floorHeight, setFloorHeight] = useState(3);
  const [load, setLoad] = useState(3.0); // kPa
  const [fireRating, setFireRating] = useState('none');
  const [timberGrade, setTimberGrade] = useState('MASSLAM_SL33');
  
  // Optimization results
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);
  
  // Function to calculate the optimal bay layout and joist direction
  const calculateOptimalStructure = () => {
    setIsCalculating(true);
    setError(null);
    
    try {
      // Define the range of bay configurations to test
      const minBays = 1;
      const maxBays = 5; // Limit to reasonable number of bays
      
      let bestConfig = null;
      let lowestCost = Infinity;
      
      // Test different bay configurations
      for (let lengthwiseBays = minBays; lengthwiseBays <= maxBays; lengthwiseBays++) {
        for (let widthwiseBays = minBays; widthwiseBays <= maxBays; widthwiseBays++) {
          // Test both joist directions
          for (let joistsRunLengthwise of [true, false]) {
            // Calculate bay dimensions
            const bayLengthWidth = buildingLength / lengthwiseBays;
            const bayWidthWidth = buildingWidth / widthwiseBays;
            
            // Calculate joist span based on direction
            const joistSpan = joistsRunLengthwise ? bayWidthWidth : bayLengthWidth;
            
            // Skip if joist span is too large (> 9m as a reasonable limit)
            if (joistSpan > 9) continue;
            
            // Calculate beam span based on joist direction
            const beamSpan = joistsRunLengthwise ? bayLengthWidth : bayWidthWidth;
            
            // Skip if beam span is too large (> 9m as a reasonable limit)
            if (beamSpan > 9) continue;
            
            // Calculate joist size based on span, load, and timber grade
            const joistSize = calculateJoistSize(joistSpan, 0.8, load, timberGrade, fireRating);
            
            // Calculate beam size based on span, load, and timber grade
            const beamSize = calculateBeamSize(beamSpan, load, timberGrade, fireRating);
            
            // Calculate column size (simplified for this example)
            const columnSize = {
              width: beamSize.width,
              depth: beamSize.width,
              height: floorHeight
            };
            
            // Calculate timber weight and volumes
            const timberResult = calculateTimberWeight(
              joistSize,
              beamSize,
              columnSize,
              buildingLength,
              buildingWidth,
              numFloors,
              lengthwiseBays,
              widthwiseBays,
              joistsRunLengthwise,
              timberGrade
            );
            
            // Calculate cost
            const costResult = calculateCost(
              timberResult,
              joistSize,
              buildingLength,
              buildingWidth,
              numFloors
            );
            
            // Check if this configuration has a lower cost
            if (costResult.totalCost < lowestCost) {
              lowestCost = costResult.totalCost;
              bestConfig = {
                lengthwiseBays,
                widthwiseBays,
                joistsRunLengthwise,
                joistSpan,
                beamSpan,
                joistSize,
                beamSize,
                columnSize,
                timberResult,
                costResult
              };
            }
          }
        }
      }
      
      // Set the results
      setResults(bestConfig);
    } catch (err) {
      console.error('Error calculating optimal structure:', err);
      setError('Error calculating optimal structure. Please check your inputs.');
    } finally {
      setIsCalculating(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Optimal Structural Solver</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Building Parameters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Building Length */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Building Length (m)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              step="0.1"
              value={buildingLength}
              onChange={(e) => setBuildingLength(parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          {/* Building Width */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Building Width (m)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              step="0.1"
              value={buildingWidth}
              onChange={(e) => setBuildingWidth(parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          {/* Number of Floors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Floors
            </label>
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              value={numFloors}
              onChange={(e) => setNumFloors(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          {/* Floor Height */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Floor Height (m)
            </label>
            <input
              type="number"
              min="2"
              max="6"
              step="0.1"
              value={floorHeight}
              onChange={(e) => setFloorHeight(parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          {/* Load */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Load (kPa)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              step="0.1"
              value={load}
              onChange={(e) => setLoad(parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          {/* Fire Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fire Rating
            </label>
            <select
              value={fireRating}
              onChange={(e) => setFireRating(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="none">None</option>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
              <option value="120">120 minutes</option>
            </select>
          </div>
          
          {/* Timber Grade - Now hardcoded to MASSLAM_SL33 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timber Grade
            </label>
            <input
              type="text"
              value="MASSLAM_SL33"
              disabled
              className="w-full p-2 border border-gray-300 rounded bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Using properties from MASSLAM_SL33_Mechanical_Properties.csv
            </p>
          </div>
        </div>
        
        {/* Calculate Button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={calculateOptimalStructure}
            disabled={isCalculating}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition duration-300 disabled:opacity-50"
          >
            {isCalculating ? 'Calculating...' : 'Find Optimal Structure'}
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>
      
      {/* Results Section */}
      {results && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Optimal Structure Results</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Configuration Details */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Configuration</h3>
              <div className="space-y-2">
                <p><strong>Lengthwise Bays:</strong> {results.lengthwiseBays}</p>
                <p><strong>Widthwise Bays:</strong> {results.widthwiseBays}</p>
                <p><strong>Joist Direction:</strong> {results.joistsRunLengthwise ? 'Lengthwise' : 'Widthwise'}</p>
                <p><strong>Joist Span:</strong> {results.joistSpan.toFixed(2)} m</p>
                <p><strong>Beam Span:</strong> {results.beamSpan.toFixed(2)} m</p>
              </div>
              
              <h3 className="font-semibold text-lg mt-6 mb-3">Member Sizes</h3>
              <div className="space-y-2">
                <p><strong>Joists:</strong> {results.joistSize.width} x {results.joistSize.depth} mm</p>
                <p><strong>Beams:</strong> {results.beamSize.width} x {results.beamSize.depth} mm</p>
                <p><strong>Columns:</strong> {results.columnSize.width} x {results.columnSize.depth} mm</p>
              </div>
              
              <h3 className="font-semibold text-lg mt-6 mb-3">Cost Breakdown</h3>
              <div className="space-y-2">
                <p><strong>Joists:</strong> {formatCurrency(results.costResult.elements.joists.cost)}</p>
                <p><strong>Beams:</strong> {formatCurrency(results.costResult.elements.beams.cost)}</p>
                <p><strong>Columns:</strong> {formatCurrency(results.costResult.elements.columns.cost)}</p>
                <p className="font-bold text-lg mt-2"><strong>Total Cost:</strong> {formatCurrency(results.costResult.totalCost)}</p>
              </div>
            </div>
            
            {/* Visualization */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Floor Plan Visualization</h3>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 h-96 relative">
                {/* Floor Plan Canvas */}
                <div className="w-full h-full relative">
                  {/* Building Outline */}
                  <div className="absolute inset-0 border-2 border-gray-800 m-4">
                    {/* Bay Grid Lines */}
                    {Array.from({ length: results.lengthwiseBays - 1 }).map((_, index) => (
                      <div 
                        key={`lengthwise-${index}`}
                        className="absolute top-0 bottom-0 border-l-2 border-gray-500 border-dashed"
                        style={{ 
                          left: `${((index + 1) / results.lengthwiseBays) * 100}%` 
                        }}
                      />
                    ))}
                    
                    {Array.from({ length: results.widthwiseBays - 1 }).map((_, index) => (
                      <div 
                        key={`widthwise-${index}`}
                        className="absolute left-0 right-0 border-t-2 border-gray-500 border-dashed"
                        style={{ 
                          top: `${((index + 1) / results.widthwiseBays) * 100}%` 
                        }}
                      />
                    ))}
                    
                    {/* Joist Direction Indicator */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div 
                        className={`w-3/4 h-3/4 flex ${results.joistsRunLengthwise ? 'flex-row' : 'flex-col'} items-center justify-center`}
                      >
                        {Array.from({ length: 5 }).map((_, index) => (
                          <div 
                            key={`joist-${index}`}
                            className={`${results.joistsRunLengthwise ? 'h-1/2 w-px mx-3' : 'w-1/2 h-px my-3'} bg-blue-500`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="absolute bottom-2 right-2 bg-white p-2 rounded border border-gray-300 text-xs">
                      <div className="flex items-center mb-1">
                        <div className="w-4 h-0 border-t-2 border-gray-500 border-dashed mr-2"></div>
                        <span>Bay Division</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-0 border-t border-blue-500 mr-2"></div>
                        <span>Joist Direction</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded text-sm">
                <p className="font-semibold">Building Dimensions:</p>
                <p>Length: {buildingLength} m, Width: {buildingWidth} m</p>
                <p className="mt-2 font-semibold">Bay Dimensions:</p>
                <p>Length: {(buildingLength / results.lengthwiseBays).toFixed(2)} m, Width: {(buildingWidth / results.widthwiseBays).toFixed(2)} m</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-center">
            <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
              Return to Main Calculator
            </Link>
          </div>
        </div>
      )}
    </div>
  );
} 