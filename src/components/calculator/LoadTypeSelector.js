"use client";

/**
 * LoadTypeSelector component for selecting between residential and commercial load types
 */
const LoadTypeSelector = ({ value, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="subsection-header">Load Type</h3>
      <div className="space-y-3">
        <label className="flex items-center cursor-pointer group">
          <input
            type="radio"
            name="loadType"
            className="h-4 w-4 text-[#3D7EDC] border-[#CCCCCC] focus:ring-[#3D7EDC] focus:ring-offset-0"
            checked={value === 2}
            onChange={() => onChange(2)}
          />
          <span className="ml-2 text-[14px] text-[#333333] group-hover:text-[#000000]">
            Residential (2 kPa)
          </span>
        </label>
        <label className="flex items-center cursor-pointer group">
          <input
            type="radio"
            name="loadType"
            className="h-4 w-4 text-[#3D7EDC] border-[#CCCCCC] focus:ring-[#3D7EDC] focus:ring-offset-0"
            checked={value === 3}
            onChange={() => onChange(3)}
          />
          <span className="ml-2 text-[14px] text-[#333333] group-hover:text-[#000000]">
            Commercial (3 kPa)
          </span>
        </label>
      </div>
    </div>
  );
};

export default LoadTypeSelector; 