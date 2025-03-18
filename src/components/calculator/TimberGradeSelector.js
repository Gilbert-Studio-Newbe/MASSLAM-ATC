"use client";

/**
 * TimberGradeSelector component for selecting timber grade
 * @param {string} value - The currently selected timber grade
 * @param {function} onChange - Function to call when selection changes
 */
const TimberGradeSelector = ({ value, onChange }) => {
  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700">Timber Grade</label>
      <select
        id="timberGrade"
        name="timberGrade"
        className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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