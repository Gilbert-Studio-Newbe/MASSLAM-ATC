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
    <div className="mb-8">
      <label className="block text-base text-gray-500 mb-4">
        Fire Rating (FRL)
      </label>
      <div className="relative">
        <select 
          className="w-full px-4 py-3 text-base bg-gray-100 rounded-lg focus:outline-none appearance-none cursor-pointer"
          value={selectedRating}
          onChange={(e) => onChange(e.target.value)}
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            backgroundSize: '1em'
          }}
        >
          <option value="none">No Fire Rating</option>
          <option value="30/30/30">30/30/30</option>
          <option value="60/60/60">60/60/60</option>
          <option value="90/90/90">90/90/90</option>
          <option value="120/120/120">120/120/120</option>
        </select>
      </div>
      
      <div className="mt-2 text-base text-gray-500">
        Concrete thickness: {concreteThickness}mm (based on selected FRL)
      </div>
    </div>
  );
} 