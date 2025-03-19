"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatCurrency } from '../../utils/costEstimator';

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
  // Track results changes with local state
  const [localJoistSize, setLocalJoistSize] = useState(null);
  // Create refs to directly update DOM elements
  const joistWidthRef = useRef(null);
  const joistDepthRef = useRef(null);
  const resultsRef = useRef(null);
  
  // Use a force update counter
  const [updateCounter, setUpdateCounter] = useState(0);
  
  // Set isClient to true once component mounts on client
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Direct DOM update for joist sizes to bypass hydration issues
  useEffect(() => {
    if (isClient && results?.joistSize && joistWidthRef.current && joistDepthRef.current) {
      console.log("JOIST DEBUG - Directly updating DOM with joist sizes:", {
        width: results.joistSize.width, 
        depth: results.joistSize.depth
      });
      
      // Update DOM directly
      joistWidthRef.current.textContent = `${results.joistSize.width}mm`;
      joistDepthRef.current.textContent = `${results.joistSize.depth}mm`;
      
      // Force a re-render after a short delay
      setTimeout(() => {
        setUpdateCounter(prev => prev + 1);
      }, 50);
    }
  }, [isClient, results, updateCounter]);
  
  // During server-side rendering or before client hydration
  if (!isClient) {
    return (
      <div className="apple-card p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Results</h2>
        <p style={{ color: 'var(--apple-text-secondary)' }}>Loading calculation results...</p>
      </div>
    );
  }
  
  // If no results are available
  if (!results) {
    return (
      <div className="apple-card p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Results</h2>
        <p style={{ color: 'var(--apple-text-secondary)' }}>Configure your timber structure parameters to see calculation results.</p>
      </div>
    );
  }
  
  // Add console log to debug results structure (client-side only)
  console.log("ResultsDisplay - results object:", results, "Update counter:", updateCounter);
  
  // Generate a key for the component to force re-render when values change
  const resultsKey = `joists-${updateCounter}-beams-${results.interiorBeamSize?.width || 'NA'}-${results.interiorBeamSize?.depth || 'NA'}`;
  
  return (
    <div className="apple-results" key={resultsKey} ref={resultsRef}>
      <div className="apple-card-header flex justify-between items-center">
        <h2 className="text-lg md:text-xl font-semibold m-0">Results</h2>
        
        {/* Action Buttons */}
        <div className="flex">
          <Link 
            href="/3d-visualization" 
            className="apple-button apple-button-secondary mr-4"
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
                  <p><span className="text-gray-500">Width:</span> <span ref={joistWidthRef} data-joist-width>{results.joistSize?.width || 'N/A'}mm</span></p>
                  <p><span className="text-gray-500">Depth:</span> <span ref={joistDepthRef} data-joist-depth>{results.joistSize?.depth || 'N/A'}mm</span></p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Beams</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Interior Beams:</span> {results.interiorBeamSize?.width || 'N/A'}mm × {results.interiorBeamSize?.depth || 'N/A'}mm</p>
                  <p><span className="text-gray-500">Edge Beams:</span> {results.edgeBeamSize?.width || 'N/A'}mm × {results.edgeBeamSize?.depth || 'N/A'}mm</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Columns</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Size:</span> {results.columnSize?.width || 'N/A'}mm × {results.columnSize?.depth || 'N/A'}mm</p>
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
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Total</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Materials:</span> {results.costs?.total ? formatCurrency(results.costs.total) : 'N/A'}</p>
                  <p><span className="text-gray-500">Carbon Saved:</span> {results.carbonSavings ? `${results.carbonSavings.toFixed(2)} kg CO₂` : 'N/A'}</p>
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
                  <p><span className="text-gray-500">Volume:</span> {results.elementVolumes?.joists ? `${results.elementVolumes.joists.toFixed(2)} m³` : 'N/A'}</p>
                  <p><span className="text-gray-500">Quantity:</span> {results.elementCounts?.joists ? `${results.elementCounts.joists} pieces` : 'N/A'}</p>
                  <p><span className="text-gray-500">Size:</span> {results.joistSize ? `${results.joistSize.width}×${results.joistSize.depth}mm` : 'N/A'}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Beams</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Volume:</span> {results.elementVolumes?.beams ? `${results.elementVolumes.beams.toFixed(2)} m³` : 'N/A'}</p>
                  <p><span className="text-gray-500">Quantity:</span> {results.elementCounts?.beams ? `${results.elementCounts.beams} pieces` : 'N/A'}</p>
                  <p><span className="text-gray-500">Interior:</span> {results.interiorBeamSize ? `${results.interiorBeamSize.width}×${results.interiorBeamSize.depth}mm` : 'N/A'}</p>
                  <p><span className="text-gray-500">Edge:</span> {results.edgeBeamSize ? `${results.edgeBeamSize.width}×${results.edgeBeamSize.depth}mm` : 'N/A'}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Columns</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Volume:</span> {results.elementVolumes?.columns ? `${results.elementVolumes.columns.toFixed(2)} m³` : 'N/A'}</p>
                  <p><span className="text-gray-500">Quantity:</span> {results.elementCounts?.columns ? `${results.elementCounts.columns} pieces` : 'N/A'}</p>
                  <p><span className="text-gray-500">Size:</span> {results.columnSize ? `${results.columnSize.width}×${results.columnSize.depth}mm` : 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm font-medium">
                <p><span className="text-gray-700">Total Timber Volume:</span> {results.timberVolume ? `${results.timberVolume.toFixed(2)} m³` : 'N/A'}</p>
                <p><span className="text-gray-700">Total Mass:</span> {results.timberWeight ? `${(results.timberWeight / 1000).toFixed(2)} tonnes` : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay; 