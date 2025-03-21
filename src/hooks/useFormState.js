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
    
    console.log(`Updating ${field} to ${value}`);
    updateBuildingData(field, value);
  }, [updateBuildingData]);

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

  // Toggle custom bay dimensions
  const handleToggleCustomBayDimensions = useCallback(() => {
    const newValue = !buildingData.useCustomBayDimensions;
    console.log(`Setting useCustomBayDimensions to ${newValue}`);
    updateBuildingData('useCustomBayDimensions', newValue);
  }, [buildingData.useCustomBayDimensions, updateBuildingData]);

  // Handle lengthwise bay width change
  const handleLengthwiseBayWidthChange = useCallback((index, value) => {
    const newWidths = [...buildingData.customLengthwiseBayWidths];
    newWidths[index] = parseFloat(value) || 0;
    
    // Ensure total equals building length
    const totalWidth = newWidths.reduce((sum, width) => sum + width, 0);
    if (totalWidth !== buildingData.buildingLength) {
      // Adjust the last bay to make total equal to building length
      const lastIndex = buildingData.lengthwiseBays - 1;
      
      // Skip if we're already changing the last bay
      if (index !== lastIndex) {
        newWidths[lastIndex] = buildingData.buildingLength - newWidths.slice(0, lastIndex).reduce((sum, width) => sum + width, 0);
      } else {
        // If changing the last bay, adjust all other bays proportionally
        const otherBaysSum = newWidths.slice(0, lastIndex).reduce((sum, width) => sum + width, 0);
        const proportion = (buildingData.buildingLength - newWidths[lastIndex]) / otherBaysSum;
        
        for (let i = 0; i < lastIndex; i++) {
          newWidths[i] = newWidths[i] * proportion;
        }
      }
    }
    
    updateBuildingData('customLengthwiseBayWidths', newWidths);
  }, [buildingData.customLengthwiseBayWidths, buildingData.lengthwiseBays, buildingData.buildingLength, updateBuildingData]);

  // Handle widthwise bay width change
  const handleWidthwiseBayWidthChange = useCallback((index, value) => {
    const newWidths = [...buildingData.customWidthwiseBayWidths];
    newWidths[index] = parseFloat(value) || 0;
    
    // Ensure total equals building width
    const totalWidth = newWidths.reduce((sum, width) => sum + width, 0);
    if (totalWidth !== buildingData.buildingWidth) {
      // Adjust the last bay to make total equal to building width
      const lastIndex = buildingData.widthwiseBays - 1;
      
      // Skip if we're already changing the last bay
      if (index !== lastIndex) {
        newWidths[lastIndex] = buildingData.buildingWidth - newWidths.slice(0, lastIndex).reduce((sum, width) => sum + width, 0);
      } else {
        // If changing the last bay, adjust all other bays proportionally
        const otherBaysSum = newWidths.slice(0, lastIndex).reduce((sum, width) => sum + width, 0);
        const proportion = (buildingData.buildingWidth - newWidths[lastIndex]) / otherBaysSum;
        
        for (let i = 0; i < lastIndex; i++) {
          newWidths[i] = newWidths[i] * proportion;
        }
      }
    }
    
    updateBuildingData('customWidthwiseBayWidths', newWidths);
  }, [buildingData.customWidthwiseBayWidths, buildingData.widthwiseBays, buildingData.buildingWidth, updateBuildingData]);

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