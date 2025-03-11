'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  calculateJoistSize, 
  calculateBeamSize, 
  calculateTimberWeight,
  TIMBER_PROPERTIES
} from '@/utils/timberEngineering';
import { 
  loadMasslamSizes,
  getMasslamSizes,
  findNearestWidth,
  findNearestDepth
} from '@/utils/timberSizes';
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
  const timberGrade = 'MASSLAM_SL33'; // Fixed to MASSLAM_SL33
  
  // Optimization results
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [masslamSizesLoaded, setMasslamSizesLoaded] = useState(false);
  
  // Load MASSLAM sizes on component mount
  useEffect(() => {
    async function loadSizes() {
      try {
        await loadMasslamSizes();
        setMasslamSizesLoaded(true);
      } catch (err) {
        console.error('Error loading MASSLAM sizes:', err);
        setError('Failed to load MASSLAM sizes. Please try refreshing the page.');
      }
    }
    
    loadSizes();
  }, []);
  
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
            // Beams run perpendicular to joists
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
                costResult,
                buildingLength,
                buildingWidth
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
  
  // Calculate bay dimensions for visualization
  const calculateBayDimensions = () => {
    if (!results) return { lengthwiseBayWidths: [], widthwiseBayWidths: [] };
    
    // For uniform bay sizes
    const lengthwiseBayWidths = Array(results.lengthwiseBays).fill(results.buildingLength / results.lengthwiseBays);
    const widthwiseBayWidths = Array(results.widthwiseBays).fill(results.buildingWidth / results.widthwiseBays);
    
    return { lengthwiseBayWidths, widthwiseBayWidths };
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
            disabled={isCalculating || !masslamSizesLoaded}
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
        
        {!masslamSizesLoaded && !error && (
          <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded">
            Loading MASSLAM sizes from CSV...
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
              
              <div className="flex justify-center">
                <div className="relative w-full" style={{ 
                  maxWidth: '600px',
                  aspectRatio: `${results.buildingLength} / ${results.buildingWidth}`,
                  maxHeight: '400px'
                }}>
                  {/* Calculate bay dimensions */}
                  {(() => {
                    const { lengthwiseBayWidths, widthwiseBayWidths } = calculateBayDimensions();
                    
                    // Calculate grid template columns and rows
                    const gridTemplateColumns = lengthwiseBayWidths.map(width => 
                      `${(width / results.buildingLength) * 100}fr`
                    ).join(' ');
                    
                    const gridTemplateRows = widthwiseBayWidths.map(width => 
                      `${(width / results.buildingWidth) * 100}fr`
                    ).join(' ');
                    
                    // Generate column labels (A, B, C, ...)
                    const columnLabels = Array.from({ length: results.lengthwiseBays }, (_, i) => 
                      String.fromCharCode(65 + i)
                    );
                    
                    return (
                      <>
                        {/* Column labels (alphabetical) */}
                        <div className="absolute top-[-20px] left-0 right-0 flex justify-between px-2">
                          {columnLabels.map((label, index) => {
                            // Calculate position
                            const leftPosition = `${((index + 0.5) / results.lengthwiseBays) * 100}%`;
                            
                            return (
                              <div 
                                key={`col-${label}`} 
                                className="absolute text-xs font-semibold"
                                style={{ 
                                  left: leftPosition,
                                  transform: 'translateX(-50%)',
                                  color: 'var(--apple-text-secondary, #666)'
                                }}
                              >
                                {label}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Row labels (numerical) */}
                        <div className="absolute top-0 bottom-0 left-[-20px] flex flex-col justify-between py-2">
                          {Array.from({ length: results.widthwiseBays }).map((_, index) => {
                            // Calculate position
                            const topPosition = `${((index + 0.5) / results.widthwiseBays) * 100}%`;
                            
                            return (
                              <div 
                                key={`row-${index+1}`} 
                                className="absolute text-xs font-semibold"
                                style={{ 
                                  top: topPosition,
                                  transform: 'translateY(-50%)',
                                  color: 'var(--apple-text-secondary, #666)'
                                }}
                              >
                                {index + 1}
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="bay-grid absolute inset-0" style={{
                          display: 'grid',
                          gridTemplateColumns: gridTemplateColumns || `repeat(${results.lengthwiseBays}, 1fr)`,
                          gridTemplateRows: gridTemplateRows || `repeat(${results.widthwiseBays}, 1fr)`,
                          gap: '2px'
                        }}>
                          {Array.from({ length: results.lengthwiseBays * results.widthwiseBays }).map((_, index) => {
                            const row = Math.floor(index / results.lengthwiseBays);
                            const col = index % results.lengthwiseBays;
                            
                            // Get the dimensions for this specific bay
                            const bayWidth = lengthwiseBayWidths[col];
                            const bayHeight = widthwiseBayWidths[row];
                            
                            // Generate bay label (e.g., "A1", "B2", etc.)
                            const bayLabel = `${columnLabels[col]}${row + 1}`;
                            
                            return (
                              <div key={index} className="bay-cell relative" style={{
                                backgroundColor: '#e0e0e0',
                                border: '1px solid #999',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '0.8rem',
                                padding: '8px',
                                borderRadius: '0'
                              }}>
                                {/* Bay Label */}
                                <div className="absolute top-1 left-1 text-xs font-medium text-gray-600">
                                  {bayLabel}
                                </div>
                                
                                <div className="text-xs" style={{ 
                                  position: 'relative', 
                                  top: '-20px', 
                                  padding: '2px 4px',
                                  borderRadius: '2px'
                                }}>
                                  {bayWidth.toFixed(1)}m × {bayHeight.toFixed(1)}m
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Joist Direction Arrows */}
                        {Array.from({ length: results.lengthwiseBays * results.widthwiseBays }).map((_, index) => {
                          const row = Math.floor(index / results.lengthwiseBays);
                          const col = index % results.lengthwiseBays;
                          
                          // Get the dimensions for this specific bay
                          const bayWidth = lengthwiseBayWidths[col];
                          const bayHeight = widthwiseBayWidths[row];
                          
                          // Use global joist direction
                          const joistsSpanLengthwise = results.joistsRunLengthwise;
                          
                          // Calculate position based on cumulative widths
                          const leftPosition = lengthwiseBayWidths.slice(0, col).reduce((sum, w) => sum + w, 0) + bayWidth / 2;
                          const topPosition = widthwiseBayWidths.slice(0, row).reduce((sum, h) => sum + h, 0) + bayHeight / 2;
                          
                          // Calculate percentages
                          const leftPercent = (leftPosition / results.buildingLength) * 100;
                          const topPercent = (topPosition / results.buildingWidth) * 100;
                          
                          const arrowStyle = {
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#4B5563', // Dark gray color
                            fontWeight: 'bold',
                            fontSize: '1.2rem',
                            zIndex: 10
                          };
                          
                          if (joistsSpanLengthwise) {
                            // Horizontal arrows (joists span left to right)
                            return (
                              <div 
                                key={`arrow-${index}`}
                                style={{
                                  ...arrowStyle,
                                  top: `${topPercent}%`,
                                  left: `${leftPercent}%`,
                                  transform: 'translate(-50%, -50%)',
                                  width: `${(bayWidth / results.buildingLength) * 70}%`,
                                  height: '20%'
                                }}
                              >
                                <span>↔</span>
                              </div>
                            );
                          } else {
                            // Vertical arrows (joists span top to bottom)
                            return (
                              <div 
                                key={`arrow-${index}`}
                                style={{
                                  ...arrowStyle,
                                  left: `${leftPercent}%`,
                                  top: `${topPercent}%`,
                                  transform: 'translate(-50%, -50%)',
                                  height: `${(bayHeight / results.buildingWidth) * 70}%`,
                                  width: '20%',
                                  flexDirection: 'column'
                                }}
                              >
                                <span>↕</span>
                              </div>
                            );
                          }
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>
              
              <div className="text-center text-sm mt-4" style={{ color: 'var(--apple-text-secondary, #666)' }}>
                <div className="text-xs md:text-sm">Grid Cell Size: {(results.buildingLength / results.lengthwiseBays).toFixed(2)}m × {(results.buildingWidth / results.widthwiseBays).toFixed(2)}m</div>
                
                <div className="mt-2">
                  <span style={{ color: '#4B5563' }}>
                    {results.joistsRunLengthwise ? '↔ Horizontal Joists' : '↕ Vertical Joists'}
                  </span>
                  <span className="text-xs ml-2">(Beams run perpendicular to joists)</span>
                </div>
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