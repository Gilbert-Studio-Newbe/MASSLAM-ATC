import React from "react";

/**
 * Component to display a cross-section of the timber profile
 */
export default function TimberProfileOverlay({ dimensions, availableSizes, onClose }) {
  const { joistsWidth, joistsHeight, beamsWidth, beamsHeight, postWidth, postDepth } = dimensions;
  
  // Helper function to calculate scale factor for visualization
  const calculateScaleFactor = (width, height, maxSize = 300) => {
    const maxDimension = Math.max(width, height);
    return maxDimension > 0 ? maxSize / maxDimension : 1;
  };
  
  // Helper function to render a timber cross-section
  const renderTimberProfile = (width, height, title, scaleFactor = 1) => {
    const scaledWidth = width * scaleFactor;
    const scaledHeight = height * scaleFactor;
    
    return (
      <div className="flex flex-col items-center mb-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="relative">
          <div
            className="bg-masslam-200 border-2 border-masslam-400 rounded-sm shadow-md"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
              minWidth: "40px",
              minHeight: "40px"
            }}
          >
            {/* Wood grain pattern */}
            <div className="absolute inset-0 opacity-20">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-masslam-300 rounded-full"
                  style={{
                    position: "absolute",
                    width: `${Math.random() * 60 + 20}%`,
                    height: "3px",
                    top: `${Math.random() * 90}%`,
                    left: `${Math.random() * 20}%`,
                    transform: `rotate(${Math.random() * 5}deg)`
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Dimension labels */}
          <div className="absolute -top-6 left-0 right-0 flex justify-center">
            <div className="bg-white px-2 py-0.5 text-xs border border-gray-300 rounded shadow-sm">
              {width} mm
            </div>
          </div>
          <div className="absolute top-0 bottom-0 -right-6 flex items-center">
            <div className="bg-white px-2 py-0.5 text-xs border border-gray-300 rounded shadow-sm">
              {height} mm
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Calculate scale factors for each component
  const joistScaleFactor = calculateScaleFactor(joistsWidth, joistsHeight);
  const beamScaleFactor = calculateScaleFactor(beamsWidth, beamsHeight);
  const postScaleFactor = calculateScaleFactor(postWidth, postDepth);
  
  // Helper function to find the closest standard size
  const findClosestStandardSize = (width, height, componentType) => {
    if (!availableSizes || !availableSizes[componentType]) {
      return null;
    }
    
    const sizes = availableSizes[componentType];
    let closestWidth = sizes.widths[0];
    let closestHeight = sizes.depths[0];
    let minWidthDiff = Math.abs(width - closestWidth);
    let minHeightDiff = Math.abs(height - closestHeight);
    
    // Find closest width
    for (const w of sizes.widths) {
      const diff = Math.abs(width - w);
      if (diff < minWidthDiff) {
        minWidthDiff = diff;
        closestWidth = w;
      }
    }
    
    // Find closest height/depth
    for (const h of sizes.depths) {
      const diff = Math.abs(height - h);
      if (diff < minHeightDiff) {
        minHeightDiff = diff;
        closestHeight = h;
      }
    }
    
    // Check if this is a valid combination
    const validCombination = sizes.validCombinations.find(
      combo => combo.width === closestWidth && combo.depths.includes(closestHeight)
    );
    
    if (!validCombination) {
      // If not valid, find a valid combination with the closest width
      const combo = sizes.validCombinations.find(c => c.width === closestWidth);
      if (combo) {
        // Find the closest valid depth for this width
        closestHeight = combo.depths.reduce((closest, d) => {
          return Math.abs(d - height) < Math.abs(closest - height) ? d : closest;
        }, combo.depths[0]);
      }
    }
    
    return { width: closestWidth, height: closestHeight };
  };
  
  // Find closest standard sizes if available
  const closestJoistSize = findClosestStandardSize(joistsWidth, joistsHeight, "joist");
  const closestBeamSize = findClosestStandardSize(beamsWidth, beamsHeight, "beam");
  const closestPostSize = findClosestStandardSize(postWidth, postDepth, "post");
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-3 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Timber Cross-Sections</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Joist profile */}
          <div className="bg-gray-50 p-4 rounded-lg">
            {renderTimberProfile(joistsWidth, joistsHeight, "Joist Cross-Section", joistScaleFactor)}
            
            {closestJoistSize && (
              <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-1">Closest Standard Size:</h4>
                <p className="text-blue-700">{closestJoistSize.width} × {closestJoistSize.height} mm</p>
              </div>
            )}
          </div>
          
          {/* Beam profile */}
          <div className="bg-gray-50 p-4 rounded-lg">
            {renderTimberProfile(beamsWidth, beamsHeight, "Beam Cross-Section", beamScaleFactor)}
            
            {closestBeamSize && (
              <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-1">Closest Standard Size:</h4>
                <p className="text-blue-700">{closestBeamSize.width} × {closestBeamSize.height} mm</p>
              </div>
            )}
          </div>
          
          {/* Post profile */}
          <div className="bg-gray-50 p-4 rounded-lg">
            {renderTimberProfile(postWidth, postDepth, "Post Cross-Section", postScaleFactor)}
            
            {closestPostSize && (
              <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-1">Closest Standard Size:</h4>
                <p className="text-blue-700">{closestPostSize.width} × {closestPostSize.height} mm</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer with note */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Note:</span> Cross-sections are shown to scale relative to each other.
            Standard sizes are based on commonly available timber dimensions.
          </p>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="btn btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
