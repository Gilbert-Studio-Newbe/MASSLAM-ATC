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
    <div className="space-y-6">
      {/* Main Dimensions */}
      <div>
        <h3 className="subsection-header">Main Dimensions</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          {/* Building Length */}
          <div>
            <label htmlFor="buildingLength" className="label-primary">
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
              className="input-field w-full"
            />
          </div>
          
          {/* Building Width */}
          <div>
            <label htmlFor="buildingWidth" className="label-primary">
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
              className="input-field w-full"
            />
          </div>
          
          {/* Number of Floors */}
          <div>
            <label htmlFor="numFloors" className="label-primary">
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
              className="input-field w-full"
            />
          </div>
          
          {/* Floor Height */}
          <div>
            <label htmlFor="floorHeight" className="label-primary">
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
              className="input-field w-full"
            />
          </div>
        </div>
      </div>

      {/* Joist Configuration */}
      <div>
        <h3 className="subsection-header">Joist Configuration</h3>
        <div>
          <label htmlFor="joistSpacing" className="label-primary">
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
            className="input-field w-full"
          />
          <p className="text-descriptive mt-1">
            Typical values: 0.4m (400mm), 0.6m (600mm), 0.8m (800mm)
          </p>
        </div>
      </div>
      
      {/* Bay Configuration */}
      <div>
        <h3 className="subsection-header">Bay Configuration</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div>
            <label htmlFor="lengthwiseBays" className="label-primary">
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
              className="input-field w-full"
            />
          </div>
          
          <div>
            <label htmlFor="widthwiseBays" className="label-primary">
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
              className="input-field w-full"
            />
          </div>
        </div>
      </div>
      
      {/* Display calculated bay sizes for reference */}
      {!buildingData.useCustomBayDimensions && (
        <div className="bg-[#F5F9FF] p-4 rounded-lg">
          <p className="text-[14px] text-[#333333]">
            Default bay size: 
            <span className="font-medium">
              {` ${typeof buildingData.buildingLength === 'number' && typeof buildingData.lengthwiseBays === 'number' && buildingData.lengthwiseBays > 0 
                ? (Math.round((buildingData.buildingLength / buildingData.lengthwiseBays) / 0.05) * 0.05).toFixed(2) 
                : '0.00'}m × ${typeof buildingData.buildingWidth === 'number' && typeof buildingData.widthwiseBays === 'number' && buildingData.widthwiseBays > 0
                ? (Math.round((buildingData.buildingWidth / buildingData.widthwiseBays) / 0.05) * 0.05).toFixed(2)
                : '0.00'}m`}
            </span>
          </p>
          <p className="text-descriptive mt-1">Bay sizes are rounded to the nearest 0.05m</p>
        </div>
      )}
    </div>
  );
};

export default BuildingDimensions; 