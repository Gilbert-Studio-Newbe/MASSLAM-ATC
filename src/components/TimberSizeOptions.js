import React from "react";

/**
 * Component to display available timber size options
 */
export default function TimberSizeOptions({ availableSizes }) {
  if (!availableSizes || !availableSizes.widths || !availableSizes.depths) {
    return <div className="p-4">Loading timber size options...</div>;
  }
  
  // Create a grid of all possible width x depth combinations
  const sizeGrid = [];
  for (const width of availableSizes.widths) {
    for (const depth of availableSizes.depths) {
      sizeGrid.push({ width, depth });
    }
  }
  
  return (
    <div className="card bg-white p-4 shadow-md rounded-lg">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800">{availableSizes.description || "Available Timber Sizes"}</h3>
        {availableSizes.notes && (
          <p className="text-sm text-gray-600 mt-1">{availableSizes.notes}</p>
        )}
      </div>
      
      {/* Width options */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Available Widths</h4>
        <div className="flex flex-wrap gap-2">
          {availableSizes.widths.map((width) => (
            <div key={`width-${width}`} className="px-3 py-1 bg-gray-100 rounded text-sm">
              {width} mm
            </div>
          ))}
        </div>
      </div>
      
      {/* Depth options */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Available Depths</h4>
        <div className="flex flex-wrap gap-2">
          {availableSizes.depths.map((depth) => (
            <div key={`depth-${depth}`} className="px-3 py-1 bg-gray-100 rounded text-sm">
              {depth} mm
            </div>
          ))}
        </div>
      </div>
      
      {/* Size combinations grid */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Standard Size Combinations</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {sizeGrid.map(({ width, depth }, index) => (
            <div
              key={`size-${index}`}
              className="flex items-center justify-center p-2 border border-gray-200 rounded bg-gray-50 hover:bg-primary-50 transition-colors cursor-pointer"
            >
              <div className="text-center">
                <span className="font-medium">{width} × {depth}</span>
                <span className="text-xs text-gray-500 block">mm</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
