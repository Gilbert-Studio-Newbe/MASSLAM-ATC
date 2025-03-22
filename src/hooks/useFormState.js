"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useBuildingData } from '../contexts/BuildingDataContext';
import { useTimberCalculations } from './useTimberCalculations';
import { 
  calculateJoistSize as calculateJoistSizeEngineering, 
  calculateBeamSize, 
  calculateColumnSize,
  calculateTimberWeight,
  calculateCarbonSavings
} from '../utils/timberEngineering';

export function useFormState() {
  // Use the building data context
  const { 
    buildingData,
    updateBuildingData,
    updateCalculationResults,
    updateMultipleProperties
  } = useBuildingData();

  // Use timber calculations
  const { 
    calculateMultiFloorBeamSize,
    calculateMultiFloorColumnSize,
    calculateJoistSize
  } = useTimberCalculations();

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
    
    // If there's a significant change, adjust other bays proportionally
    if (Math.abs(delta) > 0.001) {
      // Calculate sum excluding the changed bay
      const otherBaysIndices = Array.from({ length: currentWidths.length }, (_, i) => i).filter(i => i !== index);
      const otherBaysSum = otherBaysIndices.reduce((sum, i) => sum + currentWidths[i], 0);
      
      // Only adjust if there are other bays and their sum is greater than zero
      if (otherBaysIndices.length > 0 && otherBaysSum > 0.001) {
        // Calculate how much to adjust other bays
        const adjustmentNeeded = -delta; // Negative of the change
        
        // Distribute adjustment proportionally
        otherBaysIndices.forEach(i => {
          const proportion = currentWidths[i] / otherBaysSum;
          let adjusted = currentWidths[i] + (adjustmentNeeded * proportion);
          
          // Ensure minimum bay width
          adjusted = Math.max(0.5, roundToNearest(adjusted));
          newWidths[i] = adjusted;
        });
      }
    }
    
    // Calculate total of new widths
    const newTotal = newWidths.reduce((sum, width) => sum + width, 0);
    
    // Ensure total exactly matches building length by adjusting the last bay that isn't the one being changed
    const tolerance = 0.01;
    if (Math.abs(newTotal - buildingData.buildingLength) > tolerance) {
      const lastBayToAdjust = newWidths.length > 1 
        ? (index === newWidths.length - 1 ? newWidths.length - 2 : newWidths.length - 1)
        : 0;
      
      // Calculate the adjustment needed
      const finalAdjustment = buildingData.buildingLength - (newTotal - newWidths[lastBayToAdjust]);
      
      // Only apply if it wouldn't make the bay too small or exceed max span
      if (finalAdjustment >= 0.5 && finalAdjustment <= maxAllowedSpan) {
        newWidths[lastBayToAdjust] = roundToNearest(finalAdjustment);
      } else {
        // If adjustment would create an invalid bay, distribute evenly among all bays
        const evenWidth = roundToNearest(buildingData.buildingLength / newWidths.length);
        for (let i = 0; i < newWidths.length; i++) {
          newWidths[i] = i === index ? roundedValue : evenWidth;
        }
        
        // Adjust the last bay (not the one being changed) to make total exactly match building length
        const finalBayIndex = index === newWidths.length - 1 ? newWidths.length - 2 : newWidths.length - 1;
        if (finalBayIndex >= 0 && finalBayIndex < newWidths.length) {
          const finalTotal = newWidths.reduce((sum, width) => sum + width, 0);
          const finalBayAdjustment = buildingData.buildingLength - (finalTotal - newWidths[finalBayIndex]);
          if (finalBayAdjustment >= 0.5 && finalBayAdjustment <= maxAllowedSpan) {
            newWidths[finalBayIndex] = roundToNearest(finalBayAdjustment);
          }
        }
      }
    }
    
    console.log("Updated lengthwise bay widths:", newWidths);
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
    
    // If there's a significant change, adjust other bays proportionally
    if (Math.abs(delta) > 0.001) {
      // Calculate sum excluding the changed bay
      const otherBaysIndices = Array.from({ length: currentWidths.length }, (_, i) => i).filter(i => i !== index);
      const otherBaysSum = otherBaysIndices.reduce((sum, i) => sum + currentWidths[i], 0);
      
      // Only adjust if there are other bays and their sum is greater than zero
      if (otherBaysIndices.length > 0 && otherBaysSum > 0.001) {
        // Calculate how much to adjust other bays
        const adjustmentNeeded = -delta; // Negative of the change
        
        // Distribute adjustment proportionally
        otherBaysIndices.forEach(i => {
          const proportion = currentWidths[i] / otherBaysSum;
          let adjusted = currentWidths[i] + (adjustmentNeeded * proportion);
          
          // Ensure minimum bay width
          adjusted = Math.max(0.5, roundToNearest(adjusted));
          newWidths[i] = adjusted;
        });
      }
    }
    
    // Calculate total of new widths
    const newTotal = newWidths.reduce((sum, width) => sum + width, 0);
    
    // Ensure total exactly matches building width by adjusting the last bay that isn't the one being changed
    const tolerance = 0.01;
    if (Math.abs(newTotal - buildingData.buildingWidth) > tolerance) {
      const lastBayToAdjust = newWidths.length > 1 
        ? (index === newWidths.length - 1 ? newWidths.length - 2 : newWidths.length - 1)
        : 0;
      
      // Calculate the adjustment needed
      const finalAdjustment = buildingData.buildingWidth - (newTotal - newWidths[lastBayToAdjust]);
      
      // Only apply if it wouldn't make the bay too small or exceed max span
      if (finalAdjustment >= 0.5 && finalAdjustment <= maxAllowedSpan) {
        newWidths[lastBayToAdjust] = roundToNearest(finalAdjustment);
      } else {
        // If adjustment would create an invalid bay, distribute evenly among all bays
        const evenWidth = roundToNearest(buildingData.buildingWidth / newWidths.length);
        for (let i = 0; i < newWidths.length; i++) {
          newWidths[i] = i === index ? roundedValue : evenWidth;
        }
        
        // Adjust the last bay (not the one being changed) to make total exactly match building width
        const finalBayIndex = index === newWidths.length - 1 ? newWidths.length - 2 : newWidths.length - 1;
        if (finalBayIndex >= 0 && finalBayIndex < newWidths.length) {
          const finalTotal = newWidths.reduce((sum, width) => sum + width, 0);
          const finalBayAdjustment = buildingData.buildingWidth - (finalTotal - newWidths[finalBayIndex]);
          if (finalBayAdjustment >= 0.5 && finalBayAdjustment <= maxAllowedSpan) {
            newWidths[finalBayIndex] = roundToNearest(finalBayAdjustment);
          }
        }
      }
    }
    
    console.log("Updated widthwise bay widths:", newWidths);
    updateBuildingData('customWidthwiseBayWidths', newWidths);
  }, [buildingData.customWidthwiseBayWidths, buildingData.buildingWidth, buildingData.maxBaySpan, updateBuildingData]);

  // Toggle joist direction globally
  const toggleJoistDirection = useCallback(() => {
    updateBuildingData('joistsRunLengthwise', !buildingData.joistsRunLengthwise);
  }, [buildingData.joistsRunLengthwise, updateBuildingData]);

  // Calculate results
  const calculateResults = useCallback(() => {
    try {
      setError(null);
      
      // Start debug logs for tracking calculation flow
      console.log("CALCULATION DEBUG - Starting calculations");
      console.log("CALCULATION DEBUG - Building data:", buildingData);
      
      // Extract values from building data
      const joistSpacing = buildingData.joistSpacing;
      console.log("CALCULATION DEBUG - Joist spacing in meters:", joistSpacing);
      console.log("CALCULATION DEBUG - Joist spacing in millimeters:", joistSpacing * 1000);
      
      // Determine the span for joists based on joist direction
      let joistSpan;
      
      // Get the average bay dimensions
      let avgBayWidth = buildingData.buildingWidth / buildingData.widthwiseBays;
      let avgBayLength = buildingData.buildingLength / buildingData.lengthwiseBays;
      
      // Use custom bay dimensions if enabled
      if (buildingData.useCustomBayDimensions) {
        avgBayWidth = buildingData.customWidthwiseBayWidths.reduce((sum, width) => sum + width, 0) / buildingData.customWidthwiseBayWidths.length;
        avgBayLength = buildingData.customLengthwiseBayWidths.reduce((sum, width) => sum + width, 0) / buildingData.customLengthwiseBayWidths.length;
      }
      
      if (buildingData.joistsRunLengthwise) {
        // Joists run parallel to length, so they span across width
        joistSpan = avgBayWidth;
      } else {
        // Joists run parallel to width, so they span across length
        joistSpan = avgBayLength;
      }
      
      console.log(`JOIST DEBUG - Joist span: ${joistSpan.toFixed(2)}m, Spacing: ${joistSpacing.toFixed(2)}m`);
      
      // Check if span exceeds maximum allowable span
      if (joistSpan > buildingData.maxBaySpan) {
        setError(`The joist span (${joistSpan.toFixed(2)}m) exceeds the maximum allowable span (${buildingData.maxBaySpan.toFixed(2)}m). Please adjust your building dimensions or number of bays.`);
        return;
      }
      
      // Calculate joist size
      console.log(`JOIST DEBUG - Calling calculateJoistSize with span=${joistSpan}m, spacing=${joistSpacing}m (${joistSpacing * 1000}mm), load=${buildingData.load}kPa, timberGrade=${buildingData.timberGrade}, fireRating=${buildingData.fireRating}`);
      const joistSize = calculateJoistSize(
        joistSpan, 
        joistSpacing, 
        buildingData.load, 
        buildingData.timberGrade,
        buildingData.fireRating
      );
      
      console.log("JOIST DEBUG - Calculated joist size:", joistSize);
      
      // Calculate beam span based on bay configuration
      // Beams span between columns in the perpendicular direction to joists
      let beamSpan;
      if (buildingData.joistsRunLengthwise) {
        // If joists run lengthwise, beams span across length
        beamSpan = avgBayLength;
      } else {
        // If joists run widthwise, beams span across width
        beamSpan = avgBayWidth;
      }
      
      console.log(`JOIST DEBUG - Beam span: ${beamSpan.toFixed(2)}m`);
      
      // Check if beam span exceeds maximum allowable span
      if (beamSpan > buildingData.maxBaySpan) {
        setError(`The beam span (${beamSpan.toFixed(2)}m) exceeds the maximum allowable span (${buildingData.maxBaySpan.toFixed(2)}m). Please adjust your building dimensions or number of bays.`);
        return;
      }
      
      // Calculate beam size for interior beams
      const beamSize = calculateMultiFloorBeamSize(
        beamSpan, 
        buildingData.load, 
        joistSpacing, 
        buildingData.numFloors,
        buildingData.fireRating,
        buildingData.joistsRunLengthwise,
        avgBayWidth,
        avgBayLength,
        false // isEdgeBeam = false for interior beams
      );
      
      console.log("INTERIOR BEAM DEBUG - Calculated interior beam details:", {
        width: beamSize.width,
        depth: beamSize.depth,
        span: beamSpan,
        tributaryWidth: beamSize.tributaryWidth,
        loadPerMeter: beamSize.loadPerMeter,
        isEdgeBeam: false
      });
      
      // Calculate edge beam size
      const edgeBeamSize = calculateMultiFloorBeamSize(
        beamSpan, 
        buildingData.load, 
        joistSpacing, 
        buildingData.numFloors,
        buildingData.fireRating,
        buildingData.joistsRunLengthwise,
        avgBayWidth,
        avgBayLength,
        true // isEdgeBeam = true for edge beams
      );
      
      console.log("EDGE BEAM DEBUG - Calculated edge beam details:", {
        width: edgeBeamSize.width,
        depth: edgeBeamSize.depth,
        span: beamSpan,
        tributaryWidth: edgeBeamSize.tributaryWidth,
        loadPerMeter: edgeBeamSize.loadPerMeter,
        isEdgeBeam: true
      });
      
      // Calculate column size
      const columnSize = calculateMultiFloorColumnSize(
        beamSize.width, 
        buildingData.load, 
        buildingData.floorHeight,
        buildingData.numFloors,
        buildingData.fireRating,
        avgBayLength,
        avgBayWidth
      );
      
      console.log("JOIST DEBUG - Calculated column size:", columnSize);
      
      // Calculate timber weights and volumes
      const timberResult = calculateTimberWeight(
        joistSize,
        beamSize,
        columnSize,
        buildingData.buildingLength,
        buildingData.buildingWidth,
        buildingData.numFloors,
        buildingData.lengthwiseBays,
        buildingData.widthwiseBays,
        buildingData.joistsRunLengthwise,
        buildingData.timberGrade
      );
      
      console.log("TIMBER VOLUME DEBUG - Calculated timber weight and volumes:", timberResult);
      
      // Calculate carbon savings
      const carbonResult = calculateCarbonSavings(timberResult);
      console.log("TIMBER VOLUME DEBUG - Calculated carbon savings:", carbonResult);
      
      // Store the calculated results
      const newResults = {
        joistSize: {
          ...joistSize,
          span: joistSpan,
          spacing: joistSpacing
        },
        beamSize: {
          ...beamSize,
          span: beamSpan
        },
        interiorBeamSize: {
          ...beamSize,
          span: beamSpan
        },
        edgeBeamSize: {
          ...edgeBeamSize,
          span: beamSpan
        },
        columnSize: {
          ...columnSize
        },
        // Add timber weight, volume, and carbon data
        timberWeight: timberResult.weight,
        timberVolume: timberResult.totalVolume,
        carbonSavings: carbonResult.carbonSavings,
        // Add element volumes and counts
        elementVolumes: {
          joists: timberResult.elements.joists.volume,
          beams: timberResult.elements.beams.volume,
          columns: timberResult.elements.columns.volume
        },
        elementCounts: {
          joists: timberResult.elements.joists.count,
          beams: timberResult.elements.beams.count,
          columns: timberResult.elements.columns.count
        },
        floorHeight: buildingData.floorHeight,
        numFloors: buildingData.numFloors,
        load: buildingData.load,
        joistsRunLengthwise: buildingData.joistsRunLengthwise,
        fireRating: buildingData.fireRating,
        timberGrade: buildingData.timberGrade,
        avgBayWidth,
        avgBayLength,
        updatedAt: new Date().toISOString()
      };
      
      console.log("JOIST DEBUG - Setting new results:", newResults);
      
      // Update results in context and local state
      setResults(newResults);
      updateCalculationResults(newResults);
      
    } catch (error) {
      console.error("JOIST DEBUG - Calculation error:", error);
      setError(`Calculation error: ${error.message}`);
    }
  }, [
    buildingData, 
    updateCalculationResults, 
    calculateJoistSize, 
    calculateMultiFloorBeamSize, 
    calculateMultiFloorColumnSize
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