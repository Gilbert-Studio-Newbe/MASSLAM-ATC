import React from 'react';
import { useBuildingData } from '../contexts/BuildingDataContext';

const BuildingForm = ({ onCalculate }) => {
  const { buildingData, updateBuildingData } = useBuildingData();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateBuildingData({ [name]: parseFloat(value) || 0 });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCalculate();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-6">Building Parameters</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Building Dimensions */}
          <div className="space-y-4">
            <h3 className="text-base font-medium">Building Dimensions</h3>
            <div>
              <label htmlFor="buildingLength" className="block text-sm font-medium text-gray-700 mb-1">
                Length (m)
              </label>
              <input
                type="number"
                id="buildingLength"
                name="buildingLength"
                value={buildingData.buildingLength}
                onChange={handleInputChange}
                min="1"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-masslam focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="buildingWidth" className="block text-sm font-medium text-gray-700 mb-1">
                Width (m)
              </label>
              <input
                type="number"
                id="buildingWidth"
                name="buildingWidth"
                value={buildingData.buildingWidth}
                onChange={handleInputChange}
                min="1"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-masslam focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="numFloors" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Floors
              </label>
              <input
                type="number"
                id="numFloors"
                name="numFloors"
                value={buildingData.numFloors}
                onChange={handleInputChange}
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-masslam focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="floorHeight" className="block text-sm font-medium text-gray-700 mb-1">
                Floor Height (m)
              </label>
              <input
                type="number"
                id="floorHeight"
                name="floorHeight"
                value={buildingData.floorHeight}
                onChange={handleInputChange}
                min="2"
                max="6"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-masslam focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Grid Configuration */}
          <div className="space-y-4">
            <h3 className="text-base font-medium">Grid Configuration</h3>
            <div>
              <label htmlFor="lengthwiseBays" className="block text-sm font-medium text-gray-700 mb-1">
                Lengthwise Bays
              </label>
              <input
                type="number"
                id="lengthwiseBays"
                name="lengthwiseBays"
                value={buildingData.lengthwiseBays}
                onChange={handleInputChange}
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-masslam focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="widthwiseBays" className="block text-sm font-medium text-gray-700 mb-1">
                Widthwise Bays
              </label>
              <input
                type="number"
                id="widthwiseBays"
                name="widthwiseBays"
                value={buildingData.widthwiseBays}
                onChange={handleInputChange}
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-masslam focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Joist Direction
              </label>
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="joistsRunLengthwise"
                    checked={buildingData.joistsRunLengthwise}
                    onChange={() => updateBuildingData({ joistsRunLengthwise: true })}
                    className="form-radio text-masslam"
                  />
                  <span className="ml-2">Lengthwise</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="joistsRunLengthwise"
                    checked={!buildingData.joistsRunLengthwise}
                    onChange={() => updateBuildingData({ joistsRunLengthwise: false })}
                    className="form-radio text-masslam"
                  />
                  <span className="ml-2">Widthwise</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-masslam text-white rounded-md hover:bg-masslam-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-masslam"
          >
            Calculate
          </button>
        </div>
      </form>
    </div>
  );
};

export default BuildingForm; 