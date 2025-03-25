"use client";

/**
 * TimberGradeSelector component for selecting timber grade
 * @param {string} value - The currently selected timber grade
 * @param {function} onChange - Function to call when selection changes
 */
const TimberGradeSelector = ({ value, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="subsection-header">Timber Grade</h3>
      <select
        id="timberGrade"
        name="timberGrade"
        className="input-field appearance-none bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="ML38">ML38</option>
        <option value="ML44">ML44</option>
        <option value="ML50">ML50</option>
        <option value="ML56">ML56</option>
        <option value="ML62">ML62</option>
        <option value="ML68">ML68</option>
        <option value="ML74">ML74</option>
        <option value="ML80">ML80</option>
      </select>
    </div>
  );
};

export default TimberGradeSelector; 