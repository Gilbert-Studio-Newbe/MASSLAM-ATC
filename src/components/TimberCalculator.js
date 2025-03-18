"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  calculateJoistSize, 
  calculateBeamSize, 
  calculateColumnSize,
  calculateTimberWeight,
  calculateCarbonSavings,
  validateStructure,
  TIMBER_PROPERTIES,
  loadTimberProperties
} from '@/utils/timberEngineering';
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
} from '@/utils/timberSizes';
import { calculateFireResistanceAllowance, getMasslamSL33Properties } from '@/utils/masslamProperties';
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
  // State variables for project details and save modal
  const [projectDetails, setProjectDetails] = useState({
    name: 'New Timber Structure',
    client: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState(null);
  
  // Mobile detection state
  const [isMobile, setIsMobile] = useState(false);

  const [results, setResults] = useState(null);
  
  // Building dimension state variables
  const [buildingLength, setBuildingLength] = useState(18);    // Default 18m
  const [buildingWidth, setBuildingWidth] = useState(14);      // Default 14m
  const [lengthwiseBays, setLengthwiseBays] = useState(3);    // Default 3 bays for 18m length
  const [widthwiseBays, setWidthwiseBays] = useState(2);      // Default 2 bays for 14m width
  
  // Add a new state variable for number of floors
  const [numFloors, setNumFloors] = useState(6); // Default to 6 floors
  
  // Add a new state variable for floor height
  const [floorHeight, setFloorHeight] = useState(3.2); // Default to 3.2m
  
  // Custom bay dimensions state variables
  const [customLengthwiseBayWidths, setCustomLengthwiseBayWidths] = useState([]);
  const [customWidthwiseBayWidths, setCustomWidthwiseBayWidths] = useState([]);
  const [useCustomBayDimensions, setUseCustomBayDimensions] = useState(false);
  
  // Maximum allowed span for a single bay (in meters)
  const MAX_BAY_SPAN = 9.0;
  
  // Add state variable for global joist direction
  const [joistsRunLengthwise, setJoistsRunLengthwise] = useState(false);
  const firstRender = useRef(true);
  
  // Set initial joist direction based on building dimensions
  useEffect(() => {
    // By default, joists should span the shorter distance
    // This is just for initial setup - after that, the user can toggle
    // Only set the direction on the first render, not when dimensions change
    if (firstRender.current) {
    setJoistsRunLengthwise(buildingWidth > buildingLength);
      firstRender.current = false;
    }
  }, [buildingLength, buildingWidth]);
  
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
          setBuildingLength(parsedState.buildingLength || 18);
          setBuildingWidth(parsedState.buildingWidth || 14);
          setLengthwiseBays(parsedState.lengthwiseBays || 3);
          setWidthwiseBays(parsedState.widthwiseBays || 2);
          setNumFloors(parsedState.numFloors || 1);
          setFloorHeight(parsedState.floorHeight || 3.5);
          setLoad(parsedState.load || 3.0);
          setFireRating(parsedState.fireRating || 'none');
          setJoistsRunLengthwise(parsedState.joistsRunLengthwise !== undefined ? parsedState.joistsRunLengthwise : true);
          setTimberGrade(parsedState.timberGrade || 'ML38');
          setUseCustomBayDimensions(parsedState.useCustomBayDimensions || false);
          
          // Only set custom bay widths if they exist and match the current number of bays
          if (parsedState.customLengthwiseBayWidths && parsedState.customLengthwiseBayWidths.length === parsedState.lengthwiseBays) {
            setCustomLengthwiseBayWidths(parsedState.customLengthwiseBayWidths);
          }
          
          if (parsedState.customWidthwiseBayWidths && parsedState.customWidthwiseBayWidths.length === parsedState.widthwiseBays) {
            setCustomWidthwiseBayWidths(parsedState.customWidthwiseBayWidths);
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
          setBuildingLength(project.buildingLength);
          setBuildingWidth(project.buildingWidth);
          setLengthwiseBays(project.lengthwiseBays);
          setWidthwiseBays(project.widthwiseBays);
          setNumFloors(project.numFloors);
          
          // Load floor height if available
          if (project.floorHeight !== undefined) {
            setFloorHeight(project.floorHeight);
          }
          
          // Load other settings
          setFireRating(project.fireRating);
          setLoad(project.load);
          
          // Load joist direction if available
          if (project.joistsRunLengthwise !== undefined) {
            setJoistsRunLengthwise(project.joistsRunLengthwise);
          }
          
          // Load custom bay dimensions if available
          if (project.customBayDimensions) {
            setUseCustomBayDimensions(true);
            if (project.customBayDimensions.lengthwiseBayWidths) {
              setCustomLengthwiseBayWidths(project.customBayDimensions.lengthwiseBayWidths);
            }
            if (project.customBayDimensions.widthwiseBayWidths) {
              setCustomWidthwiseBayWidths(project.customBayDimensions.widthwiseBayWidths);
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
  }, []);
  
  // Automatically adjust bays when dimensions change
  useEffect(() => {
    // Calculate current bay sizes
    const currentLengthwiseBaySize = buildingLength / lengthwiseBays;
    const currentWidthwiseBaySize = buildingWidth / widthwiseBays;
    
    // Check if bay sizes exceed maximum allowed span
    let newLengthwiseBays = lengthwiseBays;
    let newWidthwiseBays = widthwiseBays;
    
    if (currentLengthwiseBaySize > MAX_BAY_SPAN) {
      // Calculate minimum number of bays needed to keep span under maximum
      newLengthwiseBays = Math.ceil(buildingLength / MAX_BAY_SPAN);
    }
    
    if (currentWidthwiseBaySize > MAX_BAY_SPAN) {
      // Calculate minimum number of bays needed to keep span under maximum
      newWidthwiseBays = Math.ceil(buildingWidth / MAX_BAY_SPAN);
    }
    
    // Update bay counts if needed
    if (newLengthwiseBays !== lengthwiseBays) {
      setLengthwiseBays(newLengthwiseBays);
    }
    
    if (newWidthwiseBays !== widthwiseBays) {
      setWidthwiseBays(newWidthwiseBays);
    }
  }, [buildingLength, buildingWidth]);
  
  const [fireRating, setFireRating] = useState('none');
  const [load, setLoad] = useState(2); // kPa (updated from 1.5 to 2)
  
  // Constants
  const structureType = 'floor'; // Fixed to floor
  
  // Add state for timber properties
  const [timberGrade, setTimberGrade] = useState('ML38');
  const [propertiesLoaded, setPropertiesLoaded] = useState(false);
  const [csvLoadingErrors, setCsvLoadingErrors] = useState({
    properties: false,
    sizes: false
  });
  
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
        buildingLength,
        buildingWidth,
        lengthwiseBays,
        widthwiseBays,
        numFloors,
        floorHeight,
        load,
        fireRating,
        joistsRunLengthwise,
        customBayDimensions: useCustomBayDimensions ? {
          lengthwiseBayWidths: customLengthwiseBayWidths,
          widthwiseBayWidths: customWidthwiseBayWidths
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
        buildingLength,
        buildingWidth,
        lengthwiseBays,
        widthwiseBays,
        numFloors,
        floorHeight,
        load,
        fireRating,
        joistsRunLengthwise,
        timberGrade,
        useCustomBayDimensions,
        customLengthwiseBayWidths,
        customWidthwiseBayWidths
      };
      
      // Save to localStorage
      localStorage.setItem('timberCalculatorState', JSON.stringify(currentState));
      console.log('Saved current state to localStorage');
    } catch (error) {
      console.error('Error saving state to localStorage:', error);
    }
  }, [
    buildingLength,
    buildingWidth,
    lengthwiseBays,
    widthwiseBays,
    numFloors,
    floorHeight,
    load,
    fireRating,
    joistsRunLengthwise,
    timberGrade,
    useCustomBayDimensions,
    customLengthwiseBayWidths,
    customWidthwiseBayWidths
  ]);
  
  // Add a beforeunload event listener to save state before navigating away
  useEffect(() => {
    const saveStateBeforeUnload = () => {
      try {
        // Create state object with all relevant design parameters
        const currentState = {
          buildingLength,
          buildingWidth,
          lengthwiseBays,
          widthwiseBays,
          numFloors,
          floorHeight,
          load,
          fireRating,
          joistsRunLengthwise,
          timberGrade,
          useCustomBayDimensions,
          customLengthwiseBayWidths,
          customWidthwiseBayWidths
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
    buildingLength,
    buildingWidth,
    lengthwiseBays,
    widthwiseBays,
    numFloors,
    floorHeight,
    load,
    fireRating,
    joistsRunLengthwise,
    timberGrade,
    useCustomBayDimensions,
    customLengthwiseBayWidths,
    customWidthwiseBayWidths
  ]);
  
  // Initialize custom bay dimensions when the number of bays changes
  useEffect(() => {
    // Initialize lengthwise bay widths with equal distribution
    const defaultLengthwiseBayWidth = buildingLength / lengthwiseBays;
    setCustomLengthwiseBayWidths(Array(lengthwiseBays).fill(defaultLengthwiseBayWidth));
    
    // Initialize widthwise bay widths with equal distribution
    const defaultWidthwiseBayWidth = buildingWidth / widthwiseBays;
    setCustomWidthwiseBayWidths(Array(widthwiseBays).fill(defaultWidthwiseBayWidth));
  }, [lengthwiseBays, widthwiseBays, buildingLength, buildingWidth]);

  // Calculate bay dimensions based on whether custom dimensions are used
  const calculateBayDimensions = () => {
    if (!useCustomBayDimensions) {
      // Use equal distribution
      return {
        lengthwiseBayWidths: Array(lengthwiseBays).fill(buildingLength / lengthwiseBays),
        widthwiseBayWidths: Array(widthwiseBays).fill(buildingWidth / widthwiseBays)
      };
    }
    
    // Ensure the sum of custom dimensions matches the building dimensions
    const totalLengthwise = customLengthwiseBayWidths.reduce((sum, width) => sum + width, 0);
    const totalWidthwise = customWidthwiseBayWidths.reduce((sum, width) => sum + width, 0);
    
    // Normalize if needed
    let normalizedLengthwiseBayWidths = [...customLengthwiseBayWidths];
    let normalizedWidthwiseBayWidths = [...customWidthwiseBayWidths];
    
    if (Math.abs(totalLengthwise - buildingLength) > 0.01) {
      const scaleFactor = buildingLength / totalLengthwise;
      normalizedLengthwiseBayWidths = customLengthwiseBayWidths.map(width => width * scaleFactor);
    }
    
    if (Math.abs(totalWidthwise - buildingWidth) > 0.01) {
      const scaleFactor = buildingWidth / totalWidthwise;
      normalizedWidthwiseBayWidths = customWidthwiseBayWidths.map(width => width * scaleFactor);
    }
    
    return {
      lengthwiseBayWidths: normalizedLengthwiseBayWidths,
      widthwiseBayWidths: normalizedWidthwiseBayWidths
    };
  };
  
  // Define calculateResults outside of useEffect so it can be called from anywhere
    const calculateResults = () => {
      try {
        // Get bay dimensions
        const { lengthwiseBayWidths, widthwiseBayWidths } = calculateBayDimensions();
        
        // Find the maximum bay span (for joists)
        let maxLengthwiseSpan = Math.max(...lengthwiseBayWidths);
        let maxWidthwiseSpan = Math.max(...widthwiseBayWidths);
        
        // Determine joist span based on global direction setting
        // instead of automatically using the shorter distance
        const joistSpan = joistsRunLengthwise ? maxLengthwiseSpan : maxWidthwiseSpan;
        
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
        const concreteThickness = getConcreteThickness(fireRating);
        const concreteLoadData = calculateConcreteLoad(concreteThickness);
        
        // Calculate total load including concrete load
        const totalLoad = parseFloat(load) + parseFloat(concreteLoadData.loadKpa);
        console.log('Total load calculation:', { 
          imposed: parseFloat(load), 
          concrete: parseFloat(concreteLoadData.loadKpa), 
          total: totalLoad 
        });
        
        // Calculate joist size based on span and load
        const joistSize = calculateJoistSize(joistSpan, 800, load, timberGrade, fireRating);
        
        // Calculate beam span (beams span perpendicular to joists)
        const beamSpan = joistsRunLengthwise ? maxWidthwiseSpan : maxLengthwiseSpan;
        
        // Define joist spacing (in meters)
        const joistSpacing = 0.8; // 800mm spacing
        
        // Calculate average bay dimensions for tributary area calculation
        const avgBayLength = buildingLength / lengthwiseBays;
        const avgBayWidth = buildingWidth / widthwiseBays;
        
      // Calculate interior beam size (beams that support load from both sides)
      // These beams have a tributary width of half the perpendicular bay dimension
      const interiorBeamSize = calculateMultiFloorBeamSize(
        beamSpan, 
        totalLoad, // Use combined load 
        joistSpacing, 
        numFloors, 
        fireRating, 
        joistsRunLengthwise,
        avgBayWidth,
        avgBayLength,
        false // Not an edge beam
      );
      
      // Calculate edge beam size (beams that support load from one side only)
      // These beams have a tributary width of half the perpendicular bay dimension
      const edgeBeamSize = calculateMultiFloorBeamSize(
        beamSpan, 
        totalLoad, // Use combined load
        joistSpacing, 
        numFloors, 
        fireRating,
        joistsRunLengthwise,
        avgBayWidth,
        avgBayLength,
        true // Is an edge beam
      );
      
      // Calculate column size
      // Columns support the load from the beams
      // Tributary area is the bay area (length x width)
      const columnSize = calculateMultiFloorColumnSize(
        interiorBeamSize.width, // Match column width to beam width
        totalLoad, // Use the same total load including concrete
        floorHeight, 
        numFloors, 
        fireRating,
        avgBayLength,
        avgBayWidth
      );
      
      // Calculate timber volume and weight using the existing function
        const timberResult = calculateTimberWeight(
          joistSize, 
        interiorBeamSize,
          columnSize, 
          buildingLength, 
          buildingWidth, 
          numFloors,
          lengthwiseBays,
          widthwiseBays,
          joistsRunLengthwise,
          timberGrade
        );
        
      // Calculate carbon benefits
      const carbonResults = calculateCarbonSavings(timberResult);
        
      // Calculate costs
      const costs = calculateCosts(joistSize, interiorBeamSize, edgeBeamSize, columnSize, buildingLength, buildingWidth, joistSpacing, lengthwiseBays, widthwiseBays, floorHeight, numFloors);
      
      // Detailed cost tracing to find the issue
      console.log("RESULTS DEBUG - Costs object from calculateCosts:", JSON.stringify(costs, null, 2));
      console.log("RESULTS DEBUG - Beam cost value:", costs.elements.beams.cost);
      console.log("RESULTS DEBUG - Calculation check:", costs.elements.beams.volume * costs.elements.beams.rate);
        
      // Validate the structure - simplified call with correct parameters
      const validationResult = validateStructure(joistSize, interiorBeamSize, columnSize);
        
        // Create a structure to hold detailed results
        const finalResults = {
          joistSize,
          interiorBeamSize,
          edgeBeamSize,
          columnSize,
          joistSpan,
          beamSpan: beamSpan,
          joistsRunLengthwise,
          buildingLength,
          buildingWidth,
          lengthwiseBays,
          widthwiseBays,
          widthwiseBayWidths,
          lengthwiseBayWidths,
          concreteData: concreteLoadData,
          totalLoad: totalLoad,
          embodiedCarbon: carbonResults.embodiedCarbon,
          carbonSavings: carbonResults.carbonSavings,
          costs,
          elementCounts: {
            joists: timberResult.elements.joists.count,
            beams: timberResult.elements.beams.count,
            columns: timberResult.elements.columns.count
          },
          elementVolumes: {
            // Use floor area calculation for joists (m²) - this is what the cost calculation expects
            joists: buildingLength * buildingWidth * numFloors,
            beams: timberResult.elements.beams.volume,
            columns: timberResult.elements.columns.volume
          },
          // Add debugging information to results
          debug: {
            timberResult: JSON.parse(JSON.stringify(timberResult)),
            mockTimberResult: {
              beams: {
                volume: calculateBeamVolume(interiorBeamSize, edgeBeamSize, buildingLength, buildingWidth, lengthwiseBays, widthwiseBays)
              },
              columns: {
                volume: calculateColumnVolume(columnSize, floorHeight, numFloors, lengthwiseBays, widthwiseBays)
              }
            },
            rawCosts: JSON.parse(JSON.stringify(costs))
          },
          buildingLength,
          buildingWidth,
          lengthwiseBays,
          widthwiseBays,
          validationResult
        };
      
      console.log("RESULTS DEBUG - Final results beam cost:", finalResults.costs.elements.beams.cost);
      
      setResults(finalResults);
      
      // Prepare and save data for 3D visualization
      const visualizationData = prepareVisualizationData({
        buildingLength,
        buildingWidth,
        numFloors,
        floorHeight,
        lengthwiseBays,
        widthwiseBays,
        joistSize,
        beamSize: interiorBeamSize,
        edgeBeamSize,
        columnSize,
        joistsRunLengthwise,
        fireRating,
        timberGrade
      });
      saveBuildingData(visualizationData);
    } catch (error) {
      console.error('Error calculating results:', error);
      setError('Error calculating results: ' + error.message);
    }
  };
  
  // Calculate results based on inputs
  useEffect(() => {
    // Only calculate if properties are loaded
    if (propertiesLoaded) {
      calculateResults();
    }
  }, [
    buildingLength,
    buildingWidth,
    lengthwiseBays,
    widthwiseBays,
    numFloors,
    floorHeight,
    load,
    fireRating,
    joistsRunLengthwise,
    timberGrade,
    useCustomBayDimensions,
    customLengthwiseBayWidths,
    customWidthwiseBayWidths,
    propertiesLoaded
  ]);

  // Handle input changes
  const handleBuildingLengthChange = (value) => {
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue) && parsedValue >= 6 && parsedValue <= 80) {
      setBuildingLength(parsedValue);
    }
  };

  const handleBuildingWidthChange = (value) => {
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue) && parsedValue >= 6 && parsedValue <= 80) {
      setBuildingWidth(parsedValue);
    }
  };

  const handleLengthwiseBaysChange = (value) => {
    const parsedValue = parseInt(value, 10);
    if (!isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 20) {
      // Calculate minimum required bays based on MAX_BAY_SPAN
      const minRequiredBays = Math.ceil(buildingLength / MAX_BAY_SPAN);
      
      // Ensure the number of bays doesn't go below the minimum required
      const validBayCount = Math.max(parsedValue, minRequiredBays);
      
      setLengthwiseBays(validBayCount);
      
      // If the value was adjusted, show a notification or alert
      if (validBayCount !== parsedValue) {
        alert(`The minimum number of bays required for this building length is ${minRequiredBays} to maintain a maximum span of ${MAX_BAY_SPAN}m.`);
      }
    }
  };

  const handleWidthwiseBaysChange = (value) => {
    const parsedValue = parseInt(value, 10);
    if (!isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 20) {
      // Calculate minimum required bays based on MAX_BAY_SPAN
      const minRequiredBays = Math.ceil(buildingWidth / MAX_BAY_SPAN);
      
      // Ensure the number of bays doesn't go below the minimum required
      const validBayCount = Math.max(parsedValue, minRequiredBays);
      
      setWidthwiseBays(validBayCount);
      
      // If the value was adjusted, show a notification or alert
      if (validBayCount !== parsedValue) {
        alert(`The minimum number of bays required for this building width is ${minRequiredBays} to maintain a maximum span of ${MAX_BAY_SPAN}m.`);
      }
    }
  };

  const handleNumFloorsChange = (value) => {
    const floors = parseInt(value, 10);
    if (!isNaN(floors) && floors >= 1 && floors <= 10) {
      setNumFloors(floors);
    }
  };

  const handleFloorHeightChange = (value) => {
    const height = parseFloat(value);
    if (!isNaN(height) && height >= 2 && height <= 6) {
      setFloorHeight(height);
    }
  };

  const handleLoadChange = (value) => {
    setLoad(value);
  };

  const handleFireRatingChange = (value) => {
    setFireRating(value);
  };
  
  // Handlers for custom bay dimensions
  const handleToggleCustomBayDimensions = () => {
    setUseCustomBayDimensions(!useCustomBayDimensions);
  };
  
  const handleLengthwiseBayWidthChange = (index, value) => {
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue) && parsedValue > 0) {
      // Calculate the difference between the new value and the old value
      const oldValue = customLengthwiseBayWidths[index];
      const difference = parsedValue - oldValue;
      
      // Create a copy of the current widths
      const newWidths = [...customLengthwiseBayWidths];
      
      // Update the changed bay width
      newWidths[index] = parsedValue;
      
      // If the difference would make the total exceed or fall below the building length,
      // distribute the difference among other bays proportionally
      const newTotal = newWidths.reduce((sum, width) => sum + width, 0);
      
      if (Math.abs(newTotal - buildingLength) > 0.01) {
        // Calculate how much we need to adjust other bays
        const adjustment = buildingLength - newTotal;
        
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
      setCustomLengthwiseBayWidths(newWidths);
    }
  };
  
  const handleWidthwiseBayWidthChange = (index, value) => {
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue) && parsedValue > 0) {
      // Calculate the difference between the new value and the old value
      const oldValue = customWidthwiseBayWidths[index];
      const difference = parsedValue - oldValue;
      
      // Create a copy of the current widths
      const newWidths = [...customWidthwiseBayWidths];
      
      // Update the changed bay width
      newWidths[index] = parsedValue;
      
      // If the difference would make the total exceed or fall below the building width,
      // distribute the difference among other bays proportionally
      const newTotal = newWidths.reduce((sum, width) => sum + width, 0);
      
      if (Math.abs(newTotal - buildingWidth) > 0.01) {
        // Calculate how much we need to adjust other bays
        const adjustment = buildingWidth - newTotal;
        
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
      setCustomWidthwiseBayWidths(newWidths);
    }
  };
  
  // Toggle joist direction globally
  const toggleJoistDirection = () => {
    setJoistsRunLengthwise(!joistsRunLengthwise);
  };
  
  // Add a function to handle timber grade change if needed
  const handleTimberGradeChange = (value) => {
    setTimberGrade(value);
    // Recalculate results when timber grade changes
    calculateResults();
  };
  
  // Function to calculate costs using the simplified calculateCost function
  const calculateCosts = (joistSize, interiorBeamSize, edgeBeamSize, columnSize, buildingLength, buildingWidth, joistSpacing, lengthwiseBays, widthwiseBays, floorHeight, numFloors) => {
    console.log('Calculating costs with the following inputs:', {
      joistSize, 
      interiorBeamSize, 
      edgeBeamSize,
      columnSize,
      buildingLength,
      buildingWidth,
      joistSpacing,
      lengthwiseBays,
      widthwiseBays,
      floorHeight,
      numFloors
    });
    
    // Calculate beam and column volumes
    const beamVolume = calculateBeamVolume(interiorBeamSize, edgeBeamSize, buildingLength, buildingWidth, lengthwiseBays, widthwiseBays);
    const columnVolume = calculateColumnVolume(columnSize, floorHeight, numFloors, lengthwiseBays, widthwiseBays);
    
    // Calculate the floor area (for joist cost)
    const floorArea = buildingLength * buildingWidth * numFloors;
    console.log(`Floor area for joists: ${floorArea.toFixed(2)} m²`);
    
    // Create a simple volumes object for the cost calculator
    const volumes = {
      beamVolume: beamVolume,
      columnVolume: columnVolume,
      joistArea: floorArea
    };
    
    console.log('Passing volumes to cost calculator:', volumes);
    
    // Calculate costs using the simplified function
    return calculateCost(volumes);
  };
  
  // Helper function to calculate joist volume
  const calculateJoistVolume = (joistSize, buildingLength, buildingWidth, joistSpacing) => {
    const joistWidth = joistSize.width / 1000; // Convert mm to m
    const joistDepth = joistSize.depth / 1000; // Convert mm to m
    const joistCount = Math.ceil((buildingLength / joistSpacing) * buildingWidth);
    const avgJoistLength = buildingWidth; // Simplified calculation
    
    return joistWidth * joistDepth * avgJoistLength * joistCount;
  };
  
  // Helper function to calculate beam volume
  const calculateBeamVolume = (interiorBeamSize, edgeBeamSize, buildingLength, buildingWidth, lengthwiseBays, widthwiseBays) => {
    console.log("VOLUME DEBUG - calculateBeamVolume inputs:", {
      interiorBeamSize,
      edgeBeamSize,
      buildingLength,
      buildingWidth,
      lengthwiseBays,
      widthwiseBays
    });
    
    const interiorBeamWidth = interiorBeamSize.width / 1000; // Convert mm to m
    const interiorBeamDepth = interiorBeamSize.depth / 1000; // Convert mm to m
    const edgeBeamWidth = edgeBeamSize.width / 1000; // Convert mm to m
    const edgeBeamDepth = edgeBeamSize.depth / 1000; // Convert mm to m
    
    // Calculate bay dimensions
    const bayLengthWidth = buildingLength / lengthwiseBays; // Length of each bay
    const bayWidthWidth = buildingWidth / widthwiseBays;   // Width of each bay
    
    // For this calculation, we'll separate by direction to be more accurate
    // Lengthwise beams (run along length of building)
    const lengthwiseInteriorBeamCount = (widthwiseBays - 1);
    const lengthwiseInteriorBeamLength = buildingLength;
    const lengthwiseInteriorBeamVolume = interiorBeamWidth * interiorBeamDepth * lengthwiseInteriorBeamLength * lengthwiseInteriorBeamCount;
    
    const lengthwiseEdgeBeamCount = 2; // Two edge beams along length
    const lengthwiseEdgeBeamLength = buildingLength;
    const lengthwiseEdgeBeamVolume = edgeBeamWidth * edgeBeamDepth * lengthwiseEdgeBeamLength * lengthwiseEdgeBeamCount;
    
    // Widthwise beams (run along width of building)
    const widthwiseInteriorBeamCount = (lengthwiseBays - 1) * (widthwiseBays + 1);
    const widthwiseInteriorBeamLength = bayWidthWidth;
    const widthwiseInteriorBeamVolume = interiorBeamWidth * interiorBeamDepth * widthwiseInteriorBeamLength * widthwiseInteriorBeamCount;
    
    const widthwiseEdgeBeamCount = 2 * lengthwiseBays; // Two edge beams for each bay along width
    const widthwiseEdgeBeamLength = bayWidthWidth;
    const widthwiseEdgeBeamVolume = edgeBeamWidth * edgeBeamDepth * widthwiseEdgeBeamLength * widthwiseEdgeBeamCount;
    
    const totalBeamVolume = 
      lengthwiseInteriorBeamVolume + 
      lengthwiseEdgeBeamVolume + 
      widthwiseInteriorBeamVolume + 
      widthwiseEdgeBeamVolume;
    
    console.log('VOLUME DEBUG - Detailed beam volume calculation:', {
      lengthwiseInteriorBeams: { 
        count: lengthwiseInteriorBeamCount, 
        length: lengthwiseInteriorBeamLength, 
        width: interiorBeamWidth,
        depth: interiorBeamDepth,
        volume: lengthwiseInteriorBeamVolume 
      },
      lengthwiseEdgeBeams: { 
        count: lengthwiseEdgeBeamCount, 
        length: lengthwiseEdgeBeamLength, 
        width: edgeBeamWidth,
        depth: edgeBeamDepth,
        volume: lengthwiseEdgeBeamVolume 
      },
      widthwiseInteriorBeams: { 
        count: widthwiseInteriorBeamCount, 
        length: widthwiseInteriorBeamLength, 
        width: interiorBeamWidth,
        depth: interiorBeamDepth,
        volume: widthwiseInteriorBeamVolume 
      },
      widthwiseEdgeBeams: { 
        count: widthwiseEdgeBeamCount, 
        length: widthwiseEdgeBeamLength, 
        width: edgeBeamWidth,
        depth: edgeBeamDepth,
        volume: widthwiseEdgeBeamVolume 
      },
      totalBeamVolume
    });
    
    console.log(`VOLUME DEBUG - Final beam volume: ${totalBeamVolume}`);
    
    return totalBeamVolume;
  };
  
  // Helper function to calculate column volume
  const calculateColumnVolume = (columnSize, floorHeight, numFloors, lengthwiseBays, widthwiseBays) => {
    const columnWidth = columnSize.width / 1000; // Convert mm to m
    const columnDepth = columnSize.depth / 1000; // Convert mm to m
    const columnHeight = floorHeight; // Height per floor in meters
    
    // Total number of columns in the building grid
    const columnCount = (lengthwiseBays + 1) * (widthwiseBays + 1);
    
    // Total height of all columns is column height × number of floors
    const totalColumnHeight = columnHeight * numFloors;
    
    // Calculate total volume of all columns
    const totalColumnVolume = columnWidth * columnDepth * totalColumnHeight * columnCount;
    
    console.log('Column volume calculation:', {
      columnSize,
      convertedWidth: columnWidth,
      convertedDepth: columnDepth,
      columnCount,
      heightPerFloor: columnHeight,
      numFloors,
      totalHeight: totalColumnHeight,
      totalVolume: totalColumnVolume
    });
    
    return totalColumnVolume;
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
              {/* Structure Configuration Section */}
              <StructureConfigSection 
                load={load}
                fireRating={fireRating}
                onLoadChange={handleLoadChange}
                onFireRatingChange={handleFireRatingChange}
              />
              
              {/* Dimensions Section */}
              <DimensionsSection 
                buildingLength={buildingLength}
                buildingWidth={buildingWidth}
                numFloors={numFloors}
                floorHeight={floorHeight}
                lengthwiseBays={lengthwiseBays}
                widthwiseBays={widthwiseBays}
                onBuildingLengthChange={handleBuildingLengthChange}
                onBuildingWidthChange={handleBuildingWidthChange}
                onNumFloorsChange={handleNumFloorsChange}
                onFloorHeightChange={handleFloorHeightChange}
                onLengthwiseBaysChange={handleLengthwiseBaysChange}
                onWidthwiseBaysChange={handleWidthwiseBaysChange}
              />
              
              {/* Timber Grade Selection */}
              <TimberGradeSelector 
                value={timberGrade} 
                onChange={handleTimberGradeChange} 
              />
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
      
      {/* Fallback Values Warning Display */}
      {(results?.joistSize?.usingFallback || 
        results?.beamSize?.usingFallback || 
        results?.columnSize?.usingFallback) && (
        <div className="apple-section mt-4">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Using Approximate Sizes: </strong>
            <span className="block sm:inline">
              The exact timber dimensions required for your project could not be found in the available data.
              <ul className="list-disc ml-5 mt-1">
                {results?.joistSize?.usingFallback && <li>Joist sizes are approximate and may not match standard MASSLAM products.</li>}
                {results?.beamSize?.usingFallback && <li>Beam sizes are approximate and may not match standard MASSLAM products.</li>}
                {results?.columnSize?.usingFallback && <li>Column sizes are approximate and may not match standard MASSLAM products.</li>}
              </ul>
              <span className="block mt-2 text-sm">
                These calculations use engineering rules of thumb and should be verified by a qualified engineer.
              </span>
            </span>
          </div>
        </div>
      )}
      
    </div>
  );
}