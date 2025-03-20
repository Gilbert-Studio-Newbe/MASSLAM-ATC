"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useBuildingData } from '../contexts/BuildingDataContext';
import { useFireResistance, calculateFireParams } from './FireResistanceCalculator';
import { 
  calculateJoistSize as calculateJoistSizeEngineering, 
  calculateBeamSize, 
  calculateColumnSize,
  calculateTimberWeight,
  calculateCarbonSavings,
  validateStructure,
  TIMBER_PROPERTIES,
  loadTimberProperties,
  calculateMasslamBeamSize,
  getFixedWidthForFireRating
} from '../utils/timberEngineering';
import { 
  loadMasslamSizes,
  findNearestWidth,
  findNearestDepth,
  debugMasslamSizes,
  validateAllSizes, 
  initializeMasslamSizes,
  getMasslamSizes,
  verifyLoadedSizes,
  filterToStandardSizes,
  resetMasslamSizes
} from '../utils/timberSizes';
import { calculateFireResistanceAllowance, getMasslamSL33Properties } from '../utils/masslamProperties';
import TimberSizesTable from './TimberSizesTable';
import { 
  calculateCost, 
  formatCurrency, 
  loadRates,
  STORAGE_KEYS 
} from '../utils/costEstimator';
import { saveBuildingData, prepareVisualizationData } from '../utils/buildingDataStore';
import {
  calculateBeamVolume,
  calculateColumnVolume,
  calculateJoistVolume
} from '@/utils/calculations';

// Import extracted components
import SliderInput from './common/SliderInput';
import SuccessMessage from './common/SuccessMessage';
import FireRatingSelector from './calculator/FireRatingSelector';
import LoadTypeSelector from './calculator/LoadTypeSelector';
import SaveProjectModal from './calculator/SaveProjectModal';
import DimensionsSection from './calculator/DimensionsSection';
import TimberGradeSelector from './calculator/TimberGradeSelector';
import StructureConfigSection from './calculator/StructureConfigSection';
import ResultsDisplay from './calculator/ResultsDisplay';

// Custom function for beam size calculation with tributary area
const calculateMultiFloorBeamSize = (span, load, joistSpacing, numFloors, fireRating = 'none', joistsRunLengthwise = true, avgBayWidth = 0, avgBayLength = 0, isEdgeBeam = false) => {
  // Calculate tributary width for the beam (in meters)
  // For a more realistic calculation, use half the perpendicular dimension to the beam span
  // If beam spans lengthwise (joists run widthwise), tributary width is half the bay width
  // If beam spans widthwise (joists run lengthwise), tributary width is half the bay length
  let tributaryWidth;
  
  if (avgBayWidth > 0 && avgBayLength > 0) {
    // If we have bay dimensions, use them for a more realistic tributary width
    if (isEdgeBeam) {
      // Edge beams only support load from one side (half the tributary width of interior beams)
      tributaryWidth = joistsRunLengthwise ? avgBayWidth / 4 : avgBayLength / 4;
    } else {
      // Interior beams support load from both sides
      tributaryWidth = joistsRunLengthwise ? avgBayWidth / 2 : avgBayLength / 2;
    }
  } else {
    // Fallback to the old calculation if bay dimensions aren't provided
    tributaryWidth = isEdgeBeam ? joistSpacing / 2 : joistSpacing;
  }
  
  console.log(`Beam tributary width (${isEdgeBeam ? 'edge' : 'interior'}): ${tributaryWidth.toFixed(2)} m`);
  
  // Calculate load per meter of beam (kN/m)
  // load is in kPa (kN/m²), so multiply by tributary width to get kN/m
  let loadPerMeter = load * tributaryWidth;
  console.log(`Initial beam load per meter (without self-weight): ${loadPerMeter.toFixed(2)} kN/m`);
  
  // Calculate theoretical width and depth
  const spanMm = span * 1000; // Convert to mm
  const theoreticalWidth = Math.max(65, Math.ceil(spanMm / 25)); // Simplified calculation
  const theoreticalDepth = Math.max(240, Math.ceil(spanMm / 12)); // Simplified calculation
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Add fire resistance allowance to width and depth
  // For beams, typically 3 sides are exposed (bottom and two sides)
  const fireAdjustedWidth = theoreticalWidth + (2 * fireAllowance); // Both sides exposed
  const fireAdjustedDepth = theoreticalDepth + fireAllowance; // Only bottom exposed
  
  // Find the nearest available width and depth
  const width = findNearestWidth(fireAdjustedWidth);
  const depth = findNearestDepth(width, fireAdjustedDepth);
  
  // Calculate self-weight based on size estimate
  // Convert dimensions to meters
  const beamWidth = width / 1000; // m
  const beamDepth = depth / 1000; // m
  
  // Get timber density from properties (kg/m³)
  const density = TIMBER_PROPERTIES['MASSLAM_SL33']?.density || 600; // Default to 600 kg/m³
  
  // Calculate beam volume per meter (m³/m)
  const beamVolumePerMeter = beamWidth * beamDepth * 1.0; // 1.0 meter length
  
  // Calculate beam weight per meter (kg/m)
  const beamWeightPerMeter = beamVolumePerMeter * density;
  
  // Convert to kN/m (1 kg = 0.00981 kN)
  const beamSelfWeightPerMeter = beamWeightPerMeter * 0.00981;
  
  console.log(`Beam self-weight: ${beamSelfWeightPerMeter.toFixed(2)} kN/m`);
  
  // Add self-weight to the load per meter
  loadPerMeter += beamSelfWeightPerMeter;
  console.log(`Total beam load per meter (with self-weight): ${loadPerMeter.toFixed(2)} kN/m`);
  
  // Calculate total distributed load on the beam (including self-weight)
  const totalDistributedLoad = loadPerMeter * span;
  console.log(`Total distributed load on beam (including self-weight): ${totalDistributedLoad.toFixed(2)} kN`);
  
  console.log(`Beam size before fire adjustment: ${theoreticalWidth}x${theoreticalDepth}mm`);
  console.log(`Beam size after fire adjustment: ${fireAdjustedWidth}x${fireAdjustedDepth}mm`);
  
  return {
    width: width,
    depth: depth,
    span: span,
    tributaryWidth: tributaryWidth,
    loadPerMeter: loadPerMeter,
    selfWeight: beamSelfWeightPerMeter,
    totalDistributedLoad: totalDistributedLoad,
    fireRating: fireRating,
    fireAllowance: fireAllowance,
    isEdgeBeam: isEdgeBeam
  };
};

