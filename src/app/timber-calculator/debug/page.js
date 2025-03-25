"use client";

import React, { useState, useEffect } from 'react';
import { useBuildingData } from '@/contexts/BuildingDataContext';
import Link from 'next/link';

// Bay Dimensions Debugger component (copied from ResultsDisplay.js)
const BayDebugger = () => {
  const { buildingData } = useBuildingData();
  
  // Calculate the bay dimensions directly (mirroring the logic in timber-calculator.js)
  const calculateBayDimensions = () => {
    const {
      buildingLength,
      buildingWidth,
      lengthwiseBays: numLengthwiseBays = 1,
      widthwiseBays: numWidthwiseBays = 1,
      useCustomBayDimensions,
      customLengthwiseBayWidths,
      customWidthwiseBayWidths,
      joistsRunLengthwise
    } = buildingData;
    
    // Calculate bay dimensions
    const lengthwiseBaysArray = customLengthwiseBayWidths || [];
    const widthwiseBaysArray = customWidthwiseBayWidths || [];
    
    // Calculate average bay dimensions
    let avgBayWidth, avgBayLength;
    
    if (useCustomBayDimensions && lengthwiseBaysArray.length > 0 && widthwiseBaysArray.length > 0) {
      avgBayWidth = widthwiseBaysArray.reduce((sum, width) => sum + width, 0) / widthwiseBaysArray.length;
      avgBayLength = lengthwiseBaysArray.reduce((sum, width) => sum + width, 0) / lengthwiseBaysArray.length;
    } else {
      avgBayWidth = buildingWidth / numWidthwiseBays;
      avgBayLength = buildingLength / numLengthwiseBays;
    }
    
    // Calculate max bay spans
    const maxLengthwiseBayWidth = lengthwiseBaysArray.length > 0 
      ? Math.max(...lengthwiseBaysArray) 
      : avgBayLength;
      
    const maxWidthwiseBayWidth = widthwiseBaysArray.length > 0 
      ? Math.max(...widthwiseBaysArray) 
      : avgBayWidth;
    
    // Calculate joist spans based on joist direction
    // When joists run lengthwise, they span across the width of the building
    // When joists run widthwise, they span across the length of the building
    const joistSpan = joistsRunLengthwise ? maxWidthwiseBayWidth : maxLengthwiseBayWidth;
    
    return {
      avgBayWidth,
      avgBayLength,
      maxLengthwiseBayWidth,
      maxWidthwiseBayWidth,
      joistSpan,
      // Include raw inputs for debugging
      inputs: {
        length: buildingLength,
        width: buildingWidth,
        lengthwiseBays: numLengthwiseBays,
        widthwiseBays: numWidthwiseBays,
        joistsRunLengthwise
      }
    };
  };
  
  const bayDimensions = calculateBayDimensions();
  
  return (
    <div className="my-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
      <h4 className="font-bold mb-1">Bay Dimensions Debugger</h4>
      <p><span className="font-semibold">Building:</span> {buildingData.buildingLength}m × {buildingData.buildingWidth}m</p>
      <p><span className="font-semibold">Bays:</span> {buildingData.lengthwiseBays} lengthwise × {buildingData.widthwiseBays} widthwise</p>
      <p><span className="font-semibold">Joist Direction:</span> {buildingData.joistsRunLengthwise ? 'Lengthwise' : 'Widthwise'}</p>
      <p><span className="font-semibold">Load:</span> {buildingData.load}kPa</p>
      <p><span className="font-semibold">Custom Bay Dimensions:</span> {buildingData.useCustomBayDimensions ? 'Yes' : 'No'}</p>
      <p className="text-sm font-semibold mt-2">Calculated Values:</p>
      <p><span className="font-semibold">Avg Bay Size:</span> {bayDimensions.avgBayLength.toFixed(2)}m × {bayDimensions.avgBayWidth.toFixed(2)}m</p>
      <p><span className="font-semibold">Max Lengthwise Bay:</span> {bayDimensions.maxLengthwiseBayWidth.toFixed(2)}m</p>
      <p><span className="font-semibold">Max Widthwise Bay:</span> {bayDimensions.maxWidthwiseBayWidth.toFixed(2)}m</p>
      <p className="text-red-600 font-bold">Calculated Joist Span: {bayDimensions.joistSpan.toFixed(2)}m</p>
    </div>
  );
};

