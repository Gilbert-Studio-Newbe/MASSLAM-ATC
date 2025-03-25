"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatCurrency } from '../../utils/costEstimator';
import { useBuildingData } from '@/contexts/BuildingDataContext';
import BayLayoutVisualizer from './BayLayoutVisualizer';

/**
 * ResultsDisplay component for showing calculation results
 */
const ResultsDisplay = ({ 
  results, 
  onSaveClick,
  isMobile
}) => {
  const [isClient, setIsClient] = useState(false);
  const { buildingData } = useBuildingData();
  
  // Set isClient to true once component mounts on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // If we have results, show them
  const hasResults = results && results.joistSize && results.beamSize;
  const hasBeamSize = results?.beamSize?.width && results?.beamSize?.depth;
  const hasEdgeBeamSize = results?.edgeBeamSize?.width && results?.edgeBeamSize?.depth;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold m-0">Results</h2>
        
        {/* Action Buttons */}
        <div className="flex">
          <Link 
            href="/timber-calculator/debug" 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 mr-2"
          >
            Debug Info
          </Link>
          <Link 
            href="/3d-visualization" 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 mr-2"
          >
            View 3D Model
          </Link>
          <button 
            className="px-4 py-2 bg-masslam text-white rounded-md hover:bg-masslam/90"
            onClick={onSaveClick}
          >
            Save Project
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-8">
        {/* Bay Layout Visualizer */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4">
            <BayLayoutVisualizer
              buildingData={buildingData}
              results={results}
              isMobile={isMobile}
              useCustomBayDimensions={buildingData.useCustomBayDimensions}
              customLengthwiseBayWidths={buildingData.customLengthwiseBayWidths}
              customWidthwiseBayWidths={buildingData.customWidthwiseBayWidths}
            />
          </div>
        </div>
        
        {/* Cost Summary Section */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b p-4">
            <h3 className="text-lg font-semibold">Total Cost Estimate</h3>
          </div>
          <div className="p-4">
            {/* Primary Total Display */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-baseline">
                <div>
                  <div className="text-4xl font-bold text-masslam mb-2">
                    {formatCurrency((results?.costs?.total) || 0)}
                  </div>
                  <div className="text-sm text-gray-500">Excluding GST and installation</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-medium text-green-600 mb-1">
                    Carbon Saving vs Steel/Concrete:
                  </div>
                  <div className="text-2xl font-semibold text-green-700">
                    {(results?.carbonSavings || 0).toFixed(2)} tonnes CO₂e
                  </div>
                  <div className="text-sm text-gray-500">
                    Equivalent to {Math.round((results?.carbonSavings || 0) * 4.3)} trees planted
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold mb-3">Joists</h4>
                <div className="text-3xl font-bold mb-4">{formatCurrency((results?.costs?.elements?.joists?.cost) || 0)}</div>
                <div className="space-y-2 text-gray-600">
                  <p>{(results?.elementCounts?.joists) || 0} pieces</p>
                  <p>{(results?.floorArea || 0).toFixed(1)} m²</p>
                  <p>Rate: {formatCurrency((results?.costs?.elements?.joists?.rate) || 0)}/m²</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold mb-3">Beams</h4>
                <div className="text-3xl font-bold mb-4">{formatCurrency((results?.costs?.elements?.beams?.cost) || 0)}</div>
                <div className="space-y-2 text-gray-600">
                  <p>{(results?.elementCounts?.beams) || 0} pieces</p>
                  <p>{(results?.elementVolumes?.beams || 0).toFixed(1)} m³</p>
                  <p>Rate: {formatCurrency(3200)}/m³</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold mb-3">Columns</h4>
                <div className="text-3xl font-bold mb-4">{formatCurrency((results?.costs?.elements?.columns?.cost) || 0)}</div>
                <div className="space-y-2 text-gray-600">
                  <p>{(results?.elementCounts?.columns) || 0} pieces</p>
                  <p>{(results?.elementVolumes?.columns || 0).toFixed(1)} m³</p>
                  <p>Rate: {formatCurrency(3200)}/m³</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Member Sizes Section */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b p-4">
            <h3 className="text-lg font-semibold">Member Sizes</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-base font-medium mb-3">Joists</h4>
                <div className="space-y-2 text-gray-600">
                  <p><span className="text-gray-500">Width:</span> {results?.joistSize?.width || 'N/A'}mm</p>
                  <p><span className="text-gray-500">Depth:</span> {results?.joistSize?.depth || 'N/A'}mm</p>
                  <p><span className="text-gray-500">Span:</span> {results?.joistSize?.span?.toFixed(2) || 'N/A'}m</p>
                  <p><span className="text-gray-500">Governing:</span> {results?.joistSize?.isDeflectionGoverning ? 'Deflection' : 'Bending'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-base font-medium mb-3">Beams</h4>
                <div className="space-y-2 text-gray-600">
                  <p><span className="text-gray-500">Interior Beams:</span> {hasBeamSize ? `${results.beamSize.width || 'N/A'}mm × ${results.beamSize.depth || 'N/A'}mm` : 'N/A'}</p>
                  <p><span className="text-gray-500">Edge Beams:</span> {hasEdgeBeamSize ? `${results.edgeBeamSize.width || 'N/A'}mm × ${results.edgeBeamSize.depth || 'N/A'}mm` : 'N/A'}</p>
                  <p><span className="text-gray-500">Span:</span> {hasBeamSize && results.beamSize.span ? `${results.beamSize.span.toFixed(2)}m` : 'N/A'}</p>
                  <p><span className="text-gray-500">Governing:</span> {hasBeamSize ? (results.beamSize.isDeflectionGoverning ? 'Deflection' : 'Bending') : 'N/A'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-base font-medium mb-3">Columns</h4>
                <div className="space-y-2 text-gray-600">
                  <p><span className="text-gray-500">Size:</span> {results?.columnSize?.width && results?.columnSize?.depth ? `${results.columnSize.width}×${results.columnSize.depth}mm` : 'N/A'}</p>
                  <p><span className="text-gray-500">Height:</span> {buildingData?.floorHeight ? `${buildingData.floorHeight.toFixed(2)}m` : 'N/A'}</p>
                  <p><span className="text-gray-500">Volume:</span> {typeof results?.elementVolumes?.columns === 'number' ? `${results.elementVolumes.columns.toFixed(2)} m³` : 'N/A'}</p>
                  <p><span className="text-gray-500">Quantity:</span> {typeof results?.elementCounts?.columns === 'number' ? `${results.elementCounts.columns} pieces` : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay; 