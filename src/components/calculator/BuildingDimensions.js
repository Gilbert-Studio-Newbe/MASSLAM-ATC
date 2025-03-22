"use client";

import React from 'react';

/**
 * BuildingDimensions component for inputting basic building parameters
 * Includes length, width, number of floors, and floor height
 */
const BuildingDimensions = ({ 
  buildingData,
  onInputChange
}) => {
  return (
    <div className="mb-6">
      <h3 className="text-md font-medium text-gray-700 mb-3">Building Dimensions</h3>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {/* Building Length */}
        <div>
          <label htmlFor="buildingLength" className="block text-sm font-medium text-gray-700 mb-1">
            Length (m)
          </label>
          <input
            id="buildingLength"
            type="number"
            min="3"
            max="100"
            step="0.5"
            value={buildingData.buildingLength}
            onChange={(e) => onInputChange('buildingLength', parseFloat(e.target.value))}
            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm"
          />
        </div>
        
        {/* Building Width */}
        <div>
          <label htmlFor="buildingWidth" className="block text-sm font-medium text-gray-700 mb-1">
            Width (m)
          </label>
          <input
            id="buildingWidth"
            type="number"
            min="3"
            max="100"
            step="0.5"
            value={buildingData.buildingWidth}
            onChange={(e) => onInputChange('buildingWidth', parseFloat(e.target.value))}
            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm"
          />
        </div>
        
        {/* Number of Floors */}
        <div>
          <label htmlFor="numFloors" className="block text-sm font-medium text-gray-700 mb-1">
            Number of Floors
          </label>
          <input
            id="numFloors"
            type="number"
            min="1"
            max="10"
            step="1"
            value={buildingData.numFloors}
            onChange={(e) => onInputChange('numFloors', parseInt(e.target.value, 10))}
            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm"
          />
        </div>
        
        {/* Floor Height */}
        <div>
          <label htmlFor="floorHeight" className="block text-sm font-medium text-gray-700 mb-1">
            Floor Height (m)
          </label>
          <input
            id="floorHeight"
            type="number"
            min="2"
            max="6"
            step="0.1"
            value={buildingData.floorHeight}
            onChange={(e) => onInputChange('floorHeight', parseFloat(e.target.value))}
            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm"
          />
        </div>
        
        {/* Joist Spacing */}
        <div>
          <label htmlFor="joistSpacing" className="block text-sm font-medium text-gray-700 mb-1">
            Joist Spacing (m)
          </label>
          <input
            id="joistSpacing"
            type="number"
            min="0.2"
            max="1.2"
            step="0.1"
            value={buildingData.joistSpacing}
            onChange={(e) => onInputChange('joistSpacing', parseFloat(e.target.value))}
            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Typical values: 0.4m (400mm), 0.6m (600mm), 0.8m (800mm)
          </p>
        </div>
      </div>
      
      {/* Bay Configuration */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
        <div>
          <label htmlFor="lengthwiseBays" className="block text-sm font-medium text-gray-700 mb-1">
            Lengthwise Bays
          </label>
          <input
            id="lengthwiseBays"
            type="number"
            min="1"
            max="10"
            step="1"
            value={buildingData.lengthwiseBays}
            onChange={(e) => onInputChange('lengthwiseBays', parseInt(e.target.value, 10))}
            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="widthwiseBays" className="block text-sm font-medium text-gray-700 mb-1">
            Widthwise Bays
          </label>
          <input
            id="widthwiseBays"
            type="number"
            min="1"
            max="10"
            step="1"
            value={buildingData.widthwiseBays}
            onChange={(e) => onInputChange('widthwiseBays', parseInt(e.target.value, 10))}
            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm"
          />
        </div>
      </div>
      
      {/* Display calculated bay sizes for reference */}
      {!buildingData.useCustomBayDimensions && (
        <div className="mt-3 text-sm text-gray-500">
          <p>
            Default bay size: 
            {` ${typeof buildingData.buildingLength === 'number' && typeof buildingData.lengthwiseBays === 'number' && buildingData.lengthwiseBays > 0 
              ? (Math.round((buildingData.buildingLength / buildingData.lengthwiseBays) / 0.05) * 0.05).toFixed(2) 
              : '0.00'}m × ${typeof buildingData.buildingWidth === 'number' && typeof buildingData.widthwiseBays === 'number' && buildingData.widthwiseBays > 0
              ? (Math.round((buildingData.buildingWidth / buildingData.widthwiseBays) / 0.05) * 0.05).toFixed(2)
              : '0.00'}m`}
            <span className="text-xs block mt-1">(Bay sizes are rounded to the nearest 0.05m)</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default BuildingDimensions; 