"use client";

import LoadTypeSelector from './LoadTypeSelector';
import FireRatingSelector from './FireRatingSelector';

/**
 * StructureConfigSection component that groups structure configuration inputs
 */
const StructureConfigSection = ({
  load,
  fireRating,
  onLoadChange,
  onFireRatingChange
}) => {
  return (
    <div className="apple-specs-table mb-6 md:mb-8">
      <h3 className="text-md md:text-lg font-semibold mb-4 md:mb-6">Structure Configuration</h3>
      
      {/* Load Type with Radio Buttons */}
      <LoadTypeSelector value={load} onChange={onLoadChange} />

      {/* Fire Rating with Select Dropdown */}
      <FireRatingSelector value={fireRating} onChange={onFireRatingChange} />
    </div>
  );
};

export default StructureConfigSection; 