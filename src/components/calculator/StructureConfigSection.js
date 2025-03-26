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
    <div className="space-y-8">
      {/* Building Dimensions Section */}
      <div>
        <h2 className="section-header">Building Dimensions</h2>
        <BuildingDimensions 
          buildingData={buildingData}
          onInputChange={onInputChange}
        />
      </div>

      {/* Structure Configuration Section */}
      <div>
        <h2 className="section-header">Structure Configuration</h2>
        
        {/* Joist Direction */}
        <div className="space-y-6">
          <div>
            <h3 className="subsection-header">Joist Direction</h3>
            <div className="flex w-full">
              <button
                type="button"
                onClick={() => onToggleJoistDirection(false)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${
                  buildingData.joistsRunLengthwise
                    ? 'bg-[#3D7EDC] text-white border-[#3D7EDC]'
                    : 'bg-white text-[#333333] border-[#CCCCCC] hover:bg-gray-50'
                }`}
              >
                Lengthwise
              </button>
              <button
                type="button"
                onClick={() => onToggleJoistDirection(true)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-t border-b border-r ${
                  !buildingData.joistsRunLengthwise
                    ? 'bg-[#3D7EDC] text-white border-[#3D7EDC]'
                    : 'bg-white text-[#333333] border-[#CCCCCC] hover:bg-gray-50'
                }`}
              >
                Widthwise
              </button>
            </div>
            <p className="text-descriptive mt-2">
              {!buildingData.joistsRunLengthwise
                ? `Joists span ${buildingData.buildingWidth}m width, supported by beams along length`
                : `Joists span ${buildingData.buildingLength}m length, supported by beams along width`}
            </p>
          </div>

          {/* Custom Bay Dimensions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="subsection-header mb-0">Custom Bay Dimensions</h3>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={buildingData.useCustomBayDimensions}
                  onChange={() => onToggleCustomBayDimensions(!buildingData.useCustomBayDimensions)}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-[#CCCCCC] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3D7EDC]"></div>
              </label>
            </div>

            {/* Max Bay Span Info */}
            <div className="mb-4 bg-[#F5F9FF] p-4 rounded-lg">
              <p className="text-[14px] text-[#333333] font-medium">Maximum bay span: <span className="font-semibold">{displayMaxBaySpan}m</span></p>
              <p className="text-descriptive mt-1">This limit ensures structural integrity. You can adjust this in the Calculation Methodology page.</p>
            </div>

            {/* Display bay width inputs if custom dimensions are enabled */}
            {buildingData.useCustomBayDimensions && (
              <div className="space-y-6">
                {/* Lengthwise Bay Widths */}
                <div>
                  <h4 className="subsection-header text-[14px]">Lengthwise Bay Widths (m)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {buildingData.customLengthwiseBayWidths.map((width, index) => (
                      <div key={`L${index+1}`} className="flex items-center space-x-2">
                        <span className="w-8 text-sm font-medium text-[#333333]">L{index+1}:</span>
                        <input
                          type="number"
                          min="0.5"
                          max={buildingData.maxBaySpan}
                          step="0.05"
                          value={typeof width === 'number' ? width.toFixed(2) : '0.00'}
                          onChange={(e) => onLengthwiseBayWidthChange(index, e.target.value)}
                          className="input-field w-full"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Bay Width Summary for Lengthwise */}
                  <div className="mt-3 text-[12px] bg-[#F5F5F5] p-3 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <span className="text-[#666666]">Total:</span>
                      <span className={Math.abs(buildingData.customLengthwiseBayWidths.reduce((sum, width) => sum + (typeof width === 'number' ? width : 0), 0) - buildingData.buildingLength) > 0.01 ? 'text-[#DC3545]' : 'text-[#333333]'}>
                        {buildingData.customLengthwiseBayWidths.reduce((sum, width) => sum + (typeof width === 'number' ? width : 0), 0).toFixed(2)}m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666666]">Target:</span>
                      <span className="text-[#333333]">{typeof buildingData.buildingLength === 'number' ? buildingData.buildingLength.toFixed(2) : '0.00'}m</span>
                    </div>
                  </div>
                </div>

                {/* Widthwise Bay Widths */}
                <div>
                  <h4 className="subsection-header text-[14px]">Widthwise Bay Widths (m)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {buildingData.customWidthwiseBayWidths.map((width, index) => (
                      <div key={`W${index+1}`} className="flex items-center space-x-2">
                        <span className="w-8 text-sm font-medium text-[#333333]">W{index+1}:</span>
                        <input
                          type="number"
                          min="0.5"
                          max={buildingData.maxBaySpan}
                          step="0.05"
                          value={typeof width === 'number' ? width.toFixed(2) : '0.00'}
                          onChange={(e) => onWidthwiseBayWidthChange(index, e.target.value)}
                          className="input-field w-full"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Bay Width Summary for Widthwise */}
                  <div className="mt-3 text-[12px] bg-[#F5F5F5] p-3 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <span className="text-[#666666]">Total:</span>
                      <span className={Math.abs(buildingData.customWidthwiseBayWidths.reduce((sum, width) => sum + (typeof width === 'number' ? width : 0), 0) - buildingData.buildingWidth) > 0.01 ? 'text-[#DC3545]' : 'text-[#333333]'}>
                        {buildingData.customWidthwiseBayWidths.reduce((sum, width) => sum + (typeof width === 'number' ? width : 0), 0).toFixed(2)}m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666666]">Target:</span>
                      <span className="text-[#333333]">{typeof buildingData.buildingWidth === 'number' ? buildingData.buildingWidth.toFixed(2) : '0.00'}m</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StructureConfigSection; 