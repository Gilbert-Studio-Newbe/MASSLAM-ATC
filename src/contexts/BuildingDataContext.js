"use client";

import { createContext, useState, useContext, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { calculateFireParams } from '@/components/FireResistanceCalculator';

// Default building configuration values
const defaultBuildingData = {
  // Building dimensions
  buildingLength: 12,
  buildingWidth: 12,
  numFloors: 2,
  floorHeight: 3.5,
  lengthwiseBays: 3,
  widthwiseBays: 3,
  
  // Load and fire parameters
  load: 2, // 2kPa (residential)
  loadType: 'Office',
  fireRating: 'none',
  
  // Material parameters
  timberGrade: 'ML56',
  
  // Joist parameters
  joistSpacing: 0.8, // 800mm
  joistsRunLengthwise: true,
  
  // Calculation results
  results: null,
  error: null,
  
  // Custom bay dimensions
  useCustomBayDimensions: false,
  customLengthwiseBayWidths: [4, 4, 4], // Default equal distribution
  customWidthwiseBayWidths: [4, 4, 4], // Default equal distribution
  
  // Add fireParams field with default values
  fireParams: {
    joistWidth: 120,
    concreteThickness: 100,
    fireAllowance: 0,
    fireRating: 'none',
    charringRate: 0.7
  },
};

// Create the context
const BuildingDataContext = createContext(undefined);

// Provider component
export function BuildingDataProvider({ children }) {
  const [buildingData, setBuildingData] = useLocalStorage('buildingData', defaultBuildingData);
  
  // Function to update a single property
  const updateBuildingData = (key, value) => {
    // Add special handling for results updates
    if (key === 'results') {
      console.log("JOIST DEBUG - Updating results in context:", {
        joistWidth: value?.joistSize?.width,
        joistDepth: value?.joistSize?.depth
      });
    }
    
    setBuildingData(prevData => ({
      ...prevData,
      [key]: value
    }));
  };
  
  // Specialized function for updating calculation results
  const updateCalculationResults = (results) => {
    console.log("JOIST DEBUG - Updating calculation results in context");
    
    if (!results) {
      console.warn("JOIST DEBUG - Attempted to update results with null value");
      return;
    }
    
    // Verify joist size data
    if (!results.joistSize) {
      console.warn("JOIST DEBUG - Results missing joistSize data");
    } else {
      console.log("JOIST DEBUG - New joist size:", results.joistSize);
    }
    
    // Set the results
    setBuildingData(prevData => ({
      ...prevData,
      results: {
        ...results,
        updatedAt: new Date().toISOString() // Add timestamp to force updates
      }
    }));
  };
  
  // Function to update multiple properties at once
  const updateMultipleProperties = (updates) => {
    setBuildingData(prevData => ({
      ...prevData,
      ...updates
    }));
  };
  
  // Function to reset to defaults
  const resetBuildingData = () => {
    setBuildingData(defaultBuildingData);
  };
  
  // Helper function to determine concrete thickness based on fire rating
  const getConcreteThickness = (fireRating) => {
    // This now just uses the fireParams from our centralized calculation
    return buildingData.fireParams?.concreteThickness || 100;
  };
  
  // Update concrete thickness when fire rating changes
  useEffect(() => {
    // Initialize fireParams if not already set
    if (!buildingData.fireParams) {
      const initialFireParams = calculateFireParams(buildingData.fireRating);
      updateBuildingData('fireParams', initialFireParams);
      updateBuildingData('concreteThickness', initialFireParams.concreteThickness);
    }
  }, []);
  
  // Specific handler for fire rating changes
  const handleFireRatingChange = (newFireRating) => {
    // This is now handled by the FireResistanceCalculator component
    updateBuildingData('fireRating', newFireRating);
  };
  
  // When lengthwiseBays or widthwiseBays change, update the custom bay arrays
  useEffect(() => {
    // Only update custom bay dimensions if not already using custom dimensions
    if (!buildingData.useCustomBayDimensions) {
      const equalLengthwiseBayWidth = buildingData.buildingLength / buildingData.lengthwiseBays;
      const equalWidthwiseBayWidth = buildingData.buildingWidth / buildingData.widthwiseBays;
      
      // Create arrays with equal distribution
      const newLengthwiseBayWidths = Array(buildingData.lengthwiseBays).fill(equalLengthwiseBayWidth);
      const newWidthwiseBayWidths = Array(buildingData.widthwiseBays).fill(equalWidthwiseBayWidth);
      
      setBuildingData(prevData => ({
        ...prevData,
        customLengthwiseBayWidths: newLengthwiseBayWidths,
        customWidthwiseBayWidths: newWidthwiseBayWidths
      }));
    }
  }, [buildingData.lengthwiseBays, buildingData.widthwiseBays, buildingData.buildingLength, buildingData.buildingWidth, buildingData.useCustomBayDimensions]);
  
  // Provide the context value
  const value = {
    buildingData,
    updateBuildingData,
    updateCalculationResults,
    updateMultipleProperties,
    resetBuildingData,
    getConcreteThickness,
    handleFireRatingChange
  };
  
  return (
    <BuildingDataContext.Provider value={value}>
      {children}
    </BuildingDataContext.Provider>
  );
}

// Custom hook for using the context
export function useBuildingData() {
  const context = useContext(BuildingDataContext);
  
  if (context === undefined) {
    throw new Error('useBuildingData must be used within a BuildingDataProvider');
  }
  
  return context;
}

export default BuildingDataContext; 