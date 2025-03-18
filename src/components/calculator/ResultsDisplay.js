"use client";

import Link from 'next/link';

/**
 * ResultsDisplay component for showing calculation results
 */
const ResultsDisplay = ({ 
  results, 
  onSaveClick,
  isMobile
}) => {
  if (!results) {
    return (
      <div className="apple-card p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Results</h2>
        <p style={{ color: 'var(--apple-text-secondary)' }}>Configure your timber structure parameters to see calculation results.</p>
      </div>
    );
  }
  
  return (
    <div className="apple-results">
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
                  <p><span className="text-gray-500">Width:</span> {results.joistSize.width}mm</p>
                  <p><span className="text-gray-500">Depth:</span> {results.joistSize.depth}mm</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Beams</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Interior Beams:</span> {results.interiorBeamSize.width}mm × {results.interiorBeamSize.depth}mm</p>
                  <p><span className="text-gray-500">Edge Beams:</span> {results.edgeBeamSize.width}mm × {results.edgeBeamSize.depth}mm</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Columns</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Size:</span> {results.columnSize.width}mm × {results.columnSize.depth}mm</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Cost Summary Section */}
        <div className="apple-card">
          <div className="apple-card-header">
            <h3 className="text-md font-semibold">Cost Summary</h3>
          </div>
          <div className="apple-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Materials</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Beams:</span> {results.cost.beamCost}</p>
                  <p><span className="text-gray-500">Columns:</span> {results.cost.columnCost}</p>
                  <p><span className="text-gray-500">Joists:</span> {results.cost.joistCost}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Total</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Materials:</span> {results.cost.totalCost}</p>
                  <p><span className="text-gray-500">Carbon Saved:</span> {results.carbonSavings} kg CO₂</p>
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