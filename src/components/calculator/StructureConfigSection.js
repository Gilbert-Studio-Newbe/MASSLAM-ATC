"use client";

import LoadTypeSelector from './LoadTypeSelector';
import FireRatingSelector from './FireRatingSelector';
import BuildingDimensions from './BuildingDimensions';

/**
 * StructureConfigSection component that groups structure configuration inputs
 * This includes joists direction, custom bay dimensions, etc.
 */
const StructureConfigSection = ({
  buildingData,
  onInputChange,
  onToggleJoistDirection,
  onToggleCustomBayDimensions,
  onLengthwiseBayWidthChange,
  onWidthwiseBayWidthChange,
  maxBaySpan,
  isMobile
}) => {
  // Round max bay span to 1 decimal place for display
  const displayMaxBaySpan = Math.round(maxBaySpan * 10) / 10;
  
  return (
    <div className="apple-specs-table mb-6 md:mb-8">
      {/* Building Dimensions Component */}
      <BuildingDimensions 
        buildingData={buildingData}
        onInputChange={onInputChange}
      />
      
      <h3 className="text-md md:text-lg font-semibold mb-4 md:mb-6">Structure Configuration</h3>
      
      {/* Joist Direction */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Joist Direction</label>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onToggleJoistDirection(true)}
            className={`px-4 py-2 text-sm font-medium rounded-l-md ${
              buildingData.joistsRunLengthwise
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
              !buildingData.joistsRunLengthwise
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Widthwise
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {buildingData.joistsRunLengthwise
            ? `Joists span ${buildingData.buildingWidth}m width, supported by beams along length`
            : `Joists span ${buildingData.buildingLength}m length, supported by beams along width`}
        </p>
      </div>
      
      {/* Custom Bay Dimensions */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Use Custom Bay Dimensions
          </label>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={buildingData.useCustomBayDimensions}
              onChange={() => onToggleCustomBayDimensions(!buildingData.useCustomBayDimensions)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        {/* Max Bay Span Info */}
        <div className="mt-2 mb-3 text-sm text-gray-600 bg-blue-50 p-2 rounded">
          <p>Maximum bay span: <span className="font-semibold">{displayMaxBaySpan}m</span></p>
          <p className="text-xs mt-1">This limit ensures structural integrity. You can adjust this in the Calculation Methodology page.</p>
        </div>
        
        {buildingData.useCustomBayDimensions && (
          <div className={`mt-3 ${isMobile ? '' : 'grid grid-cols-2 gap-4'}`}>
            {/* Lengthwise Bay Widths */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lengthwise Bay Widths (m)</label>
              <div className="space-y-2">
                {Array.from({ length: buildingData.lengthwiseBays }).map((_, index) => (
                  <div key={`lengthwise-bay-${index}`} className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2 w-6">L{index + 1}:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="10"
                      step="0.1"
                      value={buildingData.customLengthwiseBayWidths[index]}
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
                {Array.from({ length: buildingData.widthwiseBays }).map((_, index) => (
                  <div key={`widthwise-bay-${index}`} className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2 w-6">W{index + 1}:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="10"
                      step="0.1"
                      value={buildingData.customWidthwiseBayWidths[index]}
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