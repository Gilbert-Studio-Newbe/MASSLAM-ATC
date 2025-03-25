"use client";

/**
 * LoadTypeSelector component for selecting between residential and commercial load types
 */
const LoadTypeSelector = ({ value, onChange }) => {
  return (
    <div className="mb-8">
      <label className="block text-base text-gray-500 mb-4">
        Load Type
      </label>
      <div className="space-y-4">
        <label className="relative flex items-center">
          <input
            type="radio"
            name="loadType"
            className="h-5 w-5 text-blue-500 border-gray-300 focus:ring-blue-500"
            checked={value === 2}
            onChange={() => onChange(2)}
          />
          <span className="ml-3 block text-base">
            Residential (2 kPa)
          </span>
        </label>
        <label className="relative flex items-center">
          <input
            type="radio"
            name="loadType"
            className="h-5 w-5 text-blue-500 border-gray-300 focus:ring-blue-500"
            checked={value === 3}
            onChange={() => onChange(3)}
          />
          <span className="ml-3 block text-base">
            Commercial (3 kPa)
          </span>
        </label>
      </div>
    </div>
  );
};

export default LoadTypeSelector; 