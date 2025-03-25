"use client";

import { createContext, useState, useContext, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { calculateFireParams } from '@/components/FireResistanceCalculator';

// Default building configuration values
const defaultBuildingData = {
  // Building dimensions
  buildingLength: 20,
  buildingWidth: 15,
  numFloors: 4,
  floorHeight: 3.5,
  lengthwiseBays: 4,
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
  
  // Maximum bay span
  maxBaySpan: 9.0,
  
  // Calculation results
  results: null,
  error: null,
  
  // Custom bay dimensions - set to true by default
  useCustomBayDimensions: true,
  customLengthwiseBayWidths: [5.0, 5.0, 5.0, 5.0], // All bays 5.0m to match building length (20m)
  customWidthwiseBayWidths: [5.0, 5.0, 5.0], // All bays 5.0m to match building width (15m)
  
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
  
  // Ensure bay dimensions always match building dimensions
  useEffect(() => {
    // Function to round to 2 decimal places for display
    const roundTwoDecimals = (num) => Math.round(num * 100) / 100;
    
    if (buildingData.useCustomBayDimensions) {
      // Check and fix lengthwise bay widths
      if (buildingData.customLengthwiseBayWidths?.length !== buildingData.lengthwiseBays) {
        const avgWidth = buildingData.buildingLength / buildingData.lengthwiseBays;
        const newWidths = Array(buildingData.lengthwiseBays).fill(0).map(() => roundTwoDecimals(avgWidth));
        
        // Correct any rounding error by adjusting the last bay
        const totalWidth = newWidths.reduce((sum, width) => sum + width, 0);
        const difference = roundTwoDecimals(buildingData.buildingLength - totalWidth);
        
        if (Math.abs(difference) > 0.001) {
          newWidths[newWidths.length - 1] = roundTwoDecimals(newWidths[newWidths.length - 1] + difference);
        }
        
        updateBuildingData('customLengthwiseBayWidths', newWidths);
      } else {
        // Check if total matches the building length
        const totalLength = buildingData.customLengthwiseBayWidths.reduce((sum, width) => sum + width, 0);
        if (Math.abs(totalLength - buildingData.buildingLength) > 0.01) {
          // Fix the mismatch by adjusting all bays proportionally
          const scaleFactor = buildingData.buildingLength / totalLength;
          const newWidths = [...buildingData.customLengthwiseBayWidths].map(
            width => roundTwoDecimals(width * scaleFactor)
          );
          
          // Correct any remaining rounding error by adjusting the last bay
          const newTotal = newWidths.reduce((sum, width) => sum + width, 0);
          const finalDifference = roundTwoDecimals(buildingData.buildingLength - newTotal);
          
          if (Math.abs(finalDifference) > 0.001) {
            newWidths[newWidths.length - 1] = roundTwoDecimals(newWidths[newWidths.length - 1] + finalDifference);
          }
          
          updateBuildingData('customLengthwiseBayWidths', newWidths);
        }
      }
      
      // Check and fix widthwise bay widths
      if (buildingData.customWidthwiseBayWidths?.length !== buildingData.widthwiseBays) {
        const avgWidth = buildingData.buildingWidth / buildingData.widthwiseBays;
        const newWidths = Array(buildingData.widthwiseBays).fill(0).map(() => roundTwoDecimals(avgWidth));
        
        // Correct any rounding error by adjusting the last bay
        const totalWidth = newWidths.reduce((sum, width) => sum + width, 0);
        const difference = roundTwoDecimals(buildingData.buildingWidth - totalWidth);
        
        if (Math.abs(difference) > 0.001) {
          newWidths[newWidths.length - 1] = roundTwoDecimals(newWidths[newWidths.length - 1] + difference);
        }
        
        updateBuildingData('customWidthwiseBayWidths', newWidths);
      } else {
        // Check if total matches the building width
        const totalWidth = buildingData.customWidthwiseBayWidths.reduce((sum, width) => sum + width, 0);
        if (Math.abs(totalWidth - buildingData.buildingWidth) > 0.01) {
          // Fix the mismatch by adjusting all bays proportionally
          const scaleFactor = buildingData.buildingWidth / totalWidth;
          const newWidths = [...buildingData.customWidthwiseBayWidths].map(
            width => roundTwoDecimals(width * scaleFactor)
          );
          
          // Correct any remaining rounding error by adjusting the last bay
          const newTotal = newWidths.reduce((sum, width) => sum + width, 0);
          const finalDifference = roundTwoDecimals(buildingData.buildingWidth - newTotal);
          
          if (Math.abs(finalDifference) > 0.001) {
            newWidths[newWidths.length - 1] = roundTwoDecimals(newWidths[newWidths.length - 1] + finalDifference);
          }
          
          updateBuildingData('customWidthwiseBayWidths', newWidths);
        }
      }
    }
  }, [buildingData.lengthwiseBays, buildingData.widthwiseBays, buildingData.buildingLength, buildingData.buildingWidth, buildingData.useCustomBayDimensions]);
  
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
    // Create a fresh copy of defaultBuildingData to ensure we're not using cached values
    const freshDefaults = {
      // Building dimensions
      buildingLength: 20,
      buildingWidth: 15,
      numFloors: 4,
      floorHeight: 3.5,
      lengthwiseBays: 4,
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
      
      // Maximum bay span
      maxBaySpan: 9.0,
      
      // Calculation results
      results: null,
      error: null,
      
      // Custom bay dimensions - set to true by default
      useCustomBayDimensions: true,
      customLengthwiseBayWidths: [5.0, 5.0, 5.0, 5.0], // All bays 5.0m to match building length (20m)
      customWidthwiseBayWidths: [5.0, 5.0, 5.0], // All bays 5.0m to match building width (15m)
      
      // Add fireParams field with default values
      fireParams: {
        joistWidth: 120,
        concreteThickness: 100,
        fireAllowance: 0,
        fireRating: 'none',
        charringRate: 0.7
      },
    };
    
    // Clear any cached data
    localStorage.removeItem('buildingData');
    
    // Set the fresh defaults
    setBuildingData(freshDefaults);
    
    console.log('Reset to fresh defaults:', freshDefaults);
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
    // Log the state for debugging
    console.log('Bay count changed:', {
      lengthwiseBays: buildingData.lengthwiseBays, 
      widthwiseBays: buildingData.widthwiseBays,
      useCustom: buildingData.useCustomBayDimensions
    });
    
    // Helper function to round to nearest 0.05
    const roundToNearest = (value, nearest = 0.05) => {
      return Math.round(value / nearest) * nearest;
    };
    
    // Minimum bay width (in meters)
    const MIN_BAY_WIDTH = 0.5;
    const MAX_BAY_WIDTH = buildingData.maxBaySpan;
    
    // Ensure the bay counts are positive integers to avoid array length errors
    const safeTypedLengthwiseBays = Math.max(1, Math.floor(buildingData.lengthwiseBays) || 1);
    const safeTypedWidthwiseBays = Math.max(1, Math.floor(buildingData.widthwiseBays) || 1);
    
    // Check if we need to update the bay width arrays
    const needToUpdateLengthwise = safeTypedLengthwiseBays !== buildingData.customLengthwiseBayWidths.length;
    const needToUpdateWidthwise = safeTypedWidthwiseBays !== buildingData.customWidthwiseBayWidths.length;
    
    // Only update if the number of bays has changed
    if (!needToUpdateLengthwise && !needToUpdateWidthwise) {
      return;
    }
    
    // Default bay width value (3.0m to match building dimensions better)
    const DEFAULT_BAY_WIDTH = 3.0;
    
    // Create arrays with equal distribution
    let newLengthwiseBayWidths = buildingData.customLengthwiseBayWidths;
    let newWidthwiseBayWidths = buildingData.customWidthwiseBayWidths;
    
    // Update lengthwise bays if needed
    if (needToUpdateLengthwise) {
      // Create a new array using the default bay width
      newLengthwiseBayWidths = Array(safeTypedLengthwiseBays).fill(DEFAULT_BAY_WIDTH);
      
      // Ensure total matches building length
      const totalLength = DEFAULT_BAY_WIDTH * safeTypedLengthwiseBays;
      if (Math.abs(totalLength - buildingData.buildingLength) > 0.1) {
        // Adjust bay widths proportionally to match building length
        const adjustmentFactor = buildingData.buildingLength / totalLength;
        newLengthwiseBayWidths = newLengthwiseBayWidths.map(width => 
          roundToNearest(Math.max(MIN_BAY_WIDTH, Math.min(MAX_BAY_WIDTH, width * adjustmentFactor)))
        );
      }
    }
    
    // Update widthwise bays if needed
    if (needToUpdateWidthwise) {
      // Create a new array using the default bay width
      newWidthwiseBayWidths = Array(safeTypedWidthwiseBays).fill(DEFAULT_BAY_WIDTH);
      
      // Ensure total matches building width
      const totalWidth = DEFAULT_BAY_WIDTH * safeTypedWidthwiseBays;
      if (Math.abs(totalWidth - buildingData.buildingWidth) > 0.1) {
        // Adjust bay widths proportionally to match building width
        const adjustmentFactor = buildingData.buildingWidth / totalWidth;
        newWidthwiseBayWidths = newWidthwiseBayWidths.map(width => 
          roundToNearest(Math.max(MIN_BAY_WIDTH, Math.min(MAX_BAY_WIDTH, width * adjustmentFactor)))
        );
      }
    }
    
    // Log the bay dimensions for debugging
    console.log('New bay dimensions:', {
      lengthwiseBayWidths: newLengthwiseBayWidths,
      lengthwiseTotal: newLengthwiseBayWidths.reduce((sum, w) => sum + w, 0),
      targetLength: buildingData.buildingLength,
      widthwiseBayWidths: newWidthwiseBayWidths, 
      widthwiseTotal: newWidthwiseBayWidths.reduce((sum, w) => sum + w, 0),
      targetWidth: buildingData.buildingWidth
    });
    
    // Update only the bay width arrays, preserving the custom mode setting
    setBuildingData(prevData => ({
      ...prevData,
      customLengthwiseBayWidths: newLengthwiseBayWidths,
      customWidthwiseBayWidths: newWidthwiseBayWidths,
      // Keep the current useCustomBayDimensions value
      useCustomBayDimensions: prevData.useCustomBayDimensions
    }));
    
  }, [buildingData.lengthwiseBays, buildingData.widthwiseBays, buildingData.buildingLength, buildingData.buildingWidth, buildingData.maxBaySpan, buildingData.customLengthwiseBayWidths, buildingData.customWidthwiseBayWidths]);
  
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