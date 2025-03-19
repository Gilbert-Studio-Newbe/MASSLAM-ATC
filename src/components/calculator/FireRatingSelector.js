"use client";

import React from 'react';
import { useBuildingData } from '@/contexts/BuildingDataContext';

/**
 * Component for selecting fire rating level (FRL) and displaying associated concrete thickness.
 * This has been updated to work with the centralized fire resistance calculation logic.
 */
export default function FireRatingSelector({ selectedRating, onChange }) {
  const { buildingData } = useBuildingData();
  
  // Get concrete thickness from buildingData (now populated by FireResistanceCalculator)
  const concreteThickness = buildingData.fireParams?.concreteThickness || 100;
  
  return (
    <div className="flex flex-col mb-4">
      <div className="grid grid-cols-6 gap-4 items-center mb-2">
        <div className="col-span-3 text-sm md:text-base font-medium">
          Fire Resistance Level (FRL):
        </div>
        <div className="col-span-3">
          <select 
            className="form-select rounded-md w-full text-sm"
            value={selectedRating}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="none">No Fire Rating</option>
            <option value="30/30/30">30/30/30</option>
            <option value="60/60/60">60/60/60</option>
            <option value="90/90/90">90/90/90</option>
            <option value="120/120/120">120/120/120</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-4 items-center text-gray-600">
        <div className="col-span-3 text-sm md:text-base font-medium pl-4">
          Concrete Thickness:
        </div>
        <div className="col-span-3 text-sm">
          {concreteThickness}mm
        </div>
      </div>
      {buildingData.fireParams && (
        <div className="grid grid-cols-6 gap-4 items-center text-gray-600">
          <div className="col-span-3 text-sm md:text-base font-medium pl-4">
            Joist Width:
          </div>
          <div className="col-span-3 text-sm">
            {buildingData.fireParams.joistWidth}mm
          </div>
        </div>
      )}
    </div>
  );
} 