// Rename the custom function to avoid naming conflict
const calculateMultiFloorColumnSize = (beamWidth, load, height, floors, fireRating = 'none', bayLength, bayWidth) => {
  // Column width should match beam width
  const width = beamWidth;
  console.log(`Setting column width to match beam width: ${width}mm`);
  
  // Calculate tributary area for the column (in square meters)
  // Each column typically supports a quarter of each of the four adjacent bays
  const tributaryArea = bayLength * bayWidth;
  console.log(`Column tributary area: ${tributaryArea.toFixed(2)} m²`);
  
  // Calculate load based on number of floors and tributary area
  // load is in kPa (kN/m²), so multiply by tributary area to get kN
  const loadPerFloor = load * tributaryArea;
  let totalLoad = loadPerFloor * floors;
  console.log(`Initial column load per floor: ${loadPerFloor.toFixed(2)} kN, Total load (without self-weight): ${totalLoad.toFixed(2)} kN`);
  
  // Calculate minimum depth based on load and height
  // For simplicity, we'll start with the width and increase based on load
  let depth = width;
  
  // Increase depth based on number of floors and load
  if (floors > 1) {
    // Add 50mm per additional floor
    depth += (floors - 1) * 50;
  }
  
  // Ensure depth is at least equal to width (square column)
  depth = Math.max(depth, width);
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
  }
  
  // Add fire resistance allowance to width and depth
  // For columns, all 4 sides are exposed
  const fireAdjustedWidth = width + (2 * fireAllowance); // Both sides exposed
  const fireAdjustedDepth = depth + (2 * fireAllowance); // Both sides exposed
  
  // Find nearest available width and depth
  const adjustedWidth = findNearestWidth(fireAdjustedWidth);
  const adjustedDepth = findNearestDepth(adjustedWidth, fireAdjustedDepth);
  
  // Calculate self-weight of the column
  // Convert dimensions to meters
  const columnWidth = adjustedWidth / 1000; // m
  const columnDepth = adjustedDepth / 1000; // m
  
  // Get timber density from properties (kg/m³)
  const density = TIMBER_PROPERTIES['MASSLAM_SL33']?.density || 600; // Default to 600 kg/m³
  
  // Calculate column volume (m³)
  const columnVolume = columnWidth * columnDepth * height;
  
  // Calculate column weight (kg)
  const columnWeight = columnVolume * density;
  
  // Convert to kN (1 kg = 0.00981 kN)
  const columnSelfWeight = columnWeight * 0.00981;
  
  // For multi-floor columns, calculate the cumulative self-weight
  // Each floor's column adds weight to the floors below
  let cumulativeSelfWeight = 0;
  for (let i = 1; i <= floors; i++) {
    // Weight of columns from this floor to the top
    cumulativeSelfWeight += columnSelfWeight * (floors - i + 1);
  }
  
  console.log(`Column self-weight per floor: ${columnSelfWeight.toFixed(2)} kN, Cumulative: ${cumulativeSelfWeight.toFixed(2)} kN`);
  
  // Add self-weight to the total load
  const totalLoadWithSelfWeight = load + cumulativeSelfWeight;
  console.log(`Total column load (with self-weight): ${totalLoadWithSelfWeight.toFixed(2)} kN`);
  
  console.log(`Column size before fire adjustment: ${width}x${depth}mm`);
  console.log(`Column size after fire adjustment: ${fireAdjustedWidth}x${fireAdjustedDepth}mm`);
  
  return {
    width: adjustedWidth,
    depth: adjustedDepth,
    height: height,
    load: totalLoadWithSelfWeight,
    tributaryArea: tributaryArea,
    loadPerFloor: loadPerFloor,
    selfWeight: columnSelfWeight,
    cumulativeSelfWeight: cumulativeSelfWeight,
    floors: floors,
    fireRating: fireRating,
    fireAllowance: fireAllowance
  };
};

