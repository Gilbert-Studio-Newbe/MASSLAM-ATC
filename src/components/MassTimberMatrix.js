import React from "react";

/**
 * Component to display the mass timber size matrix as a visual diagram
 */
export default function MassTimberMatrix({ availableSizes }) {
  if (!availableSizes || !availableSizes.widths || !availableSizes.depths) {
    return <div className="p-4">Loading size data...</div>;
  }
  
  // Sort widths and depths in ascending order
  const widths = [...availableSizes.widths].sort((a, b) => a - b);
  const depths = [...availableSizes.depths].sort((a, b) => a - b);
  
  // Helper function to check if a size combination is valid
  const isValidCombination = (width, depth) => {
    if (!availableSizes.validCombinations) {
      // If no valid combinations are specified, assume all combinations are valid
      return true;
    }
    
    const combination = availableSizes.validCombinations.find(combo => combo.width === width);
    return combination && combination.depths.includes(depth);
  };
  
  // Helper function to get cell color based on size
  const getCellColor = (width, depth) => {
    if (!isValidCombination(width, depth)) {
      return "bg-gray-100 text-gray-400"; // Invalid combination
    }
    
    // Calculate cross-sectional area in cm²
    const area = (width * depth) / 100;
    
    // Color based on size (larger = darker)
    if (area < 100) return "bg-masslam-100 hover:bg-masslam-200";
    if (area < 200) return "bg-masslam-200 hover:bg-masslam-300";
    if (area < 400) return "bg-masslam-300 hover:bg-masslam-400";
    if (area < 800) return "bg-masslam-400 hover:bg-masslam-500 text-white";
    return "bg-masslam-500 hover:bg-masslam-600 text-white";
  };
  
  // Helper function to get cell size based on dimensions
  const getCellSize = (width, depth) => {
    // Base size
    const baseSize = 60;
    
    // Find the largest width and depth to normalize sizes
    const maxWidth = Math.max(...widths);
    const maxDepth = Math.max(...depths);
    
    // Calculate relative sizes (min 70%, max 100%)
    const widthFactor = 0.7 + (0.3 * width / maxWidth);
    const depthFactor = 0.7 + (0.3 * depth / maxDepth);
    
    return {
      width: Math.round(baseSize * widthFactor),
      height: Math.round(baseSize * depthFactor)
    };
  };
  
  return (
    <div className="card bg-white p-4 shadow-md rounded-lg">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        {availableSizes.description || "Mass Timber Size Matrix"}
      </h3>
      
      {availableSizes.notes && (
        <p className="text-sm text-gray-600 mb-4">{availableSizes.notes}</p>
      )}
      
      {/* Matrix header - width labels */}
      <div className="flex mb-2 ml-16">
        {widths.map(width => (
          <div key={`header-${width}`} className="text-center font-medium text-sm" style={{ width: "70px" }}>
            {width} mm
          </div>
        ))}
      </div>
      
      {/* Matrix body */}
      <div className="overflow-x-auto">
        {depths.map(depth => (
          <div key={`row-${depth}`} className="flex items-center mb-2">
            {/* Depth label */}
            <div className="w-16 text-right pr-2 font-medium text-sm">{depth} mm</div>
            
            {/* Size cells */}
            {widths.map(width => {
              const isValid = isValidCombination(width, depth);
              const cellColor = getCellColor(width, depth);
              const { width: cellWidth, height: cellHeight } = getCellSize(width, depth);
              
              return (
                <div
                  key={`cell-${width}-${depth}`}
                  className={`m-1 flex items-center justify-center rounded border ${cellColor} ${isValid ? "cursor-pointer transition-colors" : "cursor-not-allowed"}`}
                  style={{ width: `${cellWidth}px`, height: `${cellHeight}px` }}
                  title={`${width} × ${depth} mm${isValid ? "" : " (Not available)"}`}
                >
                  {isValid && (
                    <span className="text-xs font-medium">
                      {width}×{depth}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Legend</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-masslam-100 border rounded mr-1"></div>
            <span className="text-xs">Small section (&lt;100 cm²)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-masslam-300 border rounded mr-1"></div>
            <span className="text-xs">Medium section (100-400 cm²)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-masslam-500 border rounded mr-1"></div>
            <span className="text-xs">Large section (&gt;400 cm²)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-100 border rounded mr-1"></div>
            <span className="text-xs">Not available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
