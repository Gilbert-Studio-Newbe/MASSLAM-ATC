"use client";

import LoadTypeSelector from './LoadTypeSelector';
import FireRatingSelector from './FireRatingSelector';

/**
 * StructureConfigSection component that groups structure configuration inputs
 * This includes joists direction, custom bay dimensions, etc.
 */
const StructureConfigSection = ({
  joistsRunLengthwise,
  onToggleJoistDirection,
  buildingLength,
  buildingWidth,
  useCustomBayDimensions,
  onToggleCustomBayDimensions,
  customLengthwiseBayWidths,
  customWidthwiseBayWidths,
  onLengthwiseBayWidthChange,
  onWidthwiseBayWidthChange,
  lengthwiseBays,
  widthwiseBays,
  isMobile
}) => {
  return (
    <div className="apple-specs-table mb-6 md:mb-8">
      <h3 className="text-md md:text-lg font-semibold mb-4 md:mb-6">Structure Configuration</h3>
      
      {/* Joist Direction */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Joist Direction</label>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onToggleJoistDirection(true)}
            className={`px-4 py-2 text-sm font-medium rounded-l-md ${
              joistsRunLengthwise
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Lengthwise
          </button>
          <button
            type="button"
            onClick={() => onToggleJoistDirection(false)}
            className={`px-4 py-2 text-sm font-medium rounded-r-md ${
              !joistsRunLengthwise
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Widthwise
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {joistsRunLengthwise
            ? `Joists span ${buildingWidth}m width, supported by beams along length`
            : `Joists span ${buildingLength}m length, supported by beams along width`}
        </p>
      </div>
      
      {/* Custom Bay Dimensions */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Custom Bay Dimensions</label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input
              type="checkbox"
              name="toggle"
              id="customBayToggle"
              checked={useCustomBayDimensions}
              onChange={() => onToggleCustomBayDimensions(!useCustomBayDimensions)}
              className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
            />
            <label
              htmlFor="customBayToggle"
              className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
            ></label>
          </div>
        </div>
        
        {useCustomBayDimensions && (
          <div className={`mt-3 ${isMobile ? '' : 'grid grid-cols-2 gap-4'}`}>
            {/* Lengthwise Bay Widths */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lengthwise Bay Widths (m)</label>
              <div className="space-y-2">
                {Array.from({ length: lengthwiseBays }).map((_, index) => (
                  <div key={`lengthwise-bay-${index}`} className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2 w-6">L{index + 1}:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="10"
                      step="0.1"
                      value={customLengthwiseBayWidths[index]}
                      onChange={(e) => onLengthwiseBayWidthChange(index, parseFloat(e.target.value))}
                      className="block w-full py-1 px-2 border border-gray-300 rounded-md shadow-sm text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Widthwise Bay Widths */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Widthwise Bay Widths (m)</label>
              <div className="space-y-2">
                {Array.from({ length: widthwiseBays }).map((_, index) => (
                  <div key={`widthwise-bay-${index}`} className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2 w-6">W{index + 1}:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="10"
                      step="0.1"
                      value={customWidthwiseBayWidths[index]}
                      onChange={(e) => onWidthwiseBayWidthChange(index, parseFloat(e.target.value))}
                      className="block w-full py-1 px-2 border border-gray-300 rounded-md shadow-sm text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
};

export default StructureConfigSection; 