export default function TimberCalculator() {
  // Use BuildingDataContext
  const { 
    buildingData,
    updateBuildingData,
    updateCalculationResults,
    updateMultipleProperties,
    resetBuildingData,
    handleFireRatingChange
  } = useBuildingData();
  const { handleFireRatingChange: fireResistanceHandleFireRatingChange } = useFireResistance();
  
  // Project details
  const [projectDetails, setProjectDetails] = useState({
    name: buildingData.projectName || '',
    designer: buildingData.designer || '',
    client: buildingData.client || '',
    date: buildingData.date || new Date().toISOString().split('T')[0]
  });
  
  // Local state
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [csvLoadingErrors, setCsvLoadingErrors] = useState({});
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [propertiesLoaded, setPropertiesLoaded] = useState(false);
  const [results, setResults] = useState(buildingData.results || null);
  
  // Reference for first render
  const firstRender = useRef(true);
  
  // Maximum allowed span for a single bay (in meters) - use value from context
  // const MAX_BAY_SPAN = 9.0;
  
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
    
    // Clean up event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Load saved project if available
  useEffect(() => {
    const loadSavedProject = () => {
      try {
        // First check for saved state in localStorage
        const savedState = localStorage.getItem('timberCalculatorState');
        
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          console.log('Loading saved state from localStorage:', parsedState);
          
          // Restore all state values
          updateBuildingData('buildingLength', parsedState.buildingLength || 18);
          updateBuildingData('buildingWidth', parsedState.buildingWidth || 14);
          updateBuildingData('lengthwiseBays', parsedState.lengthwiseBays || 3);
          updateBuildingData('widthwiseBays', parsedState.widthwiseBays || 2);
          updateBuildingData('numFloors', parsedState.numFloors || 1);
          updateBuildingData('floorHeight', parsedState.floorHeight || 3.5);
          updateBuildingData('load', parsedState.load || 3.0);
          updateBuildingData('fireRating', parsedState.fireRating || 'none');
          updateBuildingData('joistsRunLengthwise', parsedState.joistsRunLengthwise !== undefined ? parsedState.joistsRunLengthwise : true);
          updateBuildingData('timberGrade', parsedState.timberGrade || 'ML38');
          updateBuildingData('useCustomBayDimensions', parsedState.useCustomBayDimensions || false);
          
          // Only set custom bay widths if they exist and match the current number of bays
          if (parsedState.customLengthwiseBayWidths && parsedState.customLengthwiseBayWidths.length === parsedState.lengthwiseBays) {
            updateMultipleProperties('customLengthwiseBayWidths', parsedState.customLengthwiseBayWidths);
          }
          
          if (parsedState.customWidthwiseBayWidths && parsedState.customWidthwiseBayWidths.length === parsedState.widthwiseBays) {
            updateMultipleProperties('customWidthwiseBayWidths', parsedState.customWidthwiseBayWidths);
          }
          
          console.log('Successfully loaded state from localStorage');
          
          // The useEffect that watches for state changes will trigger the calculation
          
          return; // Skip loading from currentProject if we loaded from localStorage
        } else {
          console.log('No saved state found in localStorage');
        }
        
        // If no localStorage state, check for currentProject
        const currentProject = localStorage.getItem('currentProject');
        if (currentProject) {
          const project = JSON.parse(currentProject);
          console.log('Loading project from currentProject:', project);
          
          // Load project details
          setProjectDetails(project.details);
          
          // Load building dimensions
          updateBuildingData('buildingLength', project.buildingLength);
          updateBuildingData('buildingWidth', project.buildingWidth);
          updateBuildingData('lengthwiseBays', project.lengthwiseBays);
          updateBuildingData('widthwiseBays', project.widthwiseBays);
          updateBuildingData('numFloors', project.numFloors);
          
          // Load floor height if available
          if (project.floorHeight !== undefined) {
            updateBuildingData('floorHeight', project.floorHeight);
          }
          
          // Load other settings
          updateBuildingData('fireRating', project.fireRating);
          updateBuildingData('load', project.load);
          
          // Load joist direction if available
          if (project.joistsRunLengthwise !== undefined) {
            updateBuildingData('joistsRunLengthwise', project.joistsRunLengthwise);
          }
          
          // Load custom bay dimensions if available
          if (project.customBayDimensions) {
            updateBuildingData('useCustomBayDimensions', true);
            if (project.customBayDimensions.lengthwiseBayWidths) {
              updateMultipleProperties('customLengthwiseBayWidths', project.customBayDimensions.lengthwiseBayWidths);
            }
            if (project.customBayDimensions.widthwiseBayWidths) {
              updateMultipleProperties('customWidthwiseBayWidths', project.customBayDimensions.widthwiseBayWidths);
            }
          }
          
          console.log('Successfully loaded project from currentProject');
          
          // Clear the current project from localStorage
          localStorage.removeItem('currentProject');
        } else {
          console.log('No currentProject found in localStorage');
        }
      } catch (error) {
        console.error('Error loading saved project:', error);
      }
    };
    
    console.log('Component mounted, loading saved project...');
    loadSavedProject();
  }, [updateBuildingData, updateMultipleProperties]);
  
  // Automatically adjust bays when dimensions change
  useEffect(() => {
    // Calculate current bay sizes
    const currentLengthwiseBaySize = buildingData.buildingLength / buildingData.lengthwiseBays;
    const currentWidthwiseBaySize = buildingData.buildingWidth / buildingData.widthwiseBays;
    
    // Check if bay sizes exceed maximum allowed span
    let newLengthwiseBays = buildingData.lengthwiseBays;
    let newWidthwiseBays = buildingData.widthwiseBays;
    
    // Add safety check for maxBaySpan
    const safeMaxBaySpan = (typeof buildingData.maxBaySpan === 'number' && !isNaN(buildingData.maxBaySpan) && buildingData.maxBaySpan > 0) 
      ? buildingData.maxBaySpan 
      : 9.0; // Default fallback
    
    if (currentLengthwiseBaySize > safeMaxBaySpan) {
      // Calculate minimum number of bays needed to keep span under maximum
      // Round to ensure we're working with whole numbers of bays
      newLengthwiseBays = Math.ceil(buildingData.buildingLength / safeMaxBaySpan);
    }
    
    if (currentWidthwiseBaySize > safeMaxBaySpan) {
      // Calculate minimum number of bays needed to keep span under maximum
      // Round to ensure we're working with whole numbers of bays
      newWidthwiseBays = Math.ceil(buildingData.buildingWidth / safeMaxBaySpan);
    }
    
    // Update bay counts if needed
    if (newLengthwiseBays !== buildingData.lengthwiseBays) {
      updateBuildingData('lengthwiseBays', newLengthwiseBays);
    }
    
    if (newWidthwiseBays !== buildingData.widthwiseBays) {
      updateBuildingData('widthwiseBays', newWidthwiseBays);
    }
  }, [buildingData.buildingLength, buildingData.buildingWidth, buildingData.maxBaySpan, updateBuildingData]);
  
  // Also adjust bays when maxBaySpan changes
  useEffect(() => {
    // Only run this when maxBaySpan changes, not on initial render
    if (firstRender.current) {
      return;
    }
    
    // Calculate current bay sizes
    const currentLengthwiseBaySize = buildingData.buildingLength / buildingData.lengthwiseBays;
    const currentWidthwiseBaySize = buildingData.buildingWidth / buildingData.widthwiseBays;
    
    // Check if bay sizes exceed maximum allowed span and update if needed
    let baysUpdated = false;
    let newLengthwiseBays = buildingData.lengthwiseBays;
    let newWidthwiseBays = buildingData.widthwiseBays;
    
    // Add safety check for maxBaySpan
    const safeMaxBaySpan = (typeof buildingData.maxBaySpan === 'number' && !isNaN(buildingData.maxBaySpan) && buildingData.maxBaySpan > 0) 
      ? buildingData.maxBaySpan 
      : 9.0; // Default fallback
    
    if (currentLengthwiseBaySize > safeMaxBaySpan) {
      newLengthwiseBays = Math.ceil(buildingData.buildingLength / safeMaxBaySpan);
      baysUpdated = true;
    }
    
    if (currentWidthwiseBaySize > safeMaxBaySpan) {
      newWidthwiseBays = Math.ceil(buildingData.buildingWidth / safeMaxBaySpan);
      baysUpdated = true;
    }
    
    // Update bay counts if needed
    if (baysUpdated) {
      updateMultipleProperties({
        lengthwiseBays: newLengthwiseBays,
        widthwiseBays: newWidthwiseBays
      });
    }
  }, [buildingData.maxBaySpan, buildingData.buildingLength, buildingData.buildingWidth, 
      buildingData.lengthwiseBays, buildingData.widthwiseBays, updateMultipleProperties]);
  
  // Remove the local fireRating state, use from buildingData context instead
  const [load, setLoad] = useState(2); // kPa (updated from 1.5 to 2)
  
  // Constants
  const structureType = 'floor'; // Fixed to floor
  
  // Add state for timber properties
  const [timberGrade, setTimberGrade] = useState('ML38');
  
  // Load timber properties from CSV when component mounts
  useEffect(() => {
    const loadProperties = async () => {
      try {
        await loadTimberProperties();
        setPropertiesLoaded(true);
        console.log('Timber properties loaded from CSV:', TIMBER_PROPERTIES.MASSLAM_SL33);
      } catch (error) {
        console.error('Error loading timber properties:', error);
        setCsvLoadingErrors(prev => ({ ...prev, properties: true }));
      }
    };
    
    loadProperties();
  }, []);
  
  // Save the current project
  const saveProject = () => {
    try {
      // Create project object
      const project = {
        details: projectDetails,
        buildingLength: buildingData.buildingLength,
        buildingWidth: buildingData.buildingWidth,
        lengthwiseBays: buildingData.lengthwiseBays,
        widthwiseBays: buildingData.widthwiseBays,
        numFloors: buildingData.numFloors,
        floorHeight: buildingData.floorHeight,
        load: buildingData.load,
        fireRating: buildingData.fireRating,
        joistsRunLengthwise: buildingData.joistsRunLengthwise,
        customBayDimensions: buildingData.useCustomBayDimensions ? {
          lengthwiseBayWidths: buildingData.customLengthwiseBayWidths,
          widthwiseBayWidths: buildingData.customWidthwiseBayWidths
        } : null
      };
      
      // Get existing projects from localStorage
      const savedProjects = localStorage.getItem('masslamProjects');
      let projects = [];
      
      if (savedProjects) {
        projects = JSON.parse(savedProjects);
      }
      
      // Add the new project
      projects.push(project);
      
      // Save back to localStorage
      localStorage.setItem('masslamProjects', JSON.stringify(projects));
      
      // Show success message
      setSaveMessage('Project saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
      
      // Close the modal
      setShowSaveModal(false);
    } catch (error) {
      console.error('Error saving project:', error);
      setSaveMessage('Error saving project. Please try again.');
    }
  };
  
  // Load MASSLAM sizes on component mount
  useEffect(() => {
    console.log('TimberCalculator: Component mounted');
    
    // Initialize the MASSLAM sizes module
    console.log('Initializing MASSLAM sizes module from TimberCalculator');
    initializeMasslamSizes();
    
    // Log the current state of MASSLAM sizes
    console.log('Initial MASSLAM sizes:', getMasslamSizes());
    
    // Load the MASSLAM sizes from the CSV file
    const loadSizes = async () => {
      console.log('Loading MASSLAM sizes from TimberCalculator');
      try {
        const loadedSizes = await loadMasslamSizes();
        console.log(`Loaded ${loadedSizes.length} MASSLAM sizes`);
        
        if (loadedSizes.length === 0) {
          console.warn('No MASSLAM sizes loaded from CSV, calculations will use fallback values');
          setCsvLoadingErrors(prev => ({ ...prev, sizes: true }));
          return;
        }
        
        // Filter to standard sizes
        console.log('Filtering to standard sizes');
        const standardSizes = filterToStandardSizes();
        console.log(`Filtered to ${standardSizes.length} standard sizes`);
        
        if (standardSizes.length === 0) {
          console.warn('No standard sizes found after filtering, calculations will use fallback values');
          setCsvLoadingErrors(prev => ({ ...prev, sizes: true }));
          return;
        }
        
        // Verify the loaded sizes
        const verified = verifyLoadedSizes();
        console.log('Verification result:', verified);
        
        if (!verified) {
          console.warn('Size verification failed, calculations may use fallback values');
          setCsvLoadingErrors(prev => ({ ...prev, sizes: true }));
        }
        
        // Debug the loaded sizes
        debugMasslamSizes();
      } catch (error) {
        console.error('Error loading MASSLAM sizes:', error);
        setCsvLoadingErrors(prev => ({ ...prev, sizes: true }));
      }
    };
    
    loadSizes();
  }, []);
  
  // Save current state to localStorage whenever it changes
  useEffect(() => {
    try {
      // Create state object with all relevant design parameters
      const currentState = {
        buildingLength: buildingData.buildingLength,
        buildingWidth: buildingData.buildingWidth,
        lengthwiseBays: buildingData.lengthwiseBays,
        widthwiseBays: buildingData.widthwiseBays,
        numFloors: buildingData.numFloors,
        floorHeight: buildingData.floorHeight,
        load: buildingData.load,
        fireRating: buildingData.fireRating,
        joistsRunLengthwise: buildingData.joistsRunLengthwise,
        timberGrade: buildingData.timberGrade,
        useCustomBayDimensions: buildingData.useCustomBayDimensions,
        customLengthwiseBayWidths: buildingData.customLengthwiseBayWidths,
        customWidthwiseBayWidths: buildingData.customWidthwiseBayWidths
      };
      
      // Save to localStorage
      localStorage.setItem('timberCalculatorState', JSON.stringify(currentState));
      console.log('Saved current state to localStorage');
    } catch (error) {
      console.error('Error saving state to localStorage:', error);
    }
  }, [
    buildingData.buildingLength,
    buildingData.buildingWidth,
    buildingData.lengthwiseBays,
    buildingData.widthwiseBays,
    buildingData.numFloors,
    buildingData.floorHeight,
    buildingData.load,
    buildingData.fireRating,
    buildingData.joistsRunLengthwise,
    buildingData.timberGrade,
    buildingData.useCustomBayDimensions,
    buildingData.customLengthwiseBayWidths,
    buildingData.customWidthwiseBayWidths
  ]);
  
  // Add a beforeunload event listener to save state before navigating away
  useEffect(() => {
    const saveStateBeforeUnload = () => {
      try {
        // Create state object with all relevant design parameters
        const currentState = {
          buildingLength: buildingData.buildingLength,
          buildingWidth: buildingData.buildingWidth,
          lengthwiseBays: buildingData.lengthwiseBays,
          widthwiseBays: buildingData.widthwiseBays,
          numFloors: buildingData.numFloors,
          floorHeight: buildingData.floorHeight,
          load: buildingData.load,
          fireRating: buildingData.fireRating,
          joistsRunLengthwise: buildingData.joistsRunLengthwise,
          timberGrade: buildingData.timberGrade,
          useCustomBayDimensions: buildingData.useCustomBayDimensions,
          customLengthwiseBayWidths: buildingData.customLengthwiseBayWidths,
          customWidthwiseBayWidths: buildingData.customWidthwiseBayWidths
        };
        
        // Save to localStorage
        localStorage.setItem('timberCalculatorState', JSON.stringify(currentState));
        console.log('Saved state before navigation');
      } catch (error) {
        console.error('Error saving state before navigation:', error);
      }
    };

    // Add event listener for beforeunload
    window.addEventListener('beforeunload', saveStateBeforeUnload);
    
    // Add event listener for navigation events
    const handleRouteChange = () => {
      saveStateBeforeUnload();
    };
    
    // Add event listeners for link clicks that might navigate away
    const handleLinkClick = () => {
      saveStateBeforeUnload();
    };
    
    // Find all link elements and add click event listeners
    const links = document.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', handleLinkClick);
    });

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', saveStateBeforeUnload);
      links.forEach(link => {
        link.removeEventListener('click', handleLinkClick);
      });
    };
  }, [
    buildingData.buildingLength,
    buildingData.buildingWidth,
    buildingData.lengthwiseBays,
    buildingData.widthwiseBays,
    buildingData.numFloors,
    buildingData.floorHeight,
    buildingData.load,
    buildingData.fireRating,
    buildingData.joistsRunLengthwise,
    buildingData.timberGrade,
    buildingData.useCustomBayDimensions,
    buildingData.customLengthwiseBayWidths,
    buildingData.customWidthwiseBayWidths
  ]);
  
  // Initialize custom bay dimensions when the number of bays changes
  useEffect(() => {
    // Initialize lengthwise bay widths with equal distribution
    const defaultLengthwiseBayWidth = buildingData.buildingLength / buildingData.lengthwiseBays;
    updateMultipleProperties('customLengthwiseBayWidths', Array(buildingData.lengthwiseBays).fill(defaultLengthwiseBayWidth));
    
    // Initialize widthwise bay widths with equal distribution
    const defaultWidthwiseBayWidth = buildingData.buildingWidth / buildingData.widthwiseBays;
    updateMultipleProperties('customWidthwiseBayWidths', Array(buildingData.widthwiseBays).fill(defaultWidthwiseBayWidth));
  }, [buildingData.lengthwiseBays, buildingData.widthwiseBays, buildingData.buildingLength, buildingData.buildingWidth, updateMultipleProperties]);

  // Calculate bay dimensions based on whether custom dimensions are used
  const calculateBayDimensions = () => {
    try {
      // Validate bay counts to ensure they're positive integers
      const lengthwiseBays = Math.max(1, parseInt(buildingData.lengthwiseBays) || 1);
      const widthwiseBays = Math.max(1, parseInt(buildingData.widthwiseBays) || 1);
      
      if (buildingData.useCustomBayDimensions) {
        // If using custom dimensions, use the custom bay widths
        return {
          lengthwiseBayWidths: [...buildingData.customLengthwiseBayWidths],
          widthwiseBayWidths: [...buildingData.customWidthwiseBayWidths]
        };
      } else {
        // Calculate equal bay widths
        const lengthwiseBayWidth = buildingData.buildingLength / lengthwiseBays;
        const widthwiseBayWidth = buildingData.buildingWidth / widthwiseBays;
        
        // Create arrays with equal bay widths
        const lengthwiseBayWidths = Array(lengthwiseBays).fill(lengthwiseBayWidth);
        const widthwiseBayWidths = Array(widthwiseBays).fill(widthwiseBayWidth);
        
        return {
          lengthwiseBayWidths,
          widthwiseBayWidths
        };
      }
    } catch (error) {
      console.error("Error calculating bay dimensions:", error);
      // Return default values to avoid further errors
      return {
        lengthwiseBayWidths: [buildingData.buildingLength],
        widthwiseBayWidths: [buildingData.buildingWidth]
      };
    }
  };
  
  // Function to calculate joist size based on span, spacing, load, and fire rating
  function calculateJoistSize(span, spacing, load, timberGrade, fireRating) {
    // Call the timberEngineering function to calculate the size
    console.log("JOIST DEBUG - Calculating joist size with parameters:", { span, spacing, load, timberGrade, fireRating });
    
    try {
      // Get the mechanical properties for the timber grade
      const properties = TIMBER_PROPERTIES[timberGrade] || TIMBER_PROPERTIES.ML38;
      
      if (!properties) {
        console.error("JOIST DEBUG - Timber grade properties not found:", timberGrade);
        throw new Error(`Timber grade properties not found for ${timberGrade}`);
      }
      
      // Initialize parameters for logging
      let calculationParams = {
        span,
        spacing, 
        load,
        timberGrade,
        fireRating,
        properties
      };
      
      // ALWAYS include deflection calculation regardless of span
      console.log("JOIST DEBUG - Including deflection check for all spans");
      calculationParams.checkDeflection = true;

      // Get the joist size from the engineering module
      const result = calculateJoistSizeEngineering(
        span, 
        spacing, 
        load, 
        timberGrade, 
        fireRating
      );
      
      console.log("JOIST DEBUG - Calculation result:", result);
      
      // Return the calculated size
      return result;
    } catch (error) {
      console.error("JOIST DEBUG - Error in joist calculation:", error);
      throw error;
    }
  }
  
  // Calculate results based on inputs
  useEffect(() => {
    // Only run calculations if we have the basic required data
    if (buildingData.buildingLength && buildingData.buildingWidth && 
        buildingData.load && buildingData.fireRating) {
      console.log("JOIST DEBUG - Auto calculation triggered by input change");
      const debounceCalculation = setTimeout(() => {
        calculateResults();
      }, 500); // Debounce to prevent excessive calculations during rapid input changes
      
      return () => clearTimeout(debounceCalculation);
    }
  }, [
    buildingData.buildingLength,
    buildingData.buildingWidth,
    buildingData.load,
    buildingData.fireRating,
    buildingData.joistsRunLengthwise,
    buildingData.lengthwiseBays,
    buildingData.widthwiseBays,
    buildingData.useCustomBayDimensions,
    buildingData.customLengthwiseBayWidths,
    buildingData.customWidthwiseBayWidths
  ]);

  // Define calculateResults function
  const calculateResults = () => {
    setError(null);
    
    try {
      // Get bay dimensions
      const { lengthwiseBayWidths, widthwiseBayWidths } = calculateBayDimensions();
      
      // Find the maximum bay span (for joists)
      let maxLengthwiseSpan = Math.max(...lengthwiseBayWidths);
      let maxWidthwiseSpan = Math.max(...widthwiseBayWidths);
      
      // Determine joist span based on global direction setting
      // instead of automatically using the shorter distance
      const joistSpan = buildingData.joistsRunLengthwise ? maxLengthwiseSpan : maxWidthwiseSpan;
      
      // Calculate concrete thickness based on fire rating
      const getConcreteThickness = (frl) => {
        switch (frl) {
          case 'none':
          case '30/30/30':
          case '60/60/60':
            return 100; // 100mm for FRL 0/0/0, 30/30/30, 60/60/60
          case '90/90/90':
            return 110; // 110mm for FRL 90/90/90
          case '120/120/120':
            return 120; // 120mm for FRL 120/120/120
          default:
            return 100; // Default to 100mm
        }
      };
      
      // Calculate concrete load based on thickness
      const calculateConcreteLoad = (thickness) => {
        const CONCRETE_DENSITY = 2400; // kg/m³
        
        // Calculate concrete volume per m²
        const concreteVolumePerM2 = thickness / 1000; // m³/m² (thickness in m)
        
        // Calculate concrete mass per m²
        const concreteMassPerM2 = concreteVolumePerM2 * CONCRETE_DENSITY; // kg/m²
        
        // Convert to kPa (1 kg/m² = 0.00981 kPa)
        const concreteLoadKpa = concreteMassPerM2 * 0.00981;
        
        return {
          thickness,
          massPerM2: concreteMassPerM2.toFixed(1),
          loadKpa: concreteLoadKpa.toFixed(2)
        };
      };
      
      // Get concrete thickness and load based on current fire rating
      const concreteThickness = getConcreteThickness(buildingData.fireRating);
      const concreteLoadData = calculateConcreteLoad(concreteThickness);
      
      // Calculate total load including concrete load
      const totalLoad = parseFloat(load) + parseFloat(concreteLoadData.loadKpa);
      console.log('Total load calculation:', { 
        imposed: parseFloat(load), 
        concrete: parseFloat(concreteLoadData.loadKpa), 
        total: totalLoad 
      });
      
      // Calculate joist size based on span and load
      let joistSize;
      try {
        joistSize = calculateJoistSize(joistSpan, 800, totalLoad, timberGrade, buildingData.fireRating);
        console.log("JOIST DEBUG - Standard calculation successful:", joistSize);
        
        // Verify joist size is valid
        if (!joistSize || !joistSize.width || !joistSize.depth) {
          throw new Error("Invalid joist dimensions returned from calculation");
        }
      } catch (error) {
        console.error("JOIST DEBUG - Error in joist calculation:", error);
        // Instead of using a fallback calculation, set an error
        setError(`Joist calculation failed: ${error.message}. Please adjust your inputs and try again.`);
        return; // Exit the function early since we can't proceed without valid joist dimensions
      }
      
      // Debug joist calculation
      console.log("JOIST DEBUG - Calculated joist size:", {
        span: joistSpan,
        spacing: 800,
        totalLoad,
        timberGrade,
        fireRating: buildingData.fireRating,
        result: joistSize
      });
      
      // Calculate beam span (beams span perpendicular to joists)
      const beamSpan = buildingData.joistsRunLengthwise ? maxWidthwiseSpan : maxLengthwiseSpan;
      
      // Define joist spacing (in meters)
      const joistSpacing = 0.8; // 800mm spacing
      
      // Calculate average bay dimensions for tributary area calculation
      const avgBayLength = buildingData.buildingLength / buildingData.lengthwiseBays;
      const avgBayWidth = buildingData.buildingWidth / buildingData.widthwiseBays;
      
      // Calculate interior beam size (beams that support load from both sides)
      const interiorBeamSize = calculateMultiFloorBeamSize(
        beamSpan, 
        totalLoad, 
        joistSpacing, 
        buildingData.numFloors, 
        buildingData.fireRating, 
        buildingData.joistsRunLengthwise,
        avgBayWidth,
        avgBayLength,
        false // Not an edge beam
      );
      
      // Calculate edge beam size (beams that support load from one side only)
      const edgeBeamSize = calculateMultiFloorBeamSize(
        beamSpan, 
        totalLoad,
        joistSpacing, 
        buildingData.numFloors, 
        buildingData.fireRating,
        buildingData.joistsRunLengthwise,
        avgBayWidth,
        avgBayLength,
        true // Is an edge beam
      );
      
      // Calculate column size
      const columnSize = calculateMultiFloorColumnSize(
        interiorBeamSize.width, // Match column width to beam width
        totalLoad, // Use the same total load including concrete
        buildingData.floorHeight, 
        buildingData.numFloors, 
        buildingData.fireRating,
        avgBayLength,
        avgBayWidth
      );
      
      // Calculate timber volume and weight
      const timberResult = calculateTimberWeight(
        joistSize, 
        interiorBeamSize,
        columnSize, 
        buildingData.buildingLength, 
        buildingData.buildingWidth, 
        buildingData.numFloors,
        buildingData.lengthwiseBays,
        buildingData.widthwiseBays,
        buildingData.joistsRunLengthwise,
        timberGrade
      );
      
      // Calculate manually as a cross-check
      const manualBeamVolume = calculateBeamVolume(
        interiorBeamSize, 
        edgeBeamSize, 
        buildingData.buildingLength, 
        buildingData.buildingWidth, 
        buildingData.lengthwiseBays, 
        buildingData.widthwiseBays
      );
      
      const manualColumnVolume = calculateColumnVolume(
        columnSize, 
        buildingData.floorHeight, 
        buildingData.numFloors, 
        buildingData.lengthwiseBays, 
        buildingData.widthwiseBays
      );
      
      // Calculate carbon benefits
      const carbonResults = calculateCarbonSavings(timberResult);
      
      // Calculate costs
      const costs = calculateCost(
        joistSize,
        interiorBeamSize,
        edgeBeamSize,
        columnSize,
        buildingData.buildingLength,
        buildingData.buildingWidth,
        buildingData.lengthwiseBays,
        buildingData.widthwiseBays,
        buildingData.numFloors,
        joistSpacing,
        buildingData.joistsRunLengthwise
      );
      
      // Validate the structure
      const validationResult = validateStructure(joistSize, interiorBeamSize, columnSize);
      
      // Create a structure to hold detailed results
      const finalResults = {
        joistSize,
        interiorBeamSize,
        edgeBeamSize,
        columnSize,
        joistSpan,
        beamSpan: beamSpan,
        joistsRunLengthwise: buildingData.joistsRunLengthwise,
        buildingLength: buildingData.buildingLength,
        buildingWidth: buildingData.buildingWidth,
        lengthwiseBays: buildingData.lengthwiseBays,
        widthwiseBays: buildingData.widthwiseBays,
        widthwiseBayWidths,
        lengthwiseBayWidths,
        concreteData: concreteLoadData,
        totalLoad: totalLoad,
        timberVolume: timberResult.totalVolume,
        timberWeight: timberResult.weight,
        embodiedCarbon: carbonResults.embodiedCarbon,
        carbonSavings: carbonResults.carbonSavings,
        costs,
        elementCounts: {
          joists: timberResult.elements.joists.count,
          beams: timberResult.elements.beams.count,
          columns: timberResult.elements.columns.count
        },
        elementVolumes: {
          joists: timberResult.elements.joists.volume,
          beams: timberResult.elements.beams.volume,
          columns: timberResult.elements.columns.volume
        },
        debug: {
          timberResult: JSON.parse(JSON.stringify(timberResult)),
          mockTimberResult: {
            beams: {
              volume: manualBeamVolume
            },
            columns: {
              volume: manualColumnVolume
            }
          },
          rawCosts: JSON.parse(JSON.stringify(costs))
        },
        validationResult
      };
      
      // Update the results state
      setResults(finalResults);
      
      // Use the specialized function for updating results in context
      updateCalculationResults(finalResults);
      
      // Prepare and save data for 3D visualization
      const visualizationData = prepareVisualizationData({
        buildingLength: buildingData.buildingLength,
        buildingWidth: buildingData.buildingWidth,
        numFloors: buildingData.numFloors,
        floorHeight: buildingData.floorHeight,
        lengthwiseBays: buildingData.lengthwiseBays,
        widthwiseBays: buildingData.widthwiseBays,
        joistSize,
        beamSize: interiorBeamSize,
        edgeBeamSize,
        columnSize,
        joistsRunLengthwise: buildingData.joistsRunLengthwise,
        fireRating: buildingData.fireRating,
        timberGrade
      });
      saveBuildingData(visualizationData);
    } catch (error) {
      console.error('Error calculating results:', error);
      setError('Error calculating results: ' + error.message);
    }
  };

  // Ensure results state is updated when buildingData.results changes
  useEffect(() => {
    if (buildingData.results && JSON.stringify(buildingData.results) !== JSON.stringify(results)) {
      setResults(buildingData.results);
    }
  }, [buildingData.results]);

  // Handle input changes
  const handleBuildingLengthChange = (value) => {
    // Add safety check for null or undefined values
    if (value === null || value === undefined) {
      console.warn("Invalid value passed to handleBuildingLengthChange:", value);
      return;
    }
    
    const parsedValue = parseFloat(value.toString());
    if (!isNaN(parsedValue) && parsedValue >= 6 && parsedValue <= 80) {
      updateBuildingData('buildingLength', parsedValue);
    }
  };

  const handleBuildingWidthChange = (value) => {
    // Add safety check for null or undefined values
    if (value === null || value === undefined) {
      console.warn("Invalid value passed to handleBuildingWidthChange:", value);
      return;
    }
    
    const parsedValue = parseFloat(value.toString());
    if (!isNaN(parsedValue) && parsedValue >= 6 && parsedValue <= 80) {
      updateBuildingData('buildingWidth', parsedValue);
    }
  };

  const handleLengthwiseBaysChange = (value) => {
    // Add safety check for null or undefined values
    if (value === null || value === undefined) {
      console.warn("Invalid value passed to handleLengthwiseBaysChange:", value);
      return;
    }
    
    const parsedValue = parseInt(value.toString(), 10);
    if (!isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 20) {
      // Add safety check for maxBaySpan
      const safeMaxBaySpan = (typeof buildingData.maxBaySpan === 'number' && !isNaN(buildingData.maxBaySpan) && buildingData.maxBaySpan > 0) 
        ? buildingData.maxBaySpan 
        : 9.0; // Default fallback
      
      // Calculate minimum required bays based on maxBaySpan
      const minRequiredBays = Math.ceil(buildingData.buildingLength / safeMaxBaySpan);
      
      // Ensure the number of bays doesn't go below the minimum required
      const validBayCount = Math.max(parsedValue, minRequiredBays);
      
      updateBuildingData('lengthwiseBays', validBayCount);
      
      // If the value was adjusted, show a notification or alert
      if (validBayCount !== parsedValue) {
        // Format maxBaySpan to one decimal place for display
        const formattedMaxSpan = (Math.round(safeMaxBaySpan * 10) / 10).toFixed(1);
        
        alert(`The minimum number of bays required for this building length is ${minRequiredBays} to maintain a maximum span of ${formattedMaxSpan}m.`);
      }
    }
  };

  const handleWidthwiseBaysChange = (value) => {
    // Add safety check for null or undefined values
    if (value === null || value === undefined) {
      console.warn("Invalid value passed to handleWidthwiseBaysChange:", value);
      return;
    }
    
    const parsedValue = parseInt(value.toString(), 10);
    if (!isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 20) {
      // Add safety check for maxBaySpan
      const safeMaxBaySpan = (typeof buildingData.maxBaySpan === 'number' && !isNaN(buildingData.maxBaySpan) && buildingData.maxBaySpan > 0) 
        ? buildingData.maxBaySpan 
        : 9.0; // Default fallback
      
      // Calculate minimum required bays based on maxBaySpan
      const minRequiredBays = Math.ceil(buildingData.buildingWidth / safeMaxBaySpan);
      
      // Ensure the number of bays doesn't go below the minimum required
      const validBayCount = Math.max(parsedValue, minRequiredBays);
      
      updateBuildingData('widthwiseBays', validBayCount);
      
      // If the value was adjusted, show a notification or alert
      if (validBayCount !== parsedValue) {
        // Format maxBaySpan to one decimal place for display
        const formattedMaxSpan = (Math.round(safeMaxBaySpan * 10) / 10).toFixed(1);
        
        alert(`The minimum number of bays required for this building width is ${minRequiredBays} to maintain a maximum span of ${formattedMaxSpan}m.`);
      }
    }
  };

  const handleNumFloorsChange = (value) => {
    // Add safety check for null or undefined values
    if (value === null || value === undefined) {
      console.warn("Invalid value passed to handleNumFloorsChange:", value);
      return;
    }
    
    const floors = parseInt(value.toString(), 10);
    if (!isNaN(floors) && floors >= 1 && floors <= 10) {
      updateBuildingData('numFloors', floors);
    }
  };

  const handleFloorHeightChange = (value) => {
    // Add safety check for null or undefined values
    if (value === null || value === undefined) {
      console.warn("Invalid value passed to handleFloorHeightChange:", value);
      return;
    }
    
    const height = parseFloat(value.toString());
    if (!isNaN(height) && height >= 2 && height <= 6) {
      updateBuildingData('floorHeight', height);
    }
  };

  const handleLoadChange = (value) => {
    // Add safety check for null or undefined values
    if (value === null || value === undefined) {
      console.warn("Invalid value passed to handleLoadChange:", value);
      return;
    }
    
    const load = parseFloat(value.toString());
    if (!isNaN(load)) {
      updateBuildingData('load', load);
    }
  };

  const onFireRatingChange = (value) => {
    // Add safety check for null or undefined values
    if (value === null || value === undefined) {
      console.warn("Invalid value passed to onFireRatingChange:", value);
      return;
    }
    
    // Use the handler from our hook
    fireResistanceHandleFireRatingChange(value);
  };
  
  // Handlers for custom bay dimensions
  const handleToggleCustomBayDimensions = () => {
    updateBuildingData('useCustomBayDimensions', !buildingData.useCustomBayDimensions);
  };
  
  const handleLengthwiseBayWidthChange = (index, value) => {
    // Validate index
    if (index < 0 || index >= buildingData.customLengthwiseBayWidths.length) {
      console.error("Invalid lengthwise bay index:", index);
      return;
    }
    
    // Parse and validate the value
    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      console.error("Invalid bay width:", value);
      return;
    }
    
    // Create a copy of the current widths
    const newWidths = [...buildingData.customLengthwiseBayWidths];
    
    // Update the changed bay width
    newWidths[index] = parsedValue;
    
    // If the difference would make the total exceed or fall below the building length,
    // distribute the difference among other bays proportionally
    const newTotal = newWidths.reduce((sum, width) => sum + width, 0);
    
    if (Math.abs(newTotal - buildingData.buildingLength) > 0.01) {
      // Calculate how much we need to adjust other bays
      const adjustment = buildingData.buildingLength - newTotal;
      
      // Get the sum of all other bay widths
      const otherBaysSum = newWidths.reduce((sum, width, i) => 
        i === index ? sum : sum + width, 0);
      
      if (otherBaysSum > 0) {
        // Distribute the adjustment proportionally among other bays
        newWidths.forEach((width, i) => {
          if (i !== index) {
            // Calculate the proportion of this bay to all other bays
            const proportion = width / otherBaysSum;
            // Apply the adjustment proportionally
            newWidths[i] += adjustment * proportion;
            // Ensure the bay width is not less than the minimum
            if (newWidths[i] < 0.5) {
              newWidths[i] = 0.5;
            }
          }
        });
      }
    }
    
    // Update the state
    updateBuildingData('customLengthwiseBayWidths', newWidths);
  };
  
  const handleWidthwiseBayWidthChange = (index, value) => {
    console.log(`Changing widthwise bay ${index} width to ${value}`);
    if (value === '' || isNaN(value) || value <= 0) {
      // If invalid input, don't update
      return;
    }

    // Convert to number
    const numValue = parseFloat(value);
    
    // Create new array by copying current widths
    const newWidths = [...buildingData.customWidthwiseBayWidths];
    
    // Record old width for proportional adjustment
    const oldWidth = newWidths[index];
    
    // Update width at specified index
    newWidths[index] = numValue;
    
    // If proportional adjustment is enabled, adjust other bay widths
    if (proportionalAdjustment) {
      // Calculate total width of other bays
      const otherBaysSum = newWidths.reduce((sum, width, i) => 
        i === index ? sum : sum + width, 0);
      
      // Calculate the width difference
      const widthDiff = numValue - oldWidth;
      
      // Adjust other widths proportionally
      for (let i = 0; i < newWidths.length; i++) {
        if (i !== index) {
          const width = newWidths[i];
          const proportion = width / otherBaysSum;
          newWidths[i] = Math.max(0.5, width - (widthDiff * proportion));
        }
      }
    }
    
    // Update building data with new widths
    updateBuildingData('customWidthwiseBayWidths', newWidths);
  };
  
  // Toggle joist direction globally
  const toggleJoistDirection = () => {
    updateBuildingData('joistsRunLengthwise', !buildingData.joistsRunLengthwise);
  };
  
  // Handler for timber grade changes
  const handleTimberGradeChange = (value) => {
    updateBuildingData('timberGrade', value);
  };
  
  // Example of a component section converted to use Tailwind classes
  return (
    <div className="apple-section">
      <div className="flex justify-between items-center mb-12">
        <h1 style={{ color: 'var(--apple-text)' }}>Member Calculator</h1>
          </div>
      
      {/* Success Message */}
      <SuccessMessage 
        message={saveMessage} 
        onDismiss={() => setSaveMessage(null)} 
      />
      
      {/* Save Project Modal */}
      <SaveProjectModal
        show={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={saveProject}
        projectDetails={projectDetails}
        setProjectDetails={setProjectDetails}
      />
      
      <div className="apple-grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
        {/* Config Panel */}
        <div className="lg:col-span-6 xl:col-span-5 w-full">
          <div className="apple-card">
            <div className="apple-card-header flex justify-between items-center">
              <h2 className="text-lg md:text-xl font-semibold m-0">Configuration</h2>
            </div>
            
            <div className="apple-card-body">
              {/* Dimensions Section */}
              <DimensionsSection 
                buildingLength={buildingData.buildingLength}
                buildingWidth={buildingData.buildingWidth}
                numFloors={buildingData.numFloors}
                floorHeight={buildingData.floorHeight}
                lengthwiseBays={buildingData.lengthwiseBays}
                widthwiseBays={buildingData.widthwiseBays}
                onBuildingLengthChange={handleBuildingLengthChange}
                onBuildingWidthChange={handleBuildingWidthChange}
                onLengthwiseBaysChange={handleLengthwiseBaysChange}
                onWidthwiseBaysChange={handleWidthwiseBaysChange}
                onNumFloorsChange={handleNumFloorsChange}
                onFloorHeightChange={handleFloorHeightChange}
                maxBaySpan={buildingData.maxBaySpan}
              />
              
              {/* Structure Configuration Section */}
              <StructureConfigSection 
                joistsRunLengthwise={buildingData.joistsRunLengthwise}
                onToggleJoistDirection={toggleJoistDirection}
                buildingLength={buildingData.buildingLength}
                buildingWidth={buildingData.buildingWidth}
                useCustomBayDimensions={buildingData.useCustomBayDimensions}
                onToggleCustomBayDimensions={handleToggleCustomBayDimensions}
                customLengthwiseBayWidths={buildingData.customLengthwiseBayWidths}
                customWidthwiseBayWidths={buildingData.customWidthwiseBayWidths}
                onLengthwiseBayWidthChange={handleLengthwiseBayWidthChange}
                onWidthwiseBayWidthChange={handleWidthwiseBayWidthChange}
                lengthwiseBays={buildingData.lengthwiseBays}
                widthwiseBays={buildingData.widthwiseBays}
                maxBaySpan={buildingData.maxBaySpan}
                isMobile={isMobile}
              />
              
              {/* Loading Parameters Section */}
              <div className="apple-specs-table mb-6 md:mb-8">
                <h3 className="text-md md:text-lg font-semibold mb-4 md:mb-6">Loading Parameters</h3>
                
                {/* Load Type Selector */}
                <LoadTypeSelector 
                  value={buildingData.load}
                  onChange={handleLoadChange}
                />
                
                {/* Fire Rating Selector */}
                <FireRatingSelector 
                  selectedRating={buildingData.fireRating}
                  onChange={onFireRatingChange}
                />
                
                {/* Add the non-visible FireResistanceCalculator to handle calculations */}
                {/* <FireResistanceCalculator standalone={false} /> */}
                
                {/* Calculate Button - REMOVED for automatic calculation */}
                {/* Auto-calculation happens whenever inputs change */}
                
              </div>
                      
              {/* Note: Timber Grade moved to Calculation Methodology Page */}
            </div>
          </div>
        </div>
              
        {/* Results Panel */}
        <div className="lg:col-span-6 xl:col-span-7 w-full">
          <ResultsDisplay 
            results={results}
            onSaveClick={() => setShowSaveModal(true)}
            isMobile={isMobile}
          />
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4" role="alert">
          <div className="font-bold">Error</div>
          <div>{error}</div>
        </div>
      )}
      
      {/* CSV Loading Error Display */}
      {(csvLoadingErrors.properties || csvLoadingErrors.sizes) && (
        <div className="apple-section mt-4">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">CSV Data Issue: </strong>
            <span className="block sm:inline">
              {csvLoadingErrors.properties && csvLoadingErrors.sizes 
                ? "Unable to load required CSV data files for mechanical properties and timber sizes. The application is using built-in default values which may not reflect the latest product specifications."
                : csvLoadingErrors.properties 
                  ? "Unable to load the mechanical properties CSV file. The application is using built-in default values for timber strength properties."
                  : "Unable to load the timber sizes CSV file. The application is using built-in default values for available timber dimensions, which may not include all current product options."
              }
              <br />
              <span className="mt-2 block text-sm">
                This may affect the accuracy of calculations. Please ensure the CSV files are correctly formatted and accessible.
              </span>
            </span>
          </div>
        </div>
      )}
      
    </div>
  );
}