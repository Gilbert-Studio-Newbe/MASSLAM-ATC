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
            onClick={() => onToggleJoistDirection(false)}
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
            onClick={() => onToggleJoistDirection(true)}
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
          {!buildingData.joistsRunLengthwise
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
        
        {/* Display bay width inputs if custom dimensions are enabled */}
        {buildingData.useCustomBayDimensions && (
          <div className="mt-4 space-y-4">
            {/* Lengthwise Bay Widths */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Lengthwise Bay Widths (m)</h4>
              <div className="grid grid-cols-2 gap-2">
                {buildingData.customLengthwiseBayWidths.map((width, index) => (
                  <div key={`L${index+1}`} className="flex items-center space-x-2">
                    <span className="w-8 text-sm font-medium text-gray-600">L{index+1}:</span>
                    <input
                      type="number"
                      min="0.5"
                      max={buildingData.maxBaySpan}
                      step="0.05"
                      value={typeof width === 'number' ? width.toFixed(2) : '0.00'}
                      onChange={(e) => onLengthwiseBayWidthChange(index, e.target.value)}
                      className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>

              {/* Bay Width Summary for Lengthwise */}
              <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                <div className="flex justify-between mb-1">
                  <span>Total:</span>
                  <span className={Math.abs(buildingData.customLengthwiseBayWidths.reduce((sum, width) => sum + (typeof width === 'number' ? width : 0), 0) - buildingData.buildingLength) > 0.01 ? 'text-red-500' : ''}>
                    {buildingData.customLengthwiseBayWidths.reduce((sum, width) => sum + (typeof width === 'number' ? width : 0), 0).toFixed(2)}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Target:</span>
                  <span>{typeof buildingData.buildingLength === 'number' ? buildingData.buildingLength.toFixed(2) : '0.00'}m</span>
                </div>
              </div>
            </div>
            
            {/* Widthwise Bay Widths */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Widthwise Bay Widths (m)</h4>
              <div className="grid grid-cols-2 gap-2">
                {buildingData.customWidthwiseBayWidths.map((width, index) => (
                  <div key={`W${index+1}`} className="flex items-center space-x-2">
                    <span className="w-8 text-sm font-medium text-gray-600">W{index+1}:</span>
                    <input
                      type="number"
                      min="0.5"
                      max={buildingData.maxBaySpan}
                      step="0.05"
                      value={typeof width === 'number' ? width.toFixed(2) : '0.00'}
                      onChange={(e) => onWidthwiseBayWidthChange(index, e.target.value)}
                      className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>

              {/* Bay Width Summary for Widthwise */}
              <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                <div className="flex justify-between mb-1">
                  <span>Total:</span>
                  <span className={Math.abs(buildingData.customWidthwiseBayWidths.reduce((sum, width) => sum + (typeof width === 'number' ? width : 0), 0) - buildingData.buildingWidth) > 0.01 ? 'text-red-500' : ''}>
                    {buildingData.customWidthwiseBayWidths.reduce((sum, width) => sum + (typeof width === 'number' ? width : 0), 0).toFixed(2)}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Target:</span>
                  <span>{typeof buildingData.buildingWidth === 'number' ? buildingData.buildingWidth.toFixed(2) : '0.00'}m</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
};

export default StructureConfigSection; 