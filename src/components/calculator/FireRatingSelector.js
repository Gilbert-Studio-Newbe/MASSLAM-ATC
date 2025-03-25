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
    <div className="space-y-4">
      <h3 className="subsection-header">Fire Rating (FRL)</h3>
      <div className="space-y-3">
        <select 
          className="input-field appearance-none bg-white pr-10"
          value={selectedRating}
          onChange={(e) => onChange(e.target.value)}
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            backgroundSize: '16px'
          }}
        >
          <option value="none">No Fire Rating</option>
          <option value="30/30/30">30/30/30</option>
          <option value="60/60/60">60/60/60</option>
          <option value="90/90/90">90/90/90</option>
          <option value="120/120/120">120/120/120</option>
        </select>
        
        <div className="text-[14px] text-[#666666]">
          Concrete thickness: {concreteThickness}mm (based on selected FRL)
        </div>
      </div>
    </div>
  );
} 