// Joist Debug component
const JoistDebugger = ({ results }) => {
  if (!results?.joistSize) return <div className="my-4 p-3 bg-gray-100 rounded">No joist calculation data available</div>;
  
  return (
    <div className="my-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
      <h4 className="font-bold mb-2 text-yellow-800">Joist Calculation Debug</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h5 className="font-semibold mb-1">Input Parameters</h5>
          <div className="text-xs space-y-1 bg-white p-2 rounded">
            <p><span className="font-semibold">Span:</span> {results.joistSize.span?.toFixed(2)}m</p>
            <p><span className="font-semibold">Spacing:</span> {results.joistSize.spacing}m</p>
            <p><span className="font-semibold">Load:</span> {results.joistSize.load}kPa</p>
            <p><span className="font-semibold">Grade:</span> {results.joistSize.grade}</p>
            <p><span className="font-semibold">Fire Rating:</span> {results.joistSize.fireRating}</p>
            <p><span className="font-semibold">Deflection Limit:</span> L/{results.joistSize.deflectionLimit}</p>
            <p><span className="font-semibold">Safety Factor:</span> {results.joistSize.safetyFactor}</p>
          </div>
        </div>
        <div>
          <h5 className="font-semibold mb-1">Calculation Results</h5>
          <div className="text-xs space-y-1 bg-white p-2 rounded">
            <p className="font-bold text-green-700">Selected Section: {results.joistSize.width}mm × {results.joistSize.depth}mm</p>
            <p><span className="font-semibold">Governing:</span> {results.joistSize.isDeflectionGoverning ? 'Deflection' : 'Bending'}</p>
            <p><span className="font-semibold">Bending Depth Required:</span> {results.joistSize.bendingDepth}mm</p>
            <p><span className="font-semibold">Deflection Depth Required:</span> {results.joistSize.deflectionDepth}mm</p>
            <p><span className="font-semibold">Fire Adjusted Depth:</span> {results.joistSize.fireAdjustedDepth}mm</p>
            <p><span className="font-semibold">Calculated Deflection:</span> {results.joistSize.deflection?.toFixed(2)}mm</p>
            <p><span className="font-semibold">Allowable Deflection:</span> {results.joistSize.allowableDeflection?.toFixed(2)}mm</p>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <h5 className="font-semibold mb-1">Raw JSON Data</h5>
        <pre className="text-xs bg-gray-800 text-white p-2 rounded overflow-auto max-h-80">
          {JSON.stringify(results.joistSize, null, 2)}
        </pre>
      </div>
    </div>
  );
};

