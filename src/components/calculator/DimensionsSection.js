"use client";

import SliderInput from '../common/SliderInput';

/**
 * DimensionsSection component for building dimension inputs
 */
const DimensionsSection = ({
  buildingLength,
  buildingWidth,
  numFloors,
  floorHeight,
  lengthwiseBays,
  widthwiseBays,
  onBuildingLengthChange,
  onBuildingWidthChange,
  onNumFloorsChange,
  onFloorHeightChange,
  onLengthwiseBaysChange,
  onWidthwiseBaysChange
}) => {
  return (
    <div className="apple-specs-table mb-6 md:mb-8">
      <h3 className="text-xl font-semibold mb-6 text-gray-800">Building Dimensions</h3>
      
      <div className="space-y-6">
        <SliderInput 
          label="Building Length (m)"
          value={buildingLength} 
          onChange={onBuildingLengthChange}
          min={3}
          max={100}
          step={0.1}
          unit="m"
        />

        <SliderInput 
          label="Building Width (m)"
          value={buildingWidth} 
          onChange={onBuildingWidthChange}
          min={3}
          max={100}
          step={0.1}
          unit="m"
        />

        <SliderInput 
          label="Number of Floors"
          value={numFloors} 
          onChange={onNumFloorsChange}
          min={1}
          max={20}
          step={1}
          isInteger={true}
        />

        <SliderInput 
          label="Floor to Floor Height"
          value={floorHeight} 
          onChange={onFloorHeightChange}
          min={2.4}
          max={6}
          step={0.1}
          unit="m"
        />

        <SliderInput 
          label="Bays Wide (Columns)"
          value={lengthwiseBays} 
          onChange={onLengthwiseBaysChange}
          min={1}
          max={20}
          step={1}
          isInteger={true}
          description={`Current bay width: ${(buildingLength / lengthwiseBays).toFixed(2)} m`}
        />

        <SliderInput 
          label="Bays Deep (Rows)"
          value={widthwiseBays} 
          onChange={onWidthwiseBaysChange}
          min={1}
          max={20}
          step={1}
          isInteger={true}
          description={`Current bay depth: ${(buildingWidth / widthwiseBays).toFixed(2)} m`}
        />
      </div>
    </div>
  );
};

export default DimensionsSection; 