"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useBuildingData } from '../contexts/BuildingDataContext';
import { 
  calculateJoistSize, 
  calculateMultiFloorBeamSize,
  calculateMultiFloorColumnSize,
  calculateStructure,
  calculateTimberWeight,
  calculateCarbonSavings
} from '../utils/timber-calculator';

export function useFormState() {
  // Use the building data context
  const { 
    buildingData,
    updateBuildingData,
    updateCalculationResults,
    updateMultipleProperties
  } = useBuildingData();

  // Local state
  const [error, setError] = useState(null);
  const [results, setResults] = useState(buildingData.results || null);
  const [isMobile, setIsMobile] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [csvLoadingErrors, setCsvLoadingErrors] = useState({});
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [propertiesLoaded, setPropertiesLoaded] = useState(false);

  // Reference for first render
  const firstRender = useRef(true);

  // Set initial joist direction based on building dimensions
  useEffect(() => {
    // By default, joists should span the shorter distance
    // This is just for initial setup - after that, the user can toggle
    // Only set the direction on the first render, not when dimensions change
    if (firstRender.current) {
      updateBuildingData('joistsRunLengthwise', buildingData.buildingWidth > buildingData.buildingLength);
      firstRender.current = false;
    }
  }, [buildingData.buildingLength, buildingData.buildingWidth, updateBuildingData]);

  // Add window resize listener to detect mobile devices
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Effect to check and update bay counts when building dimensions change
  useEffect(() => {
    // Check if bay counts need adjustment based on building dimensions and maxBaySpan
    const minLengthwiseBays = Math.ceil(buildingData.buildingLength / buildingData.maxBaySpan);
    const minWidthwiseBays = Math.ceil(buildingData.buildingWidth / buildingData.maxBaySpan);
    
    // Get current bay counts
    const currentLengthwiseBays = buildingData.lengthwiseBays;
    const currentWidthwiseBays = buildingData.widthwiseBays;
    
    // Initialize an update object for changes
    const updates = {};
    let needToUpdate = false;
    
    // Check if lengthwise bays need adjustment
    if (currentLengthwiseBays < minLengthwiseBays) {
      console.log(`Adjusting lengthwiseBays from ${currentLengthwiseBays} to ${minLengthwiseBays} after dimension change`);
      updates.lengthwiseBays = minLengthwiseBays;
      needToUpdate = true;
    }
    
    // Check if widthwise bays need adjustment
    if (currentWidthwiseBays < minWidthwiseBays) {
      console.log(`Adjusting widthwiseBays from ${currentWidthwiseBays} to ${minWidthwiseBays} after dimension change`);
      updates.widthwiseBays = minWidthwiseBays;
      needToUpdate = true;
    }
    
    // Apply updates if needed
    if (needToUpdate) {
      // Update the building data first
      updateMultipleProperties(updates);
      
      // Show a notification about the adjustment
      // Note: We're not using the notification system here because
      // this component doesn't have access to it. The notification
      // will be shown by a higher-level component.
      
      // Send a special event that can be caught by the parent component
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('bay-adjustment', { 
          detail: {
            message: `The number of bays has been increased to maintain a maximum span of ${buildingData.maxBaySpan}m.`
          }
        });
        window.dispatchEvent(event);
      }
    }
  }, [
    buildingData.buildingLength, 
    buildingData.buildingWidth, 
    buildingData.maxBaySpan,
    buildingData.lengthwiseBays,
    buildingData.widthwiseBays,
    updateMultipleProperties
  ]);

  // Define our helper functions first before they're used
  const roundToNearest = (value, nearest = 0.05) => {
    return Math.round(value / nearest) * nearest;
  };

  // Define calculateResults FIRST to avoid circular dependency
  const calculateResults = useCallback(() => {
    try {
      setError(null);
      
      // Start debug logs for tracking calculation flow
      console.log("[FORM DEBUG] ========== CALCULATION TRIGGERED ==========");
      console.log("[FORM DEBUG] Form state when calculation triggered:", {
        buildingLength: buildingData.buildingLength,
        buildingWidth: buildingData.buildingWidth,
        numFloors: buildingData.numFloors,
        lengthwiseBays: buildingData.lengthwiseBays,
        widthwiseBays: buildingData.widthwiseBays,
        joistsRunLengthwise: buildingData.joistsRunLengthwise,
        joistSpacing: buildingData.joistSpacing,
        load: buildingData.load,
        fireRating: buildingData.fireRating,
        deflectionLimit: buildingData.deflectionLimit,
        safetyFactor: buildingData.safetyFactor,
        useCustomBayDimensions: buildingData.useCustomBayDimensions,
        maxBaySpan: buildingData.maxBaySpan,
        resultsCached: buildingData.results !== null
      });
      
      console.log("[FORM] Starting calculations");
      console.log("[FORM] Building data:", JSON.stringify({
        length: buildingData.buildingLength,
        width: buildingData.buildingWidth,
        joistSpacing: buildingData.joistSpacing,
        joistsRunLengthwise: buildingData.joistsRunLengthwise,
        load: buildingData.load
      }));
      
      // Extract values from building data
      const joistSpacing = buildingData.joistSpacing;
      
      // Calculate the results using our new modular calculator
      console.log("[FORM DEBUG] About to call calculateStructure with buildingData");
      const results = calculateStructure(buildingData);
      
      console.log("[FORM] Calculation finished. Results:", JSON.stringify({
        joistWidth: results.joistSize?.width,
        joistDepth: results.joistSize?.depth,
        interiorBeamWidth: results.beamSize?.width,
        interiorBeamDepth: results.beamSize?.depth,
        columnWidth: results.columnSize?.width,
        columnDepth: results.columnSize?.depth
      }));
      
      // Calculate timber weight 
      const weightResults = calculateTimberWeight(
        results.joistSize,
        results.beamSize,
        results.edgeBeamSize,
        results.columnSize,
        buildingData
      );
      
      // Calculate carbon savings
      const carbonResults = calculateCarbonSavings(weightResults);
      
      // Combine all results
      const combinedResults = {
        joistSize: results.joistSize,
        beamSize: results.beamSize,
        edgeBeamSize: results.edgeBeamSize,
        columnSize: results.columnSize,
        timberWeight: weightResults.weight,
        timberVolume: weightResults.totalVolume,
        elementVolumes: {
          joists: results.elementVolumes?.joists || weightResults.elements.joists.volume,
          beams: results.elementVolumes?.beams || weightResults.elements.beams.volume,
          columns: results.elementVolumes?.columns || weightResults.elements.columns.volume
        },
        elementCounts: {
          joists: results.elementCounts?.joists || weightResults.elements.joists.count,
          beams: results.elementCounts?.beams || weightResults.elements.beams.count,
          columns: results.elementCounts?.columns || weightResults.elements.columns.count
        },
        carbonSavings: carbonResults.carbonSavings,
        carbonStorage: carbonResults.carbonStorage,
        // Include costs if provided by the structure calculation
        costs: results.costs || null
      };
      
      // Update results in state
      console.log("[FORM DEBUG] About to update local state with results");
      console.log("[FORM DEBUG] Combined results object:", JSON.stringify(combinedResults, null, 2));
      setResults(combinedResults);
      
      // Update context with calculated results
      console.log("[FORM DEBUG] About to update context with results");
      updateCalculationResults(combinedResults);
      
      console.log("[FORM] Calculation completed:", combinedResults);
      console.log("[FORM DEBUG] elementVolumes:", combinedResults.elementVolumes);
      console.log("[FORM DEBUG] elementCounts:", combinedResults.elementCounts);
      console.log("[FORM DEBUG] ========== CALCULATION COMPLETE ==========");
    } catch (error) {
      console.error("[FORM] Error in calculations:", error);
      setError(`Error calculating results: ${error.message}`);
    }
  }, [
    buildingData,
    updateCalculationResults
  ]);

  // -------- Form handlers ---------

  // Handle form field changes
  const handleInputChange = useCallback((field, value) => {
    // Convert value to number if it's a numeric field
    const numericFields = [
      'buildingLength', 'buildingWidth', 'numFloors', 'floorHeight',
      'lengthwiseBays', 'widthwiseBays', 'load', 'joistSpacing', 'maxBaySpan'
    ];
    
    if (numericFields.includes(field)) {
      value = parseFloat(value) || 0;
    }
    
    // Special handling for bay count changes to enforce maximum span constraint
    if (field === 'lengthwiseBays' || field === 'widthwiseBays') {
      // Convert to integer for bay counts
      value = Math.floor(value);
      
      // Get the relevant building dimension for this bay direction
      const relevantDimension = field === 'lengthwiseBays' 
        ? buildingData.buildingLength 
        : buildingData.buildingWidth;
      
      // Calculate minimum required bays based on maxBaySpan
      const minRequiredBays = Math.ceil(relevantDimension / buildingData.maxBaySpan);
      
      // Ensure bay count isn't below the minimum required
      if (value < minRequiredBays) {
        console.log(`Adjusting ${field} from ${value} to ${minRequiredBays} to maintain max span of ${buildingData.maxBaySpan}m`);
        
        // Show notification about the adjustment using the event system
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('bay-adjustment', { 
            detail: {
              message: `The minimum number of bays required for this dimension is ${minRequiredBays} to maintain a maximum span of ${buildingData.maxBaySpan}m.`
            }
          });
          window.dispatchEvent(event);
        }
        
        // Set the value to the minimum required
        value = minRequiredBays;
      }
    }
    
    console.log(`Updating ${field} to ${value}`);
    updateBuildingData(field, value);
  }, [buildingData.buildingLength, buildingData.buildingWidth, buildingData.maxBaySpan, updateBuildingData]);

  // Handle load change
  const handleLoadChange = useCallback((value) => {
    console.log(`Setting load to ${value} kPa`);
    updateBuildingData('load', value);
  }, [updateBuildingData]);

  // Handle fire rating change
  const onFireRatingChange = useCallback((fireRating) => {
    console.log(`Setting fire rating to ${fireRating}`);
    updateBuildingData('fireRating', fireRating);
  }, [updateBuildingData]);

  // Toggle Custom Bay Dimensions on/off
  const handleToggleCustomBayDimensions = useCallback((newValue) => {
    console.log('Toggling custom bay dimensions:', { 
      currentValue: buildingData.useCustomBayDimensions,
      newValue
    });
    
    // When turning off custom dimensions, reset to equal distribution
    if (!newValue) {
      // Helper function to round to nearest 0.05
      const roundToNearest = (value, nearest = 0.05) => {
        return Math.round(value / nearest) * nearest;
      };
      
      // Calculate evenly distributed bay widths
      const lengthwiseBays = Math.max(1, buildingData.lengthwiseBays);
      const widthwiseBays = Math.max(1, buildingData.widthwiseBays);
      
      let equalLengthwiseBayWidth = roundToNearest(buildingData.buildingLength / lengthwiseBays);
      let equalWidthwiseBayWidth = roundToNearest(buildingData.buildingWidth / widthwiseBays);
      
      // Ensure minimum bay width (0.5m) and maximum bay width (maxBaySpan)
      const MIN_BAY_WIDTH = 0.5;
      const MAX_BAY_WIDTH = buildingData.maxBaySpan;
      
      equalLengthwiseBayWidth = Math.max(MIN_BAY_WIDTH, Math.min(MAX_BAY_WIDTH, equalLengthwiseBayWidth));
      equalWidthwiseBayWidth = Math.max(MIN_BAY_WIDTH, Math.min(MAX_BAY_WIDTH, equalWidthwiseBayWidth));
      
      // Create new arrays with equal distribution
      const newLengthwiseBayWidths = Array(lengthwiseBays).fill(equalLengthwiseBayWidth);
      const newWidthwiseBayWidths = Array(widthwiseBays).fill(equalWidthwiseBayWidth);
      
      // Adjust the last bay to ensure total exactly matches building dimensions
      const totalLengthwise = equalLengthwiseBayWidth * lengthwiseBays;
      const totalWidthwise = equalWidthwiseBayWidth * widthwiseBays;
      
      if (Math.abs(totalLengthwise - buildingData.buildingLength) > 0.01) {
        const lastIndex = lengthwiseBays - 1;
        const difference = buildingData.buildingLength - totalLengthwise;
        const lastBaySize = equalLengthwiseBayWidth + difference;
        
        if (lastBaySize >= MIN_BAY_WIDTH && lastBaySize <= MAX_BAY_WIDTH) {
          newLengthwiseBayWidths[lastIndex] = roundToNearest(lastBaySize);
        }
      }
      
      if (Math.abs(totalWidthwise - buildingData.buildingWidth) > 0.01) {
        const lastIndex = widthwiseBays - 1;
        const difference = buildingData.buildingWidth - totalWidthwise;
        const lastBaySize = equalWidthwiseBayWidth + difference;
        
        if (lastBaySize >= MIN_BAY_WIDTH && lastBaySize <= MAX_BAY_WIDTH) {
          newWidthwiseBayWidths[lastIndex] = roundToNearest(lastBaySize);
        }
      }
      
      console.log('Resetting to default bay dimensions:', {
        lengthwise: newLengthwiseBayWidths,
        widthwise: newWidthwiseBayWidths
      });
      
      // Update both arrays and the flag at once to avoid intermediate renders
      updateMultipleProperties({
        customLengthwiseBayWidths: newLengthwiseBayWidths,
        customWidthwiseBayWidths: newWidthwiseBayWidths,
        useCustomBayDimensions: newValue
      });
    } else {
      // Just update the flag when enabling custom dimensions
      updateBuildingData('useCustomBayDimensions', newValue);
    }
  }, [
    buildingData.useCustomBayDimensions, 
    buildingData.buildingLength, 
    buildingData.buildingWidth,
    buildingData.lengthwiseBays, 
    buildingData.widthwiseBays,
    buildingData.maxBaySpan,
    updateBuildingData,
    updateMultipleProperties
  ]);

  // Handle lengthwise bay width change
  const handleLengthwiseBayWidthChange = useCallback((index, value) => {
    const parsedValue = parseFloat(value);
    
    // Validate input value
    if (isNaN(parsedValue) || parsedValue <= 0) {
      console.warn(`Invalid bay width value: ${value}`);
      return;
    }
    
    // Round to nearest 0.05
    const roundToNearest = (value, nearest = 0.05) => {
      return Math.round(value / nearest) * nearest;
    };
    
    // Enforce maximum bay span limit
    const maxAllowedSpan = buildingData.maxBaySpan;
    const roundedValue = Math.min(maxAllowedSpan, roundToNearest(parsedValue));
    
    // If value exceeds max span, log a warning
    if (parsedValue > maxAllowedSpan) {
      console.warn(`Bay width ${parsedValue} exceeds maximum allowed span of ${maxAllowedSpan}. Using ${roundedValue} instead.`);
    }
    
    // Get current bay widths
    const currentWidths = [...buildingData.customLengthwiseBayWidths];
    
    // Calculate how much we need to adjust
    const oldValue = currentWidths[index];
    const delta = roundedValue - oldValue;
    
    // If no change, exit early
    if (Math.abs(delta) < 0.001) return;
    
    // Create a copy for the new widths
    const newWidths = [...currentWidths];
    newWidths[index] = roundedValue;
    
    // Calculate how much space remains for other bays
    const remainingLength = buildingData.buildingLength - roundedValue;
    const otherBaysCount = newWidths.length - 1;
    
    // If there are other bays to distribute the remaining length
    if (otherBaysCount > 0) {
      // Get indices of all other bays
      const otherBaysIndices = Array.from({ length: currentWidths.length }, (_, i) => i).filter(i => i !== index);
      
      // Calculate how much length each remaining bay should have (equal distribution)
      const equalLength = roundToNearest(remainingLength / otherBaysCount);
      
      // Check if the equal length would be below minimum
      if (equalLength >= 0.5) {
        // Set each other bay to the equal length
        otherBaysIndices.forEach(i => {
          newWidths[i] = equalLength;
        });
        
        // Ensure the total is exactly equal to the building length by adjusting the last bay
        const currentTotal = newWidths.reduce((sum, width) => sum + width, 0);
        const lastAdjustBayIndex = otherBaysIndices[otherBaysIndices.length - 1];
        const adjustment = buildingData.buildingLength - currentTotal;
        
        if (Math.abs(adjustment) > 0.01) {
          const adjustedWidth = roundToNearest(newWidths[lastAdjustBayIndex] + adjustment);
          
          // Only apply the adjustment if it keeps the bay width valid
          if (adjustedWidth >= 0.5 && adjustedWidth <= maxAllowedSpan) {
            newWidths[lastAdjustBayIndex] = adjustedWidth;
          } else {
            // If adjustment would make the bay invalid, distribute any small rounding errors
            // across all other bays
            const smallAdjustment = adjustment / otherBaysCount;
            otherBaysIndices.forEach(i => {
              const adjustedBayWidth = roundToNearest(newWidths[i] + smallAdjustment);
              // Ensure we don't exceed max span
              newWidths[i] = Math.min(maxAllowedSpan, adjustedBayWidth);
            });
          }
        }
      } else {
        // If equal distribution would make bays too small, 
        // set all other bays to minimum width (0.5m)
        otherBaysIndices.forEach(i => {
          newWidths[i] = 0.5;
        });
        
        // Check if the total now fits within the building length
        const newTotal = newWidths.reduce((sum, width) => sum + width, 0);
        
        // If the total exceeds the building length, we need to reduce the input bay
        if (newTotal > buildingData.buildingLength) {
          const excess = newTotal - buildingData.buildingLength;
          const newInputBayWidth = roundToNearest(roundedValue - excess);
          
          // Only apply if it keeps the bay width valid
          if (newInputBayWidth >= 0.5) {
            newWidths[index] = newInputBayWidth;
            console.warn(`Adjusted input bay from ${roundedValue}m to ${newInputBayWidth}m to fit within building length`);
          } else {
            // If we can't adjust further, distribute evenly
            const evenWidth = roundToNearest(buildingData.buildingLength / newWidths.length);
            newWidths.fill(Math.min(maxAllowedSpan, evenWidth));
            console.warn(`Cannot accommodate the requested bay width. Reset to even distribution of ${evenWidth}m per bay.`);
          }
        }
      }
    } else {
      // If there's only one bay, it must equal the building length
      newWidths[index] = Math.min(maxAllowedSpan, roundToNearest(buildingData.buildingLength));
      
      // If building length exceeds max span, warn the user
      if (buildingData.buildingLength > maxAllowedSpan) {
        console.warn(`Building length (${buildingData.buildingLength}m) exceeds maximum bay span (${maxAllowedSpan}m). Limiting bay to ${maxAllowedSpan}m.`);
      }
    }
    
    // One final check to cap all bay widths at maxAllowedSpan
    for (let i = 0; i < newWidths.length; i++) {
      if (newWidths[i] > maxAllowedSpan) {
        console.warn(`Bay width ${newWidths[i]} exceeds maximum span of ${maxAllowedSpan}. Capping to maximum.`);
        newWidths[i] = maxAllowedSpan;
      }
    }
    
    // CRITICAL: Ensure the total EXACTLY matches building length, even if we have many max spans
    const absoluteFinalTotal = newWidths.reduce((sum, width) => sum + width, 0);
    if (Math.abs(absoluteFinalTotal - buildingData.buildingLength) > 0.01) {
      console.warn(`CRITICAL: Final bay width total (${absoluteFinalTotal}m) still doesn't match building length (${buildingData.buildingLength}m).`);
      
      // Find adjustable bays (those not at max span and not the one being changed)
      const maxSpanBays = newWidths.map((w, i) => ({ width: w, index: i, isMax: w >= maxAllowedSpan - 0.01 }));
      const adjustableBays = maxSpanBays.filter(bay => !bay.isMax);
      
      if (adjustableBays.length > 0) {
        // We have adjustable bays - distribute the difference among them proportionally
        const difference = buildingData.buildingLength - absoluteFinalTotal;
        const totalAdjustableWidth = adjustableBays.reduce((sum, bay) => sum + bay.width, 0);
        
        // Apply proportional adjustment to each non-max bay
        adjustableBays.forEach(bay => {
          const proportion = bay.width / totalAdjustableWidth;
          const adjustment = difference * proportion;
          const newWidth = Math.max(0.5, bay.width + adjustment);
          newWidths[bay.index] = roundToNearest(newWidth);
        });
      } else if (index >= 0 && newWidths[index] < maxAllowedSpan) {
        // If only the input bay can be adjusted, adjust it
        newWidths[index] = Math.min(maxAllowedSpan, 
                                   Math.max(0.5, roundToNearest(newWidths[index] + (buildingData.buildingLength - absoluteFinalTotal))));
      } else {
        // Extreme case: all bays are at max span or minimum, and we still don't match the total
        // Force the total by adjusting one bay slightly below max or above min
        const forcedBayIndex = maxSpanBays.find(bay => bay.isMax)?.index ?? 0;
        
        // Calculate how much we need to adjust this bay to make the total correct
        const otherBaysTotal = newWidths.reduce((sum, width, i) => 
          i === forcedBayIndex ? sum : sum + width, 0);
        const requiredWidth = buildingData.buildingLength - otherBaysTotal;
        
        // Set the bay to this required width, clamped between min and max
        newWidths[forcedBayIndex] = roundToNearest(
          Math.min(maxAllowedSpan, Math.max(0.5, requiredWidth))
        );
      }
    }
    
    // Verify the final result
    const verifyTotal = newWidths.reduce((sum, width) => sum + width, 0);
    if (Math.abs(verifyTotal - buildingData.buildingLength) > 0.05) {
      console.error(`WARNING: Even after adjustments, bay widths (${verifyTotal}m) don't match building length (${buildingData.buildingLength}m).`);
    } else {
      console.log("Final bay widths verified. Total matches building length.", 
                 verifyTotal, "=", buildingData.buildingLength);
    }
    
    console.log("Updated lengthwise bay widths:", newWidths, "Total:", newWidths.reduce((sum, w) => sum + w, 0));
    updateBuildingData('customLengthwiseBayWidths', newWidths);
  }, [buildingData.customLengthwiseBayWidths, buildingData.buildingLength, buildingData.maxBaySpan, updateBuildingData]);

  // Handle widthwise bay width change
  const handleWidthwiseBayWidthChange = useCallback((index, value) => {
    const parsedValue = parseFloat(value);
    
    // Validate input value
    if (isNaN(parsedValue) || parsedValue <= 0) {
      console.warn(`Invalid bay width value: ${value}`);
      return;
    }
    
    // Round to nearest 0.05
    const roundToNearest = (value, nearest = 0.05) => {
      return Math.round(value / nearest) * nearest;
    };
    
    // Enforce maximum bay span limit
    const maxAllowedSpan = buildingData.maxBaySpan;
    const roundedValue = Math.min(maxAllowedSpan, roundToNearest(parsedValue));
    
    // If value exceeds max span, log a warning
    if (parsedValue > maxAllowedSpan) {
      console.warn(`Bay width ${parsedValue} exceeds maximum allowed span of ${maxAllowedSpan}. Using ${roundedValue} instead.`);
    }
    
    // Get current bay widths
    const currentWidths = [...buildingData.customWidthwiseBayWidths];
    
    // Calculate how much we need to adjust
    const oldValue = currentWidths[index];
    const delta = roundedValue - oldValue;
    
    // If no change, exit early
    if (Math.abs(delta) < 0.001) return;
    
    // Create a copy for the new widths
    const newWidths = [...currentWidths];
    newWidths[index] = roundedValue;
    
    // Calculate how much space remains for other bays
    const remainingWidth = buildingData.buildingWidth - roundedValue;
    const otherBaysCount = newWidths.length - 1;
    
    // If there are other bays to distribute the remaining width
    if (otherBaysCount > 0) {
      // Get indices of all other bays
      const otherBaysIndices = Array.from({ length: currentWidths.length }, (_, i) => i).filter(i => i !== index);
      
      // Calculate how much width each remaining bay should have (equal distribution)
      const equalWidth = roundToNearest(remainingWidth / otherBaysCount);
      
      // Check if the equal width would be below minimum
      if (equalWidth >= 0.5) {
        // Set each other bay to the equal width
        otherBaysIndices.forEach(i => {
          newWidths[i] = equalWidth;
        });
        
        // Ensure the total is exactly equal to the building width by adjusting the last bay
        const currentTotal = newWidths.reduce((sum, width) => sum + width, 0);
        const lastAdjustBayIndex = otherBaysIndices[otherBaysIndices.length - 1];
        const adjustment = buildingData.buildingWidth - currentTotal;
        
        if (Math.abs(adjustment) > 0.01) {
          const adjustedWidth = roundToNearest(newWidths[lastAdjustBayIndex] + adjustment);
          
          // Only apply the adjustment if it keeps the bay width valid
          if (adjustedWidth >= 0.5 && adjustedWidth <= maxAllowedSpan) {
            newWidths[lastAdjustBayIndex] = adjustedWidth;
          } else {
            // If adjustment would make the bay invalid, distribute any small rounding errors
            // across all other bays
            const smallAdjustment = adjustment / otherBaysCount;
            otherBaysIndices.forEach(i => {
              newWidths[i] = roundToNearest(newWidths[i] + smallAdjustment);
            });
          }
        }
      } else {
        // If equal distribution would make bays too small, 
        // set all other bays to minimum width (0.5m)
        otherBaysIndices.forEach(i => {
          newWidths[i] = 0.5;
        });
        
        // Check if the total now fits within the building width
        const newTotal = newWidths.reduce((sum, width) => sum + width, 0);
        
        // If the total exceeds the building width, we need to reduce the input bay
        if (newTotal > buildingData.buildingWidth) {
          const excess = newTotal - buildingData.buildingWidth;
          const newInputBayWidth = roundToNearest(roundedValue - excess);
          
          // Only apply if it keeps the bay width valid
          if (newInputBayWidth >= 0.5) {
            newWidths[index] = newInputBayWidth;
            console.warn(`Adjusted input bay from ${roundedValue}m to ${newInputBayWidth}m to fit within building width`);
          } else {
            // If we can't adjust further, distribute evenly
            const evenWidth = roundToNearest(buildingData.buildingWidth / newWidths.length);
            newWidths.fill(evenWidth);
            console.warn(`Cannot accommodate the requested bay width. Reset to even distribution of ${evenWidth}m per bay.`);
          }
        }
      }
    } else {
      // If there's only one bay, it must equal the building width
      newWidths[index] = roundToNearest(buildingData.buildingWidth);
    }
    
    // One final check to cap all bay widths at maxAllowedSpan
    for (let i = 0; i < newWidths.length; i++) {
      if (newWidths[i] > maxAllowedSpan) {
        console.warn(`Bay width ${newWidths[i]} exceeds maximum span of ${maxAllowedSpan}. Capping to maximum.`);
        newWidths[i] = maxAllowedSpan;
      }
    }
    
    // CRITICAL: Ensure the total EXACTLY matches building width, even if we have many max spans
    const absoluteFinalTotal = newWidths.reduce((sum, width) => sum + width, 0);
    if (Math.abs(absoluteFinalTotal - buildingData.buildingWidth) > 0.01) {
      console.warn(`CRITICAL: Final bay width total (${absoluteFinalTotal}m) still doesn't match building width (${buildingData.buildingWidth}m).`);
      
      // Find adjustable bays (those not at max span and not the one being changed)
      const maxSpanBays = newWidths.map((w, i) => ({ width: w, index: i, isMax: w >= maxAllowedSpan - 0.01 }));
      const adjustableBays = maxSpanBays.filter(bay => !bay.isMax);
      
      if (adjustableBays.length > 0) {
        // We have adjustable bays - distribute the difference among them proportionally
        const difference = buildingData.buildingWidth - absoluteFinalTotal;
        const totalAdjustableWidth = adjustableBays.reduce((sum, bay) => sum + bay.width, 0);
        
        // Apply proportional adjustment to each non-max bay
        adjustableBays.forEach(bay => {
          const proportion = bay.width / totalAdjustableWidth;
          const adjustment = difference * proportion;
          const newWidth = Math.max(0.5, bay.width + adjustment);
          newWidths[bay.index] = roundToNearest(newWidth);
        });
      } else if (index >= 0 && newWidths[index] < maxAllowedSpan) {
        // If only the input bay can be adjusted, adjust it
        newWidths[index] = Math.min(maxAllowedSpan, 
                                   Math.max(0.5, roundToNearest(newWidths[index] + (buildingData.buildingWidth - absoluteFinalTotal))));
      } else {
        // Extreme case: all bays are at max span or minimum, and we still don't match the total
        // Force the total by adjusting one bay slightly below max or above min
        const forcedBayIndex = maxSpanBays.find(bay => bay.isMax)?.index ?? 0;
        
        // Calculate how much we need to adjust this bay to make the total correct
        const otherBaysTotal = newWidths.reduce((sum, width, i) => 
          i === forcedBayIndex ? sum : sum + width, 0);
        const requiredWidth = buildingData.buildingWidth - otherBaysTotal;
        
        // Set the bay to this required width, clamped between min and max
        newWidths[forcedBayIndex] = roundToNearest(
          Math.min(maxAllowedSpan, Math.max(0.5, requiredWidth))
        );
      }
    }
    
    // Verify the final result
    const verifyTotal = newWidths.reduce((sum, width) => sum + width, 0);
    if (Math.abs(verifyTotal - buildingData.buildingWidth) > 0.05) {
      console.error(`WARNING: Even after adjustments, bay widths (${verifyTotal}m) don't match building width (${buildingData.buildingWidth}m).`);
    } else {
      console.log("Final bay widths verified. Total matches building width:", 
                 verifyTotal, "=", buildingData.buildingWidth);
    }
    
    console.log("Updated widthwise bay widths:", newWidths, "Total:", newWidths.reduce((sum, w) => sum + w, 0));
    updateBuildingData('customWidthwiseBayWidths', newWidths);
  }, [buildingData.customWidthwiseBayWidths, buildingData.buildingWidth, buildingData.maxBaySpan, updateBuildingData]);

  // Toggle joist direction globally
  const toggleJoistDirection = useCallback(() => {
    updateBuildingData('joistsRunLengthwise', !buildingData.joistsRunLengthwise);
  }, [buildingData.joistsRunLengthwise, updateBuildingData]);

  // Add auto-calculation effect for building dimensions and bay width changes
  useEffect(() => {
    // Skip the first render to avoid unnecessary calculations on mount
    if (firstRender.current) {
      return;
    }
    
    console.log("Auto-calculating results after dimension or bay change");
    
    // Use a debounced calculation to avoid excessive calculations during rapid changes
    const timer = setTimeout(() => {
      calculateResults();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [
    buildingData.buildingLength,
    buildingData.buildingWidth,
    buildingData.lengthwiseBays,
    buildingData.widthwiseBays,
    buildingData.customLengthwiseBayWidths,
    buildingData.customWidthwiseBayWidths,
    buildingData.joistsRunLengthwise,
    buildingData.load,
    buildingData.fireRating,
    calculateResults
  ]);

  return {
    // State
    error,
    results,
    isMobile,
    saveMessage,
    showSaveModal,
    csvLoadingErrors,
    showAdvancedOptions,
    propertiesLoaded,

    // Setters
    setError,
    setResults,
    setIsMobile,
    setSaveMessage,
    setShowSaveModal,
    setCsvLoadingErrors,
    setShowAdvancedOptions,
    setPropertiesLoaded,

    // Form handlers
    handleInputChange,
    handleLoadChange,
    onFireRatingChange,
    handleToggleCustomBayDimensions,
    handleLengthwiseBayWidthChange,
    handleWidthwiseBayWidthChange,
    toggleJoistDirection,
    calculateResults
  };
} 