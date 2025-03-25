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
  
  if (!hasResults) {
    return (
      <div className="bg-white rounded-[4px] p-6 text-center">
        <p className="text-[14px] text-[#666666]">Enter building parameters and click Calculate to see results</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Bay Layout Visualization */}
      <div className="bg-white rounded-[4px] border border-[#EEEEEE]">
        <div className="border-b border-[#EEEEEE] p-4">
          <h3 className="text-[18px] font-semibold text-[#000000]">Bay Layout Visualization</h3>
        </div>
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

      {/* Total Cost Summary */}
      <div className="cost-estimate-card">
        <div className="cost-estimate-header">
          Total Cost Estimate
        </div>
        {/* Primary Total Display */}
        <div className="cost-estimate-main">
          <div>
            <div className="total-cost-amount">
              {formatCurrency((results?.costs?.total) || 0)}
            </div>
            <div className="total-cost-note">
              Excluding GST and installation
            </div>
          </div>
          <div className="carbon-savings">
            <div className="text-[14px] font-medium text-text-secondary mb-1">
              Carbon Saving vs Steel/Concrete:
            </div>
            <div className="carbon-amount">
              {(results?.carbonSavings || 0).toFixed(2)} tonnes CO<span className="sub">2</span>e
            </div>
            <div className="carbon-note">
              Equivalent to {Math.round((results?.carbonSavings || 0) * 4.3)} trees planted
            </div>
          </div>
        </div>

        {/* Detailed Cost Breakdown */}
        <div className="component-breakdown">
          <div className="component-section">
            <h4 className="component-header">Joists</h4>
            <div className="component-cost">{formatCurrency((results?.costs?.elements?.joists?.cost) || 0)}</div>
            <p className="component-metric">{(results?.elementCounts?.joists) || 0} pieces</p>
            <p className="component-metric">{(results?.floorArea || 0).toFixed(1)} m<span className="sup">2</span></p>
            <p className="component-metric">Rate: {formatCurrency((results?.costs?.elements?.joists?.rate) || 0)}/m<span className="sup">2</span></p>
            <a href="#" className="verify-link">Verify calculation</a>
          </div>

          <div className="component-section">
            <h4 className="component-header">Beams</h4>
            <div className="component-cost">{formatCurrency((results?.costs?.elements?.beams?.cost) || 0)}</div>
            <p className="component-metric">{(results?.elementCounts?.beams) || 0} pieces</p>
            <p className="component-metric">{(results?.elementVolumes?.beams || 0).toFixed(1)} m<span className="sup">3</span></p>
            <p className="component-metric">Rate: {formatCurrency(3200)}/m<span className="sup">3</span></p>
            <a href="#" className="verify-link">Verify calculation</a>
          </div>

          <div className="component-section">
            <h4 className="component-header">Columns</h4>
            <div className="component-cost">{formatCurrency((results?.costs?.elements?.columns?.cost) || 0)}</div>
            <p className="component-metric">{(results?.elementCounts?.columns) || 0} pieces</p>
            <p className="component-metric">{(results?.elementVolumes?.columns || 0).toFixed(1)} m<span className="sup">3</span></p>
            <p className="component-metric">Rate: {formatCurrency(3200)}/m<span className="sup">3</span></p>
            <a href="#" className="verify-link">Verify calculation</a>
          </div>
        </div>
      </div>

      {/* Member Sizes Section */}
      <div className="bg-white rounded-[4px] border border-[#EEEEEE]">
        <div className="border-b border-[#EEEEEE] p-4">
          <h3 className="text-[18px] font-semibold text-[#000000]">Member Sizes</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Joist Size */}
            <div className="bg-[#F5F5F5] p-4 rounded-[4px]">
              <h4 className="text-[14px] font-medium text-[#000000] mb-2">Joists</h4>
              <p className="text-[18px] font-semibold text-[#000000] mb-1">{results.joistSize.width} × {results.joistSize.depth}mm</p>
              <p className="text-[12px] text-[#666666]">Spacing: {buildingData.joistSpacing * 1000}mm</p>
            </div>

            {/* Beam Size */}
            <div className="bg-[#F5F5F5] p-4 rounded-[4px]">
              <h4 className="text-[14px] font-medium text-[#000000] mb-2">Beams</h4>
              {hasBeamSize ? (
                <>
                  <p className="text-[18px] font-semibold text-[#000000] mb-1">{results.beamSize.width} × {results.beamSize.depth}mm</p>
                  <p className="text-[12px] text-[#666666]">Interior beams</p>
                </>
              ) : (
                <p className="text-[14px] text-[#666666]">Not calculated</p>
              )}
            </div>

            {/* Column Size */}
            <div className="bg-[#F5F5F5] p-4 rounded-[4px]">
              <h4 className="text-[14px] font-medium text-[#000000] mb-2">Columns</h4>
              {results.columnSize ? (
                <>
                  <p className="text-[18px] font-semibold text-[#000000] mb-1">{results.columnSize.width} × {results.columnSize.depth}mm</p>
                  <p className="text-[12px] text-[#666666]">Height: {results.columnSize.height}m</p>
                </>
              ) : (
                <p className="text-[14px] text-[#666666]">Not calculated</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={onSaveClick}
          className="h-[36px] px-4 bg-[#3D7EDC] text-white rounded-[4px] hover:bg-[#2D6DC7] transition-colors duration-150 text-[14px] font-medium focus:outline-none focus:ring-1 focus:ring-[#3D7EDC] focus:ring-offset-0"
        >
          Save Results
        </button>
      </div>
    </div>
  );
};

export default ResultsDisplay;