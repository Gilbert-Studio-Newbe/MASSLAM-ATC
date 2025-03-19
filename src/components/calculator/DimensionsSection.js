"use client";

import { useState, useEffect } from 'react';
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
  const [isClient, setIsClient] = useState(false);
  const [lengthwiseBayWidth, setLengthwiseBayWidth] = useState("");
  const [widthwiseBayWidth, setWidthwiseBayWidth] = useState("");
  
  // Calculate bay widths client-side only to avoid hydration mismatches
  useEffect(() => {
    setIsClient(true);
    setLengthwiseBayWidth(`Current bay width: ${(buildingLength / lengthwiseBays).toFixed(2)} m`);
    setWidthwiseBayWidth(`Current bay depth: ${(buildingWidth / widthwiseBays).toFixed(2)} m`);
  }, [buildingLength, buildingWidth, lengthwiseBays, widthwiseBays]);

  return (
    <div className="apple-specs-table mb-6 md:mb-8">
      <h3 className="text-md md:text-lg font-semibold mb-4 md:mb-6">Dimensions</h3>
      
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
        label="Floor to Floor (m)"
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
        description={isClient ? lengthwiseBayWidth : null}
      />

      <SliderInput 
        label="Bays Deep (Rows)"
        value={widthwiseBays} 
        onChange={onWidthwiseBaysChange}
        min={1}
        max={20}
        step={1}
        isInteger={true}
        description={isClient ? widthwiseBayWidth : null}
      />
    </div>
  );
};

export default DimensionsSection; 