// Beam Debug component
const BeamDebugger = ({ results }) => {
  if (!results?.interiorBeamSize && !results?.edgeBeamSize) return <div className="my-4 p-3 bg-gray-100 rounded">No beam calculation data available</div>;
  
  return (
    <div className="my-4 p-3 bg-blue-50 border border-blue-200 rounded">
      <h4 className="font-bold mb-2 text-blue-800">Beam Calculation Debug</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h5 className="font-semibold mb-1">Interior Beams</h5>
          <div className="text-xs space-y-1 bg-white p-2 rounded">
            <p className="font-bold text-green-700">Selected Section: {results.interiorBeamSize?.width || 'N/A'}mm × {results.interiorBeamSize?.depth || 'N/A'}mm</p>
            <p><span className="font-semibold">Span:</span> {results.interiorBeamSize?.span?.toFixed(2) || 'N/A'}m</p>
            <p><span className="font-semibold">Load:</span> {results.interiorBeamSize?.load || 'N/A'}kPa</p>
            <p><span className="font-semibold">Governing:</span> {results.interiorBeamSize?.isDeflectionGoverning ? 'Deflection' : 'Bending'}</p>
            <p><span className="font-semibold">Bending Depth Required:</span> {results.interiorBeamSize?.bendingDepth || 'N/A'}mm</p>
            <p><span className="font-semibold">Deflection Depth Required:</span> {results.interiorBeamSize?.deflectionDepth || 'N/A'}mm</p>
          </div>
        </div>
        <div>
          <h5 className="font-semibold mb-1">Edge Beams</h5>
          <div className="text-xs space-y-1 bg-white p-2 rounded">
            <p className="font-bold text-green-700">Selected Section: {results.edgeBeamSize?.width || 'N/A'}mm × {results.edgeBeamSize?.depth || 'N/A'}mm</p>
            <p><span className="font-semibold">Span:</span> {results.edgeBeamSize?.span?.toFixed(2) || 'N/A'}m</p>
            <p><span className="font-semibold">Load:</span> {results.edgeBeamSize?.load || 'N/A'}kPa</p>
            <p><span className="font-semibold">Governing:</span> {results.edgeBeamSize?.isDeflectionGoverning ? 'Deflection' : 'Bending'}</p>
            <p><span className="font-semibold">Bending Depth Required:</span> {results.edgeBeamSize?.bendingDepth || 'N/A'}mm</p>
            <p><span className="font-semibold">Deflection Depth Required:</span> {results.edgeBeamSize?.deflectionDepth || 'N/A'}mm</p>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <h5 className="font-semibold mb-1">Raw JSON Data</h5>
        <pre className="text-xs bg-gray-800 text-white p-2 rounded overflow-auto max-h-80">
          {JSON.stringify({
            interiorBeam: results.interiorBeamSize,
            edgeBeam: results.edgeBeamSize
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

// Column Debug component
const ColumnDebugger = ({ results }) => {
  if (!results?.columnSize) return <div className="my-4 p-3 bg-gray-100 rounded">No column calculation data available</div>;
  
  return (
    <div className="my-4 p-3 bg-green-50 border border-green-200 rounded">
      <h4 className="font-bold mb-2 text-green-800">Column Calculation Debug</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h5 className="font-semibold mb-1">Input Parameters</h5>
          <div className="text-xs space-y-1 bg-white p-2 rounded">
            <p><span className="font-semibold">Load:</span> {results.columnSize?.load || 'N/A'}kPa</p>
            <p><span className="font-semibold">Floors:</span> {results.columnSize?.numFloors || 'N/A'}</p>
            <p><span className="font-semibold">Floor Height:</span> {results.columnSize?.floorHeight || 'N/A'}m</p>
            <p><span className="font-semibold">Grade:</span> {results.columnSize?.grade || 'N/A'}</p>
          </div>
        </div>
        <div>
          <h5 className="font-semibold mb-1">Calculation Results</h5>
          <div className="text-xs space-y-1 bg-white p-2 rounded">
            <p className="font-bold text-green-700">Selected Section: {results.columnSize?.width || 'N/A'}mm × {results.columnSize?.depth || 'N/A'}mm</p>
            <p><span className="font-semibold">Total Height:</span> {(results.columnSize?.numFloors * results.columnSize?.floorHeight)?.toFixed(2) || 'N/A'}m</p>
            <p><span className="font-semibold">Axial Load:</span> {results.columnSize?.axialLoad?.toFixed(2) || 'N/A'}kN</p>
            <p><span className="font-semibold">Compressive Capacity:</span> {results.columnSize?.compressiveCapacity?.toFixed(2) || 'N/A'}kN</p>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <h5 className="font-semibold mb-1">Raw JSON Data</h5>
        <pre className="text-xs bg-gray-800 text-white p-2 rounded overflow-auto max-h-80">
          {JSON.stringify(results.columnSize, null, 2)}
        </pre>
      </div>
    </div>
  );
};

// The main debug page component
export default function DebugPage() {
  const { buildingData } = useBuildingData();
  const [isClient, setIsClient] = useState(false);
  const results = buildingData.results;
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="container mx-auto p-6">Loading debug information...</div>;
  }
  
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Timber Calculator Debug Page</h1>
        <Link href="/timber-calculator" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          Back to Calculator
        </Link>
      </div>
      
      <p className="mb-4 text-gray-600">
        This page displays detailed debug information for timber structure calculations.
      </p>
      
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Building Configuration</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Dimensions</h3>
              <div className="text-sm space-y-1">
                <p><span className="font-semibold">Building Length:</span> {buildingData.buildingLength}m</p>
                <p><span className="font-semibold">Building Width:</span> {buildingData.buildingWidth}m</p>
                <p><span className="font-semibold">Number of Floors:</span> {buildingData.numFloors}</p>
                <p><span className="font-semibold">Floor Height:</span> {buildingData.floorHeight}m</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Parameters</h3>
              <div className="text-sm space-y-1">
                <p><span className="font-semibold">Load:</span> {buildingData.load}kPa ({buildingData.loadType})</p>
                <p><span className="font-semibold">Timber Grade:</span> {buildingData.timberGrade}</p>
                <p><span className="font-semibold">Fire Rating:</span> {buildingData.fireRating}</p>
                <p><span className="font-semibold">Joist Spacing:</span> {buildingData.joistSpacing}m</p>
                <p><span className="font-semibold">Joist Direction:</span> {buildingData.joistsRunLengthwise ? 'Lengthwise' : 'Widthwise'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Bay Dimensions</h2>
        </div>
        <div className="p-4">
          <BayDebugger />
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Joist Calculations</h2>
        </div>
        <div className="p-4">
          <JoistDebugger results={results} />
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Beam Calculations</h2>
        </div>
        <div className="p-4">
          <BeamDebugger results={results} />
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Column Calculations</h2>
        </div>
        <div className="p-4">
          <ColumnDebugger results={results} />
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Complete Results Object</h2>
        </div>
        <div className="p-4">
          <div className="overflow-auto">
            <pre className="text-xs bg-gray-800 text-white p-4 rounded max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
} 