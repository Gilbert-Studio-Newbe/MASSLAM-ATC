import React, { useState, useEffect } from "react";
import { getValidDepthsForWidth } from "@/utils/timberSizes";
import { validateTimberSize } from "@/utils/timberSizeValidator";

/**
 * Component for manually selecting timber sizes
 */
export default function TimberSizeSelector({ 
  availableSizes, 
  currentWidth, 
  currentDepth, 
  componentType, // "joist", "beam", or "post"
  onSizeSelect 
}) {
  // State for selected width and depth
  const [selectedWidth, setSelectedWidth] = useState(currentWidth || 0);
  const [selectedDepth, setSelectedDepth] = useState(currentDepth || 0);
  
  // State for available depths based on selected width
  const [availableDepths, setAvailableDepths] = useState([]);
  
  // State for validation result
  const [validationResult, setValidationResult] = useState(null);
  
  // Update available depths when width changes
  useEffect(() => {
    if (selectedWidth) {
      const depths = getValidDepthsForWidth(selectedWidth, componentType);
      setAvailableDepths(depths);
      
      // If current depth is not valid for this width, reset it
      if (selectedDepth && !depths.includes(selectedDepth)) {
        setSelectedDepth(depths.length > 0 ? depths[0] : 0);
      }
    } else {
      setAvailableDepths([]);
    }
  }, [selectedWidth, componentType, selectedDepth]);
  
  // Validate the selected size when either width or depth changes
  useEffect(() => {
    if (selectedWidth && selectedDepth) {
      const result = validateTimberSize(selectedWidth, selectedDepth, componentType);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [selectedWidth, selectedDepth, componentType]);
  
  // Handle width selection
  const handleWidthChange = (e) => {
    const width = parseInt(e.target.value);
    setSelectedWidth(width);
  };
  
  // Handle depth selection
  const handleDepthChange = (e) => {
    const depth = parseInt(e.target.value);
    setSelectedDepth(depth);
  };
  
  // Handle size confirmation
  const handleSizeConfirm = () => {
    if (validationResult?.isValid && onSizeSelect) {
      onSizeSelect({
        width: selectedWidth,
        depth: selectedDepth,
        componentType
      });
    }
  };
  
  return (
    <div className="card bg-white p-4 shadow-md rounded-lg">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        {componentType.charAt(0).toUpperCase() + componentType.slice(1)} Size Selection
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Width selection */}
        <div>
          <label htmlFor="width-select" className="block text-sm font-medium text-gray-700 mb-1">
            Width (mm)
          </label>
          <select
            id="width-select"
            className="select w-full"
            value={selectedWidth || ""}
            onChange={handleWidthChange}
          >
            <option value="">Select width</option>
            {availableSizes?.widths?.map((width) => (
              <option key={`width-${width}`} value={width}>
                {width} mm
              </option>
            ))}
          </select>
        </div>
        
        {/* Depth selection */}
        <div>
          <label htmlFor="depth-select" className="block text-sm font-medium text-gray-700 mb-1">
            Depth (mm)
          </label>
          <select
            id="depth-select"
            className="select w-full"
            value={selectedDepth || ""}
            onChange={handleDepthChange}
            disabled={!selectedWidth || availableDepths.length === 0}
          >
            <option value="">Select depth</option>
            {availableDepths.map((depth) => (
              <option key={`depth-${depth}`} value={depth}>
                {depth} mm
              </option>
            ))}
          </select>
          {selectedWidth && availableDepths.length === 0 && (
            <p className="text-red-500 text-sm mt-1">No valid depths for this width</p>
          )}
        </div>
      </div>
      
      {/* Size visualization */}
      {selectedWidth > 0 && selectedDepth > 0 && (
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div
              className="bg-masslam-100 border border-masslam-300 rounded"
              style={{
                width: `${Math.min(200, selectedWidth)}px`,
                height: `${Math.min(200, selectedDepth)}px`,
                minWidth: "30px",
                minHeight: "30px"
              }}
            ></div>
            <div className="mt-2 text-center text-sm text-gray-600">
              {selectedWidth} × {selectedDepth} mm
            </div>
          </div>
        </div>
      )}
      
      {/* Validation message */}
      {validationResult && (
        <div className={`p-3 rounded mb-4 ${validationResult.isValid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {validationResult.message}
        </div>
      )}
      
      {/* Confirm button */}
      <button
        className="btn btn-primary w-full"
        onClick={handleSizeConfirm}
        disabled={!validationResult?.isValid}
      >
        Confirm Size Selection
      </button>
    </div>
  );
}
