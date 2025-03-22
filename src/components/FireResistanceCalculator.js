"use client";

import React, { useState, useEffect } from 'react';
import { calculateFireResistance, CHARRING_RATES } from '@/utils/masslamProperties';
import { TIMBER_PROPERTIES } from '@/utils/timberEngineering';
import { useBuildingData } from '@/contexts/BuildingDataContext';

/**
 * Helper function to get FRL minutes from string
 * @param {string} frl Fire rating level string
 * @returns {number} Number of minutes
 */
export function getFRLMinutes(frl) {
  if (frl === '0' || frl === 'none') return 0;
  return parseInt(frl.split('/')[0]) || 0;
}

/**
 * Calculate all fire resistance related parameters
 * @param {string} fireRating Fire rating level (none, 30/30/30, 60/60/60, 90/90/90, 120/120/120)
 * @param {number} charringRate Charring rate in mm/min
 * @returns {Object} Object with all fire parameters
 */
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

/**
 * Component to calculate and manage all fire resistance related parameters
 * This centralized component handles:
 * 1. Joist width based on FRL
 * 2. Concrete thickness based on FRL
 * 3. Fire resistance allowance calculations
 * 4. Charring rate determination
 */
export function FireResistanceCalculator({ 
  dimensions = { width: 90, depth: 240 }, 
  standalone = true 
}) {
  // Get building data context
  const { buildingData, updateBuildingData, updateMultipleProperties } = useBuildingData();
  
  // Local state for fire calculation results
  const [results, setResults] = useState(null);
  const [actualCharringRate, setActualCharringRate] = useState(CHARRING_RATES.masslam_sl33);
  const [fireParams, setFireParams] = useState({
    joistWidth: 120,
    concreteThickness: 100,
    fireAllowance: 0,
    fireRating: buildingData?.fireRating || 'none'
  });
  
  // Use ML38 charring rate from TIMBER_PROPERTIES
  useEffect(() => {
    const getML38CharringRate = () => {
      try {
        // Get charring rate from ML38 timber properties
        const ml38CharringRate = TIMBER_PROPERTIES.ML38?.charringRate || CHARRING_RATES.masslam_sl33;
        setActualCharringRate(ml38CharringRate);
        console.log(`Using ML38 charring rate: ${ml38CharringRate} mm/min`);
      } catch (error) {
        console.error('Error getting ML38 charring rate:', error);
        // Keep using the default value if there's an error
      }
    };
    
    getML38CharringRate();
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
    
    // Also calculate detailed fire resistance if showing standalone component
    if (standalone) {
      const minutes = getFRLMinutes(currentFireRating);
      if (minutes > 0 && dimensions.width > 0 && dimensions.depth > 0) {
        const fireResults = calculateFireResistance(actualCharringRate, dimensions, minutes);
        setResults(fireResults);
      } else {
        setResults(null);
      }
    }
  }, [buildingData?.fireRating, actualCharringRate, standalone, dimensions, updateBuildingData]);

  /**
   * Handle fire rating change
   * @param {string} newFireRating New fire rating value
   */
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

  // Only render UI if this is a standalone component
  if (!standalone) {
    return null;
  }

  // If no FRL is selected or dimensions are invalid, show a message
  if (!results) {
    return (
      <div className="apple-message p-4 text-center">
        <p className="apple-message-text text-lg">
          {buildingData?.fireRating === 'none' 
            ? 'No fire resistance level (FRL) selected.' 
            : 'Calculating fire resistance...'}
        </p>
        <p className="apple-message-subtext text-sm text-gray-500 mt-2">
          Using ML38 charring rate: {actualCharringRate} mm/min
        </p>
      </div>
    );
  }

  // Display the fire resistance results
  return (
    <div className="apple-fire-results p-4 bg-white rounded-lg shadow">
      <div className="apple-fire-results-grid grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="apple-fire-results-col space-y-3">
          <div className="apple-fire-results-item flex justify-between items-center border-b pb-2">
            <div className="apple-fire-results-label font-medium">Charring Rate:</div>
            <div className="apple-fire-results-value">{actualCharringRate} mm/min</div>
          </div>
          <div className="apple-fire-results-item flex justify-between items-center border-b pb-2">
            <div className="apple-fire-results-label font-medium">Required FRL:</div>
            <div className="apple-fire-results-value">{buildingData?.fireRating}</div>
          </div>
          <div className="apple-fire-results-item flex justify-between items-center border-b pb-2">
            <div className="apple-fire-results-label font-medium">Char Depth:</div>
            <div className="apple-fire-results-value">{results.charDepth.toFixed(1)} mm</div>
          </div>
        </div>
        
        <div className="apple-fire-results-col space-y-3">
          <div className="apple-fire-results-item flex justify-between items-center border-b pb-2">
            <div className="apple-fire-results-label font-medium">Effective Width:</div>
            <div className="apple-fire-results-value">{typeof results.effectiveWidth === 'number' ? results.effectiveWidth.toFixed(1) : 'N/A'} mm</div>
          </div>
          <div className="apple-fire-results-item flex justify-between items-center border-b pb-2">
            <div className="apple-fire-results-label font-medium">Effective Depth:</div>
            <div className="apple-fire-results-value">{typeof results.effectiveDepth === 'number' ? results.effectiveDepth.toFixed(1) : 'N/A'} mm</div>
          </div>
          <div className="apple-fire-results-item flex justify-between items-center border-b pb-2">
            <div className="apple-fire-results-label font-medium">Residual Area:</div>
            <div className="apple-fire-results-value">{results.residualPercentage.toFixed(1)}%</div>
          </div>
        </div>
      </div>
      
      <div className={`apple-fire-results-status mt-4 p-3 text-center rounded ${results.passes ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {results.passes 
          ? `✓ Passes ${buildingData?.fireRating} fire resistance requirement` 
          : `✗ Does not meet ${buildingData?.fireRating} fire resistance requirement`}
      </div>
    </div>
  );
}

// Create a custom hook for fire resistance calculations to use in other components
export function useFireResistance() {
  const { buildingData, updateBuildingData, updateMultipleProperties } = useBuildingData();
  const [actualCharringRate, setActualCharringRate] = useState(CHARRING_RATES.masslam_sl33);
  
  // Use ML38 charring rate from TIMBER_PROPERTIES
  useEffect(() => {
    try {
      // Get charring rate from ML38 timber properties
      const ml38CharringRate = TIMBER_PROPERTIES.ML38?.charringRate || CHARRING_RATES.masslam_sl33;
      setActualCharringRate(ml38CharringRate);
    } catch (error) {
      console.error('Error getting ML38 charring rate:', error);
    }
  }, []);
  
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
  
  return {
    handleFireRatingChange,
    calculateFireParams: (fireRating) => calculateFireParams(fireRating, actualCharringRate),
    actualCharringRate,
    fireParams: buildingData?.fireParams,
    fireRating: buildingData?.fireRating
  };
}

// Also export as default
export default FireResistanceCalculator;
