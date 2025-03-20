"use client";

import { createContext, useState, useContext, useEffect } from 'react';
import { useBuildingData } from './BuildingDataContext';
import { calculateFireResistance, CHARRING_RATES } from '@/utils/masslamProperties';
import { TIMBER_PROPERTIES } from '@/utils/timberEngineering';

// Helper function to get FRL minutes from string
export function getFRLMinutes(frl) {
  if (frl === '0' || frl === 'none') return 0;
  return parseInt(frl.split('/')[0]) || 0;
}

// Calculate all fire resistance related parameters
export function calculateFireParams(fireRating, charringRate = CHARRING_RATES.masslam_sl33) {
  let joistWidth, concreteThickness, fireAllowance;
  
  // Calculate fire allowance based on minutes
  const minutes = getFRLMinutes(fireRating);
  fireAllowance = minutes * charringRate;

  // Calculate joist width based on fire rating
  switch (fireRating) {
    case 'none':
      joistWidth = 120;
      concreteThickness = 100;
      fireAllowance = 0;
      break;
    case '30/30/30':
    case '60/60/60':
      joistWidth = 165;
      concreteThickness = 100;
      break;
    case '90/90/90':
      joistWidth = 205;
      concreteThickness = 110;
      break;
    case '120/120/120':
      joistWidth = 250;
      concreteThickness = 120;
      break;
    default:
      joistWidth = 120;
      concreteThickness = 100;
      fireAllowance = 0;
  }

  return {
    joistWidth,
    concreteThickness,
    fireAllowance,
    fireRating,
    charringRate
  };
}

// Create the context
const FireResistanceContext = createContext();

// Provider component
export function FireResistanceProvider({ children }) {
  const { buildingData, updateBuildingData, updateMultipleProperties } = useBuildingData();
  const [actualCharringRate, setActualCharringRate] = useState(CHARRING_RATES.masslam_sl33);
  const [fireParams, setFireParams] = useState({
    joistWidth: 120,
    concreteThickness: 100,
    fireAllowance: 0,
    fireRating: buildingData?.fireRating || 'none'
  });
  
  // Use ML38 charring rate from TIMBER_PROPERTIES
  useEffect(() => {
    try {
      // Get charring rate from ML38 timber properties
      const ml38CharringRate = TIMBER_PROPERTIES.ML38?.charringRate || CHARRING_RATES.masslam_sl33;
      setActualCharringRate(ml38CharringRate);
      console.log(`Using ML38 charring rate: ${ml38CharringRate} mm/min`);
    } catch (error) {
      console.error('Error getting ML38 charring rate:', error);
      // Keep using the default value if there's an error
    }
  }, []);
  
  // Calculate fire resistance parameters whenever fireRating changes
  useEffect(() => {
    const currentFireRating = buildingData?.fireRating || 'none';
    
    // Calculate all fire-related parameters
    const newFireParams = calculateFireParams(currentFireRating, actualCharringRate);
    
    // Update local state
    setFireParams(newFireParams);
    
    // Update building data context with fire parameters
    updateBuildingData('fireParams', newFireParams);
    
    console.log(`Fire parameters updated for ${currentFireRating}:`, newFireParams);
    
  }, [buildingData?.fireRating, actualCharringRate, updateBuildingData]);

  // Handle fire rating change
  const handleFireRatingChange = (newFireRating) => {
    // Calculate new fire parameters
    const newFireParams = calculateFireParams(newFireRating, actualCharringRate);
    
    // Update both fire rating and all related parameters at once
    updateMultipleProperties({
      fireRating: newFireRating,
      concreteThickness: newFireParams.concreteThickness,
      fireParams: newFireParams
    });
    
    console.log(`Fire rating changed to ${newFireRating}, params updated:`, newFireParams);
  };

  // Calculate fire resistance for specific dimensions
  const calculateFireResistanceForDimensions = (dimensions, fireRating = buildingData?.fireRating) => {
    const minutes = getFRLMinutes(fireRating);
    if (minutes > 0 && dimensions.width > 0 && dimensions.depth > 0) {
      return calculateFireResistance(actualCharringRate, dimensions, minutes);
    }
    return null;
  };

  // Provide the context value
  const value = {
    fireParams,
    actualCharringRate,
    handleFireRatingChange,
    calculateFireParams: (fireRating) => calculateFireParams(fireRating, actualCharringRate),
    calculateFireResistanceForDimensions,
    getFRLMinutes
  };

  return (
    <FireResistanceContext.Provider value={value}>
      {children}
    </FireResistanceContext.Provider>
  );
}

// Custom hook for using the context
export function useFireResistance() {
  const context = useContext(FireResistanceContext);
  
  if (context === undefined) {
    throw new Error('useFireResistance must be used within a FireResistanceProvider');
  }
  
  return context;
}

export default FireResistanceContext; 