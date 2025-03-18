"use client";

/**
 * LoadTypeSelector component for selecting between residential and commercial load types
 */
const LoadTypeSelector = ({ value, onChange }) => {
  return (
    <div className="apple-specs-row">
      <div className="apple-specs-label">Load Type</div>
      <div className="apple-specs-value">
        <div className="flex flex-col space-y-3">
          <label className="inline-flex items-center">
            <input
              type="radio"
              id="residential"
              name="load"
              className="form-radio h-4 w-4 text-blue-600"
              checked={value === 2}
              onChange={() => onChange(2)}
            />
            <span className="ml-3">Residential (2 kPa)</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio h-5 w-5"
              style={{ accentColor: 'var(--apple-blue)' }}
              name="loadType"
              checked={value === 3}
              onChange={() => onChange(3)}
            />
            <span className="ml-3">Commercial (3 kPa)</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default LoadTypeSelector; 