"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatCurrency } from '../../utils/costEstimator';
import { useBuildingData } from '@/contexts/BuildingDataContext';
import BayLayoutVisualizer from './BayLayoutVisualizer';

// Add a debugging component to show bay size calculations
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

/**
 * ResultsDisplay component for showing calculation results
 */
const ResultsDisplay = ({ 
  results, 
  onSaveClick,
  isMobile
}) => {
  // Add client-side state to avoid hydration mismatch
  const [isClient, setIsClient] = useState(false);
  // Create refs for backward compatibility
  const joistWidthRef = useRef(null);
  const joistDepthRef = useRef(null);
  const resultsRef = useRef(null);
  
  // Get building data from context
  const { buildingData, updateBuildingData } = useBuildingData();
  
  // Use a force update counter to ensure the component refreshes when results change
  const [updateCounter, setUpdateCounter] = useState(0);
  const [debugTimestamp, setDebugTimestamp] = useState(new Date().toISOString());
  
  // Set isClient to true once component mounts on client
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Force refresh when results change
  useEffect(() => {
    if (results?.joistSize) {
      console.log("JOIST DEBUG - Raw results received in ResultsDisplay:", JSON.stringify(results.joistSize, null, 2));
      console.log("JOIST DEBUG - Results updated:", {
        width: results.joistSize.width, 
        depth: results.joistSize.depth,
        span: results.joistSize.span,
        spacing: results.joistSize.spacing,
        load: results.joistSize.load,
        grade: results.joistSize.grade,
        fireRating: results.joistSize.fireRating,
        bendingDepth: results.joistSize.bendingDepth,
        deflectionDepth: results.joistSize.deflectionDepth,
        timestamp: new Date().toISOString()
      });
      
      // Force a refresh to ensure UI updates
      setUpdateCounter(prev => prev + 1);
      setDebugTimestamp(new Date().toISOString());
    }
  }, [results]);
  
  // If we have results, show them
  const hasResults = results && results.joistSize && results.beamSize;
  const hasBeamSize = results?.beamSize?.width && results?.beamSize?.depth;
  const hasEdgeBeamSize = results?.edgeBeamSize?.width && results?.edgeBeamSize?.depth;

  // Handler functions for BayLayoutVisualizer
  const handleToggleCustomBayDimensions = () => {
    updateBuildingData('useCustomBayDimensions', !buildingData.useCustomBayDimensions);
  };

  const handleJoistDirectionChange = (value) => {
    updateBuildingData('joistsRunLengthwise', value);
  };

  return (
    <div className="apple-results" key={`joists-${updateCounter}-beams-${results.interiorBeamSize?.width || 'NA'}-${results.interiorBeamSize?.depth || 'NA'}-joists-${results.joistSize?.width || 'NA'}-${results.joistSize?.depth || 'NA'}`} ref={resultsRef}>
      <div className="apple-card-header flex justify-between items-center">
        <h2 className="text-lg md:text-xl font-semibold m-0">Results</h2>
        
        {/* Action Buttons */}
        <div className="flex">
          <Link 
            href="/timber-calculator/debug" 
            className="apple-button apple-button-secondary mr-2"
          >
            Debug Info
          </Link>
          <Link 
            href="/3d-visualization" 
            className="apple-button apple-button-secondary mr-2"
          >
            View 3D Model
          </Link>
          <button 
            className="apple-button apple-button-primary"
            onClick={onSaveClick}
          >
            Save Project
          </button>
        </div>
      </div>
      
      <div className="apple-results-body">
        {/* Bay Layout Visualizer */}
        <div className="apple-card mb-8">
          <div className="apple-card-body">
            <BayLayoutVisualizer
              buildingData={buildingData}
              results={results}
              isMobile={isMobile}
              handleToggleCustomBayDimensions={handleToggleCustomBayDimensions}
              handleJoistDirectionChange={handleJoistDirectionChange}
            />
          </div>
        </div>
        
        {/* Member Sizes Section */}
        <div className="apple-card mb-8">
          <div className="apple-card-header">
            <h3 className="text-md font-semibold">Member Sizes</h3>
          </div>
          
          <div className="apple-card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Joists</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Width:</span> <span ref={joistWidthRef} data-joist-width>{results?.joistSize?.width || 'N/A'}mm</span></p>
                  <p><span className="text-gray-500">Depth:</span> <span ref={joistDepthRef} data-joist-depth>{results?.joistSize?.depth || 'N/A'}mm</span></p>
                  <p><span className="text-gray-500">Span:</span> {results?.joistSize?.span?.toFixed(2) || 'N/A'}m</p>
                  <p><span className="text-gray-500">Governing:</span> {results?.joistSize?.isDeflectionGoverning ? 'Deflection' : 'Bending'}</p>
                
                  {/* Add debug information dropdown */}
                  {results?.joistSize && (
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                      <details className="cursor-pointer group">
                        <summary className="font-medium text-blue-600 cursor-pointer hover:text-blue-700">
                          Calculation Details
                        </summary>
                        <div className="mt-1 p-2 bg-gray-50 rounded">
                          <p><span className="font-medium">Span:</span> {results.joistSize.span?.toFixed(2)}m</p>
                          <p><span className="font-medium">Spacing:</span> {(results.joistSize.spacing/1000).toFixed(1)}m</p>
                          <p><span className="font-medium">Load:</span> {results.joistSize.load}kPa</p>
                          <p><span className="font-medium">Safety Factor:</span> {results.joistSize.safetyFactor || 1.5}</p>
                          <p><span className="font-medium">Deflection Limit:</span> L/{results.joistSize.deflectionLimit || 300}</p>
                          <p><span className="font-medium">Governing:</span> {results.joistSize.isDeflectionGoverning ? 'Deflection' : 'Bending'}</p>
                          <p><span className="font-medium">Bending Depth Required:</span> {results.joistSize.bendingDepth}mm</p>
                          <p><span className="font-medium">Deflection Depth Required:</span> {results.joistSize.deflectionDepth}mm</p>
                          <p><span className="font-medium">Fire Adjusted Depth:</span> {results.joistSize.fireAdjustedDepth}mm</p>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Beams</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Interior Beams:</span> {hasBeamSize ? `${results.beamSize.width || 'N/A'}mm × ${results.beamSize.depth || 'N/A'}mm` : 'N/A'}</p>
                  <p><span className="text-gray-500">Edge Beams:</span> {hasEdgeBeamSize ? `${results.edgeBeamSize.width || 'N/A'}mm × ${results.edgeBeamSize.depth || 'N/A'}mm` : 'N/A'}</p>
                  <p><span className="text-gray-500">Span:</span> {hasBeamSize && results.beamSize.span ? `${results.beamSize.span.toFixed(2)}m` : 'N/A'}</p>
                  <p><span className="text-gray-500">Governing:</span> {hasBeamSize ? (results.beamSize.isDeflectionGoverning ? 'Deflection' : 'Bending') : 'N/A'}</p>
                  
                  {/* Add beam debug information dropdown */}
                  {(hasBeamSize || hasEdgeBeamSize) && (
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                      <details className="cursor-pointer">
                        <summary className="font-medium text-blue-600 cursor-pointer">Calculation Details</summary>
                        <div className="mt-1 p-2 bg-gray-50 rounded mb-2">
                          <p className="font-bold">Interior Beams</p>
                          <p><span className="font-medium">Span:</span> {hasBeamSize && results.beamSize.span ? results.beamSize.span.toFixed(2) : 'N/A'}m</p>
                          <p><span className="font-medium">Tributary Width:</span> {hasBeamSize && results.beamSize.tributaryWidth ? results.beamSize.tributaryWidth.toFixed(2) : 'N/A'}m</p>
                          <p><span className="font-medium">Load per Meter:</span> {hasBeamSize && results.beamSize.loadPerMeter ? results.beamSize.loadPerMeter.toFixed(2) : 'N/A'}kN/m</p>
                          <p><span className="font-medium">Governing:</span> {hasBeamSize ? (results.beamSize.isDeflectionGoverning ? 'Deflection' : 'Bending') : 'N/A'}</p>
                        </div>
                        <div className="mt-1 p-2 bg-gray-50 rounded">
                          <p className="font-bold">Edge Beams</p>
                          <p><span className="font-medium">Span:</span> {hasEdgeBeamSize && results.edgeBeamSize.span ? results.edgeBeamSize.span.toFixed(2) : 'N/A'}m</p>
                          <p><span className="font-medium">Tributary Width:</span> {hasEdgeBeamSize && results.edgeBeamSize.tributaryWidth ? results.edgeBeamSize.tributaryWidth.toFixed(2) : 'N/A'}m</p>
                          <p><span className="font-medium">Load per Meter:</span> {hasEdgeBeamSize && results.edgeBeamSize.loadPerMeter ? results.edgeBeamSize.loadPerMeter.toFixed(2) : 'N/A'}kN/m</p>
                          <p><span className="font-medium">Governing:</span> {hasEdgeBeamSize ? (results.edgeBeamSize.isDeflectionGoverning ? 'Deflection' : 'Bending') : 'N/A'}</p>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Columns</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Volume:</span> {
                    typeof results?.elementVolumes?.columns === 'number' 
                      ? `${results.elementVolumes.columns.toFixed(2)} m³` 
                      : buildingData?.floorHeight && results?.columnSize && buildingData?.numFloors
                        ? `${((results.columnSize.width * results.columnSize.depth * 0.000001 * buildingData.floorHeight * buildingData.numFloors) || 0).toFixed(2)} m³` 
                        : 'N/A'
                  }</p>
                  <p><span className="text-gray-500">Quantity:</span> {
                    typeof results?.elementCounts?.columns === 'number' 
                      ? `${results.elementCounts.columns} pieces` 
                      : buildingData?.lengthwiseBays != null && buildingData?.widthwiseBays != null && buildingData?.numFloors != null
                        ? `${((buildingData.lengthwiseBays + 1) * (buildingData.widthwiseBays + 1) * buildingData.numFloors)} pieces` 
                        : 'N/A'
                  }</p>
                  <p><span className="text-gray-500">Size:</span> {
                    results?.columnSize?.width && results?.columnSize?.depth
                      ? `${results.columnSize.width}×${results.columnSize.depth}mm` 
                      : 'N/A'
                  }</p>
                  <p><span className="text-gray-500">Height:</span> {
                    buildingData?.floorHeight
                      ? `${buildingData.floorHeight.toFixed(2)}m` 
                      : 'N/A'
                  }</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Cost Summary Section */}
        <div className="apple-card mb-8">
          <div className="apple-card-header">
            <h3 className="text-md font-semibold">Cost Summary</h3>
          </div>
          <div className="apple-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Materials</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Beams:</span> {results.costs?.elements?.beams?.cost ? formatCurrency(results.costs.elements.beams.cost) : 'N/A'}</p>
                  <p><span className="text-gray-500">Columns:</span> {results.costs?.elements?.columns?.cost ? formatCurrency(results.costs.elements.columns.cost) : 'N/A'}</p>
                  <p><span className="text-gray-500">Joists:</span> {results.costs?.elements?.joists?.cost ? formatCurrency(results.costs.elements.joists.cost) : 'N/A'}</p>
                  {results.costs?.elements?.joists?.sizeUsed && (
                    <div className="text-xs mt-1 text-gray-500">
                      <p>Using joist size: {results.costs.elements.joists.sizeUsed.replace('x', '×')}mm</p>
                      <p>Rate: {formatCurrency(results.costs.elements.joists.rate)}/m²</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Total</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Materials:</span> {results.costs?.total ? formatCurrency(results.costs.total) : 'N/A'}</p>
                  <p><span className="text-gray-500">Carbon Saved:</span> {typeof results.carbonSavings === 'number' ? `${results.carbonSavings.toFixed(2)} tonnes CO₂e` : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Material Summary Section */}
        <div className="apple-card">
          <div className="apple-card-header">
            <h3 className="text-md font-semibold">Material Summary</h3>
          </div>
          <div className="apple-card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Joists</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Volume:</span> {
                    typeof results.elementVolumes?.joists === 'number' 
                      ? `${results.elementVolumes.joists.toFixed(2)} m³` 
                      : results.joistSize 
                        ? `${((results.joistSize.width * results.joistSize.depth * 0.000001 * results.joistSize.span) || 0).toFixed(2)} m³` 
                        : 'N/A'
                  }</p>
                  <p><span className="text-gray-500">Area:</span> {
                    typeof results.elementVolumes?.joistArea === 'number'
                      ? `${results.elementVolumes.joistArea.toFixed(2)} m²`
                      : buildingData
                        ? `${(buildingData.buildingLength * buildingData.buildingWidth * buildingData.numFloors).toFixed(2)} m²`
                        : 'N/A'
                  }</p>
                  <p><span className="text-gray-500">Quantity:</span> {
                    typeof results.elementCounts?.joists === 'number' 
                      ? `${results.elementCounts.joists} pieces` 
                      : buildingData && results.joistSize
                        ? `${Math.ceil(buildingData.buildingLength / buildingData.joistSpacing) || 0} pieces` 
                        : 'N/A'
                  }</p>
                  <p><span className="text-gray-500">Size:</span> {results.joistSize ? `${results.joistSize.width}×${results.joistSize.depth}mm` : 'N/A'}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Beams</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Volume:</span> {
                    typeof results.elementVolumes?.beams === 'number' 
                      ? `${results.elementVolumes.beams.toFixed(2)} m³` 
                      : results.beamSize 
                        ? `${((results.beamSize.width * results.beamSize.depth * 0.000001 * results.beamSize.span) || 0).toFixed(2)} m³` 
                        : 'N/A'
                  }</p>
                  <p><span className="text-gray-500">Quantity:</span> {
                    typeof results.elementCounts?.beams === 'number' 
                      ? `${results.elementCounts.beams} pieces` 
                      : buildingData
                        ? `${((buildingData.lengthwiseBays + 1) * (buildingData.widthwiseBays) || 0)} pieces` 
                        : 'N/A'
                  }</p>
                  <p><span className="text-gray-500">Interior:</span> {hasBeamSize ? `${results.beamSize.width}×${results.beamSize.depth}mm` : 'N/A'}</p>
                  <p><span className="text-gray-500">Edge:</span> {hasEdgeBeamSize ? `${results.edgeBeamSize.width}×${results.edgeBeamSize.depth}mm` : 'N/A'}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Columns</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Volume:</span> {
                    typeof results?.elementVolumes?.columns === 'number' 
                      ? `${results.elementVolumes.columns.toFixed(2)} m³` 
                      : buildingData?.floorHeight && results?.columnSize && buildingData?.numFloors
                        ? `${((results.columnSize.width * results.columnSize.depth * 0.000001 * buildingData.floorHeight * buildingData.numFloors) || 0).toFixed(2)} m³` 
                        : 'N/A'
                  }</p>
                  <p><span className="text-gray-500">Quantity:</span> {
                    typeof results?.elementCounts?.columns === 'number' 
                      ? `${results.elementCounts.columns} pieces` 
                      : buildingData?.lengthwiseBays != null && buildingData?.widthwiseBays != null && buildingData?.numFloors != null
                        ? `${((buildingData.lengthwiseBays + 1) * (buildingData.widthwiseBays + 1) * buildingData.numFloors)} pieces` 
                        : 'N/A'
                  }</p>
                  <p><span className="text-gray-500">Size:</span> {
                    results?.columnSize?.width && results?.columnSize?.depth
                      ? `${results.columnSize.width}×${results.columnSize.depth}mm` 
                      : 'N/A'
                  }</p>
                  <p><span className="text-gray-500">Height:</span> {
                    buildingData?.floorHeight
                      ? `${buildingData.floorHeight.toFixed(2)}m` 
                      : 'N/A'
                  }</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm font-medium">
                <p><span className="text-gray-700">Total Timber Volume:</span> {typeof results.timberVolume === 'number' ? `${results.timberVolume.toFixed(2)} m³` : 'N/A'}</p>
                <p><span className="text-gray-700">Total Mass:</span> {typeof results.timberWeight === 'number' ? `${(results.timberWeight / 1000).toFixed(2)} tonnes` : 'N/A'}</p>
                <p><span className="text-gray-700">Total Joist Area:</span> {typeof results.elementVolumes?.joistArea === 'number' ? `${results.elementVolumes.joistArea.toFixed(2)} m²` : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Add Bay Debugger at the bottom */}
        <div className="mt-8">
          <BayDebugger />
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay; 