"use client";

/**
 * FireRatingSelector component for selecting fire rating levels
 * Displays a dropdown with Fire Resistance Level (FRL) options
 * and calculates concrete thickness based on selected rating
 */
const FireRatingSelector = ({ value, onChange }) => {
  /**
   * Calculate concrete thickness based on fire rating
   * @param {string} frl Fire rating level
   * @returns {number} Concrete thickness in mm
   */
  const getConcreteThickness = (frl) => {
    switch (frl) {
      case 'none':
      case '30/30/30':
      case '60/60/60':
        return 100; // 100mm for FRL 0/0/0, 30/30/30, 60/60/60
      case '90/90/90':
        return 110; // 110mm for FRL 90/90/90
      case '120/120/120':
        return 120; // 120mm for FRL 120/120/120
      default:
        return 100; // Default to 100mm
    }
  };

  return (
    <div className="apple-specs-row">
      <div className="apple-specs-label">Fire Rating (FRL)</div>
      <div className="apple-specs-value">
        <select 
          className="apple-input apple-select mb-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="none">None</option>
          <option value="30/30/30">30/30/30</option>
          <option value="60/60/60">60/60/60</option>
          <option value="90/90/90">90/90/90</option>
          <option value="120/120/120">120/120/120</option>
        </select>
        <p className="text-xs mt-1" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
          Concrete thickness: {getConcreteThickness(value)}mm (based on selected FRL)
        </p>
      </div>
    </div>
  );
};

export default FireRatingSelector; 