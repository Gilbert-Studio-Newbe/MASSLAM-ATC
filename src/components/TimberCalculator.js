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
import { calculateCost, formatCurrency } from '../utils/costEstimator';
// ... other imports as before

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
  totalLoad += cumulativeSelfWeight;
  console.log(`Total column load (with self-weight): ${totalLoad.toFixed(2)} kN`);
  
  console.log(`Column size before fire adjustment: ${width}x${depth}mm`);
  console.log(`Column size after fire adjustment: ${fireAdjustedWidth}x${fireAdjustedDepth}mm`);
  
  return {
    width: adjustedWidth,
    depth: adjustedDepth,
    height: height,
    load: totalLoad,
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
        load, 
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
        load, 
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
        load, 
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
        
        // Validate the structure
      const validationResult = validateStructure(joistSize, interiorBeamSize, edgeBeamSize, columnSize, joistSpan, beamSpan, floorHeight, load, numFloors);
        
        // Set the results
        setResults({
          joistSize,
        beamSize: interiorBeamSize,
        edgeBeamSize,
          columnSize,
          timberVolume: timberResult.totalVolume,
        timberWeight: timberResult.weight,
        carbonStorage: carbonResults.carbonStorage,
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
        buildingLength,
        buildingWidth,
        lengthwiseBays,
        widthwiseBays,
        validationResult
      });
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
  
  // Custom Slider Input Component
  const SliderInput = ({ 
    label, 
    value, 
    onChange, 
    min, 
    max, 
    step = 1, 
    unit = "", 
    description = null,
    disabled = false,
    showTicks = true,
    isInteger = false
  }) => {
    const [inputValue, setInputValue] = useState(value.toString());
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef(null);
    
    const handleInputChange = (e) => {
      setInputValue(e.target.value);
      setIsEditing(true);
    };

    const handleInputBlur = () => {
      setIsEditing(false);
      
      // Parse the value and ensure it's within bounds
      let parsedValue = isInteger ? parseInt(inputValue, 10) : parseFloat(inputValue);
      
      // Handle invalid input
      if (isNaN(parsedValue)) {
        setInputValue(value.toString());
        return;
      }
      
      // Clamp the value between min and max
      parsedValue = Math.max(min, Math.min(max, parsedValue));
      
      // Update the input value and trigger the onChange
      setInputValue(parsedValue.toString());
      onChange(parsedValue);
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        e.target.blur(); // Trigger the blur event to apply the change
      }
    };

    const startEditing = () => {
      if (disabled) return;
      
      setIsEditing(true);
      
      // Use setTimeout to ensure the input is rendered before trying to focus
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 10);
    };

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <div className="flex-grow">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            {description && (
              <div className="text-xs text-gray-500">{description}</div>
            )}
          </div>
          <div className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={isEditing ? inputValue : value}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyPress}
              onClick={startEditing}
              className="w-20 px-2 py-1 text-right border border-gray-300 rounded-md text-sm"
              disabled={disabled}
            />
            <span className="ml-1 text-sm text-gray-500 min-w-8 text-left">{unit}</span>
          </div>
        </div>
      </div>
    );
  };
  
  // Function to calculate costs using the existing calculateCost function
  const calculateCosts = (joistSize, interiorBeamSize, edgeBeamSize, columnSize, buildingLength, buildingWidth, joistSpacing, lengthwiseBays, widthwiseBays, floorHeight, numFloors) => {
    // Create a mock timberResult object with the necessary structure
    const mockTimberResult = {
      elements: {
        joists: {
          count: Math.ceil((buildingLength / joistSpacing) * widthwiseBays),
          volume: calculateJoistVolume(joistSize, buildingLength, buildingWidth, joistSpacing)
        },
        beams: {
          count: ((lengthwiseBays - 1) * widthwiseBays) + (2 * widthwiseBays), // Interior + edge beams
          volume: calculateBeamVolume(interiorBeamSize, edgeBeamSize, buildingLength, buildingWidth, lengthwiseBays, widthwiseBays)
        },
        columns: {
          count: (lengthwiseBays + 1) * (widthwiseBays + 1),
          volume: calculateColumnVolume(columnSize, floorHeight, numFloors, lengthwiseBays, widthwiseBays)
        }
      }
    };
    
    // Calculate costs using the existing function
    return calculateCost(mockTimberResult, joistSize, buildingLength, buildingWidth, numFloors);
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
    const interiorBeamWidth = interiorBeamSize.width / 1000; // Convert mm to m
    const interiorBeamDepth = interiorBeamSize.depth / 1000; // Convert mm to m
    const edgeBeamWidth = edgeBeamSize.width / 1000; // Convert mm to m
    const edgeBeamDepth = edgeBeamSize.depth / 1000; // Convert mm to m
    
    const interiorBeamCount = (lengthwiseBays - 1) * widthwiseBays;
    const edgeBeamCount = 2 * widthwiseBays;
    
    const avgBeamLength = buildingLength / lengthwiseBays;
    
    const interiorBeamVolume = interiorBeamWidth * interiorBeamDepth * avgBeamLength * interiorBeamCount;
    const edgeBeamVolume = edgeBeamWidth * edgeBeamDepth * avgBeamLength * edgeBeamCount;
    
    return interiorBeamVolume + edgeBeamVolume;
  };
  
  // Helper function to calculate column volume
  const calculateColumnVolume = (columnSize, floorHeight, numFloors, lengthwiseBays, widthwiseBays) => {
    const columnWidth = columnSize.width / 1000; // Convert mm to m
    const columnDepth = columnSize.depth / 1000; // Convert mm to m
    const columnCount = (lengthwiseBays + 1) * (widthwiseBays + 1);
    
    return columnWidth * columnDepth * floorHeight * columnCount * numFloors;
  };
  
  // Example of a component section converted to use Tailwind classes
  return (
    <div className="apple-section">
      <div className="flex justify-between items-center mb-12">
        <h1 style={{ color: 'var(--apple-text)' }}>Member Calculator</h1>
          </div>
      
      {/* Success Message */}
      {saveMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
          <span className="block sm:inline">{saveMessage}</span>
        </div>
      )}
      
      {/* Save Project Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="apple-card max-w-md w-full">
            <div className="apple-card-header">
              <h2 className="text-xl font-semibold">Save Project</h2>
        </div>
        
            <div className="apple-card-body">
              <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Project Name</label>
              <input 
                type="text" 
                    className="apple-input"
                value={projectDetails.name}
                onChange={(e) => setProjectDetails({...projectDetails, name: e.target.value})}
              />
            </div>
            <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Client</label>
              <input 
                type="text" 
                    className="apple-input"
                value={projectDetails.client}
                onChange={(e) => setProjectDetails({...projectDetails, client: e.target.value})}
              />
            </div>
            <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Location</label>
              <input 
                type="text" 
                    className="apple-input"
                value={projectDetails.location}
                onChange={(e) => setProjectDetails({...projectDetails, location: e.target.value})}
              />
            </div>
          </div>
        </div>
        
            <div className="apple-card-footer flex justify-end space-x-3">
              <button 
                className="apple-button apple-button-secondary"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button 
                className="apple-button apple-button-primary"
                onClick={saveProject}
              >
                Save Project
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="apple-grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
        {/* Config Panel */}
        <div className="lg:col-span-6 xl:col-span-5 w-full">
          <div className="apple-card">
            <div className="apple-card-header flex justify-between items-center">
              <h2 className="text-lg md:text-xl font-semibold m-0">Configuration</h2>
            </div>
            
            <div className="apple-card-body">
              <div className="apple-specs-table mb-6 md:mb-8">
                <h3 className="text-md md:text-lg font-semibold mb-4 md:mb-6">Structure Configuration</h3>
                
                {/* Load Type with Radio Buttons */}
                <div className="apple-specs-row">
                  <div className="apple-specs-label">Load Type</div>
                  <div className="apple-specs-value">
                    <div className="flex flex-col space-y-3">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          id="residential"
                          name="load"
                          className="form-radio h-4 w-4 text-blue-600"
                          checked={load === 2}
                          onChange={() => handleLoadChange(2)}
                        />
                        <span className="ml-3">Residential (2 kPa)</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-5 w-5"
                          style={{ accentColor: 'var(--apple-blue)' }}
                          name="loadType"
                          checked={load === 3}
                          onChange={() => handleLoadChange(3)}
                        />
                        <span className="ml-3">Commercial (3 kPa)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Fire Rating with Select Dropdown */}
                <div className="apple-specs-row">
                  <div className="apple-specs-label">Fire Rating (FRL)</div>
                  <div className="apple-specs-value">
              <select 
                      className="apple-input apple-select mb-0"
                value={fireRating}
                      onChange={(e) => handleFireRatingChange(e.target.value)}
              >
                <option value="none">None</option>
                      <option value="30/30/30">30/30/30</option>
                      <option value="60/60/60">60/60/60</option>
                      <option value="90/90/90">90/90/90</option>
                      <option value="120/120/120">120/120/120</option>
              </select>
            </div>
          </div>
        </div>
        
              <div className="apple-specs-table mb-6 md:mb-8">
                <h3 className="text-md md:text-lg font-semibold mb-4 md:mb-6">Dimensions</h3>
                
                <SliderInput 
                  label="Building Length (m)"
                      value={buildingLength} 
                  onChange={handleBuildingLengthChange}
                  min={3}
                  max={100}
                  step={0.1}
                  unit="m"
                />

                <SliderInput 
                  label="Building Width (m)"
                      value={buildingWidth} 
                  onChange={handleBuildingWidthChange}
                  min={3}
                  max={100}
                  step={0.1}
                  unit="m"
                />

                <SliderInput 
                  label="Number of Floors"
                      value={numFloors} 
                  onChange={handleNumFloorsChange}
                  min={1}
                  max={20}
                  step={1}
                  isInteger={true}
                />

                <SliderInput 
                  label="Floor Height (m)"
                      value={floorHeight} 
                  onChange={handleFloorHeightChange}
                  min={2.4}
                  max={6}
                  step={0.1}
                  unit="m"
                />

                <SliderInput 
                  label="Bays Wide (Columns)"
                      value={lengthwiseBays} 
                  onChange={handleLengthwiseBaysChange}
                  min={1}
                  max={20}
                  step={1}
                  isInteger={true}
                  description={`Current bay width: ${(buildingLength / lengthwiseBays).toFixed(2)} m`}
                />

                <SliderInput 
                  label="Bays Deep (Rows)"
                      value={widthwiseBays} 
                  onChange={handleWidthwiseBaysChange}
                  min={1}
                  max={20}
                  step={1}
                  isInteger={true}
                  description={`Current bay depth: ${(buildingWidth / widthwiseBays).toFixed(2)} m`}
                />

                {/* Removed Joist Centres input */}
              </div>
            </div>
          </div>
        </div>
        
        {/* Results Panel */}
        <div className="lg:col-span-6 xl:col-span-7 w-full">
          {results ? (
            <div className="apple-results">
              <div className="apple-results-header">
                <h2 className="text-lg md:text-xl font-semibold">Calculation Results</h2>
              </div>
              
              <div className="apple-results-body">
                {/* Building Information section removed - will be included in future PDF export */}
                
                {/* Visualizations - Side by side */}
                <div className="apple-results-section grid grid-cols-1 gap-4 md:gap-8">
                  {/* Bay Layout Visualization - Now spans full width */}
                  <div>
                    <div className="apple-visualization mb-3">
                      <h3 className="apple-visualization-title text-md md:text-lg font-semibold mb-3">Bay Layout</h3>
                      
                      {/* Custom Bay Dimensions Toggle */}
                      <div className="mb-4 flex items-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="form-checkbox h-4 w-4 md:h-5 md:w-5" 
                            style={{ accentColor: 'var(--apple-blue)' }}
                            checked={useCustomBayDimensions} 
                            onChange={handleToggleCustomBayDimensions}
                          />
                          <span className="ml-2 text-sm font-medium">Customize Bay Dimensions</span>
                        </label>
                      </div>
                      
                      {/* Custom Bay Dimensions Controls */}
                      {useCustomBayDimensions && (
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          {/* Lengthwise Bay Controls */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Column Widths (m)</h4>
                            <div className="space-y-2">
                              {customLengthwiseBayWidths.map((width, index) => (
                                <div key={`length-${index}`} className="flex items-center">
                                  <span className="text-xs w-16 md:w-24">{String.fromCharCode(65 + index)}:</span>
                                  <input
                                    type="number"
                                    className="apple-input mb-0 text-sm w-full"
                                    min="0.5"
                                    max={MAX_BAY_SPAN}
                                    step="0.1"
                                    value={width.toFixed(2)}
                                    onChange={(e) => handleLengthwiseBayWidthChange(index, e.target.value)}
                                    onInput={(e) => {
                                      if (e.target.value.startsWith('0')) {
                                        e.target.value = e.target.value.replace(/^0+/, '');
                                      }
                                    }}
                                  />
                                  <span className="text-xs ml-2">m</span>
                                </div>
                              ))}
                              <div className="text-xs mt-3 p-2 rounded" style={{ 
                                backgroundColor: 'rgba(0, 113, 227, 0.05)',
                                color: 'var(--apple-text-secondary)'
                              }}>
                                <div className="flex justify-between mb-1">
                                  <span>Total:</span>
                                  <span className={Math.abs(customLengthwiseBayWidths.reduce((sum, width) => sum + width, 0) - buildingLength) > 0.01 ? 'text-red-500' : ''}>
                                    {customLengthwiseBayWidths.reduce((sum, width) => sum + width, 0).toFixed(2)}m
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Target:</span>
                                  <span>{buildingLength.toFixed(2)}m</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Widthwise Bay Controls */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Row Heights (m)</h4>
                            <div className="space-y-2">
                              {customWidthwiseBayWidths.map((width, index) => (
                                <div key={`width-${index}`} className="flex items-center">
                                  <span className="text-xs w-16 md:w-24">{index + 1}:</span>
                                  <input
                                    type="number"
                                    className="apple-input mb-0 text-sm w-full"
                                    min="0.5"
                                    max={MAX_BAY_SPAN}
                                    step="0.1"
                                    value={width.toFixed(2)}
                                    onChange={(e) => handleWidthwiseBayWidthChange(index, e.target.value)}
                                    onInput={(e) => {
                                      if (e.target.value.startsWith('0')) {
                                        e.target.value = e.target.value.replace(/^0+/, '');
                                      }
                                    }}
                                  />
                                  <span className="text-xs ml-2">m</span>
                                </div>
                              ))}
                              <div className="text-xs mt-3 p-2 rounded" style={{ 
                                backgroundColor: 'rgba(0, 113, 227, 0.05)',
                                color: 'var(--apple-text-secondary)'
                              }}>
                                <div className="flex justify-between mb-1">
                                  <span>Total:</span>
                                  <span className={Math.abs(customWidthwiseBayWidths.reduce((sum, width) => sum + width, 0) - buildingWidth) > 0.01 ? 'text-red-500' : ''}>
                                    {customWidthwiseBayWidths.reduce((sum, width) => sum + width, 0).toFixed(2)}m
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Target:</span>
                                  <span>{buildingWidth.toFixed(2)}m</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-center">
                        <div className="relative w-full h-full" style={{ 
                          minHeight: '400px', 
                          border: 'none',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          overflow: 'hidden'
                        }}>
                          {/* SVG-based Bay Layout */}
                          {(() => {
                            const { lengthwiseBayWidths, widthwiseBayWidths } = calculateBayDimensions();
                            
                            // Calculate total dimensions
                            const totalWidth = lengthwiseBayWidths.reduce((sum, w) => sum + w, 0);
                            const totalHeight = widthwiseBayWidths.reduce((sum, h) => sum + h, 0);
                            
                            // Calculate positions for each bay
                            const bayPositionsX = [];
                            let currentX = 0;
                            for (let i = 0; i < lengthwiseBayWidths.length; i++) {
                              bayPositionsX.push(currentX);
                              currentX += lengthwiseBayWidths[i];
                            }
                            
                            const bayPositionsY = [];
                            let currentY = 0;
                            for (let i = 0; i < widthwiseBayWidths.length; i++) {
                              bayPositionsY.push(currentY);
                              currentY += widthwiseBayWidths[i];
                            }
                            
                            return (
                              <svg 
                                width="100%" 
                                height="100%" 
                                viewBox={`-1 -1 ${totalWidth + 2} ${totalHeight + 2}`}
                                preserveAspectRatio="xMidYMid meet"
                                style={{ 
                                  background: 'white', 
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'contain'
                                }}
                              >
                                {/* Background grid - invisible now */}
                                <g className="debug-grid">
                                  {/* Vertical grid lines */}
                                  {bayPositionsX.map((x, i) => (
                                    <line 
                                      key={`vgrid-${i}`}
                                      x1={x}
                                      y1={0}
                                      x2={x}
                                      y2={totalHeight}
                                      stroke="rgba(0,0,0,0)"
                                      strokeWidth="0"
                                      strokeDasharray="0,0"
                                    />
                                  ))}
                                  {/* Add final vertical line */}
                                  <line 
                                    key="vgrid-final"
                                    x1={totalWidth}
                                    y1={0}
                                    x2={totalWidth}
                                    y2={totalHeight}
                                    stroke="rgba(0,0,0,0)"
                                    strokeWidth="0"
                                    strokeDasharray="0,0"
                                  />
                                  
                                  {/* Horizontal grid lines */}
                                  {bayPositionsY.map((y, i) => (
                                    <line 
                                      key={`hgrid-${i}`}
                                      x1={0}
                                      y1={y}
                                      x2={totalWidth}
                                      y2={y}
                                      stroke="rgba(0,0,0,0)"
                                      strokeWidth="0"
                                      strokeDasharray="0,0"
                                    />
                                  ))}
                                  {/* Add final horizontal line */}
                                  <line 
                                    key="hgrid-final"
                                    x1={0}
                                    y1={totalHeight}
                                    x2={totalWidth}
                                    y2={totalHeight}
                                    stroke="rgba(0,0,0,0)"
                                    strokeWidth="0"
                                    strokeDasharray="0,0"
                                  />
                                </g>
                                
                                {/* Light grey border around the outside */}
                                <rect
                                  x="0"
                                  y="0"
                                  width={totalWidth}
                                  height={totalHeight}
                                  fill="none"
                                  stroke="#cccccc"
                                  strokeWidth="0.05"
                                />
                                
                                {/* Joist lines */}
                                <g className="joists">
                                  {(() => {
                                    // Calculate joist spacing in SVG units (800mm = 0.8m)
                                    const joistSpacingM = 0.8;
                                    const joists = [];
                                    
                                    if (!joistsRunLengthwise) {
                                      // Vertical joists (running along length)
                                      for (let bayIndex = 0; bayIndex < results.widthwiseBays; bayIndex++) {
                                        const bayStartY = bayPositionsY[bayIndex];
                                        const bayHeight = widthwiseBayWidths[bayIndex];
                                        const bayEndY = bayStartY + bayHeight;
                                        
                                        for (let bayWidthIndex = 0; bayWidthIndex < results.lengthwiseBays; bayWidthIndex++) {
                                          const bayStartX = bayPositionsX[bayWidthIndex];
                                          const bayWidth = lengthwiseBayWidths[bayWidthIndex];
                                          const bayEndX = bayStartX + bayWidth;
                                          
                                          // Calculate number of joists in this bay
                                          const numJoists = Math.floor(bayWidth / joistSpacingM);
                                          const actualSpacing = bayWidth / (numJoists + 1);
                                          
                                          // Draw joists
                                          for (let i = 1; i <= numJoists; i++) {
                                            const joistX = bayStartX + i * actualSpacing;
                                            joists.push(
                                              <line
                                                key={`joist-v-${bayWidthIndex}-${bayIndex}-${i}`}
                                                x1={joistX}
                                                y1={bayStartY}
                                                x2={joistX}
                                                y2={bayEndY}
                                                stroke="#cccccc"
                                                strokeWidth="0.03"
                                                strokeDasharray="0.1,0.1"
                                              />
                                            );
                                          }
                                        }
                                      }
                                    } else {
                                      // Horizontal joists (running along width)
                                      for (let bayIndex = 0; bayIndex < results.lengthwiseBays; bayIndex++) {
                                        const bayStartX = bayPositionsX[bayIndex];
                                        const bayWidth = lengthwiseBayWidths[bayIndex];
                                        const bayEndX = bayStartX + bayWidth;
                                        
                                        for (let bayHeightIndex = 0; bayHeightIndex < results.widthwiseBays; bayHeightIndex++) {
                                          const bayStartY = bayPositionsY[bayHeightIndex];
                                          const bayHeight = widthwiseBayWidths[bayHeightIndex];
                                          const bayEndY = bayStartY + bayHeight;
                                          
                                          // Calculate number of joists in this bay
                                          const numJoists = Math.floor(bayHeight / joistSpacingM);
                                          const actualSpacing = bayHeight / (numJoists + 1);
                                          
                                          // Draw joists
                                          for (let i = 1; i <= numJoists; i++) {
                                            const joistY = bayStartY + i * actualSpacing;
                                            joists.push(
                                              <line
                                                key={`joist-h-${bayIndex}-${bayHeightIndex}-${i}`}
                                                x1={bayStartX}
                                                y1={joistY}
                                                x2={bayEndX}
                                                y2={joistY}
                                                stroke="#cccccc"
                                                strokeWidth="0.03"
                                                strokeDasharray="0.1,0.1"
                                              />
                                            );
                                          }
                                        }
                                      }
                                    }
                                    
                                    return joists;
                                  })()}
                                </g>
                                
                                {/* Beams connecting columns - perpendicular to joists */}
                                <g className="beams">
                                  {(() => {
                                    const beams = [];
                                    
                                    if (joistsRunLengthwise) {
                                      // When joists run lengthwise (horizontal), beams run widthwise (vertical)
                                      // Draw vertical beams along each column line
                                      for (let col = 0; col <= results.lengthwiseBays; col++) {
                                        const x = col === results.lengthwiseBays 
                                          ? bayPositionsX[col-1] + lengthwiseBayWidths[col-1] 
                                          : bayPositionsX[col];
                                        
                                        // Draw beam from top to bottom
                                        beams.push(
                                          <line
                                            key={`beam-v-${col}`}
                                            x1={x}
                                            y1={0}
                                            x2={x}
                                            y2={totalHeight}
                                            stroke="#555555"
                                            strokeWidth="0.08"
                                            strokeLinecap="square"
                                          />
                                        );
                                      }
                                    } else {
                                      // When joists run widthwise (vertical), beams run lengthwise (horizontal)
                                      // Draw horizontal beams along each row line
                                      for (let row = 0; row <= results.widthwiseBays; row++) {
                                        const y = row === results.widthwiseBays 
                                          ? bayPositionsY[row-1] + widthwiseBayWidths[row-1] 
                                          : bayPositionsY[row];
                                        
                                        // Draw beam from left to right
                                        beams.push(
                                          <line
                                            key={`beam-h-${row}`}
                                            x1={0}
                                            y1={y}
                                            x2={totalWidth}
                                            y2={y}
                                            stroke="#555555"
                                            strokeWidth="0.08"
                                            strokeLinecap="square"
                                          />
                                        );
                                      }
                                    }
                                    
                                    return beams;
                                  })()}
                                </g>
                                
                                {/* Column letters and bay numbers */}
                                <g className="labels">
                                  {/* Column letters at the top */}
                                  {Array.from({ length: results.lengthwiseBays }).map((_, i) => {
                                    const x = bayPositionsX[i] + lengthwiseBayWidths[i] / 2;
                                    const letter = String.fromCharCode(65 + i); // A, B, C, ...
                                    
                                    // Calculate scale factor based on building size
                                    const scaleFactor = Math.max(totalWidth, totalHeight) / 10;
                                    const fontSize = 0.3 * scaleFactor;
                                    
                                    return (
                                      <text
                                        key={`col-label-${i}`}
                                        x={x}
                                        y="-0.3"
                                        textAnchor="middle"
                                        fontSize={fontSize > 0.3 ? fontSize : 0.3}
                                        fill="#666666"
                                      >
                                        {letter}
                                      </text>
                                    );
                                  })}
                                  
                                  {/* Row numbers on the left */}
                                  {Array.from({ length: results.widthwiseBays }).map((_, i) => {
                                    const y = bayPositionsY[i] + widthwiseBayWidths[i] / 2;
                                    const number = i + 1; // 1, 2, 3, ...
                                    
                                    // Calculate scale factor based on building size
                                    const scaleFactor = Math.max(totalWidth, totalHeight) / 10;
                                    const fontSize = 0.3 * scaleFactor;
                                    
                                    return (
                                      <text
                                        key={`row-label-${i}`}
                                        x="-0.3"
                                        y={y + 0.1} // Slight adjustment for vertical centering
                                        textAnchor="middle"
                                        fontSize={fontSize > 0.3 ? fontSize : 0.3}
                                        fill="#666666"
                                      >
                                        {number}
                                      </text>
                                    );
                                  })}
                                  
                                  {/* Building width dimension on the right (rotated 90 degrees) */}
                                  {(() => {
                                    const scaleFactor = Math.max(totalWidth, totalHeight) / 10;
                                    const fontSize = 0.3 * scaleFactor;
                                    
                                    return (
                                      <text
                                        key="width-dimension"
                                        x={totalWidth + 0.6}
                                        y={totalHeight / 2}
                                        textAnchor="middle"
                                        fontSize={fontSize > 0.3 ? fontSize : 0.3}
                                        fill="#666666"
                                        transform={`rotate(90, ${totalWidth + 0.6}, ${totalHeight / 2})`}
                                      >
                                        {results.buildingWidth.toFixed(1)}m
                                      </text>
                                    );
                                  })()}
                                  
                                  {/* Building length dimension at the bottom */}
                                  {(() => {
                                    const scaleFactor = Math.max(totalWidth, totalHeight) / 10;
                                    const fontSize = 0.3 * scaleFactor;
                                    
                                    return (
                                      <text
                                        key="length-dimension"
                                        x={totalWidth / 2}
                                        y={totalHeight + 0.6}
                                        textAnchor="middle"
                                        fontSize={fontSize > 0.3 ? fontSize : 0.3}
                                        fill="#666666"
                                      >
                                        {results.buildingLength.toFixed(1)}m
                                      </text>
                                    );
                                  })()}
                                </g>
                                
                                {/* Columns at grid intersections */}
                                <g className="columns">
                                  {/* Generate columns at all grid intersections */}
                                  {Array.from({ length: (results.lengthwiseBays + 1) * (results.widthwiseBays + 1) }).map((_, index) => {
                                    const row = Math.floor(index / (results.lengthwiseBays + 1));
                                    const col = index % (results.lengthwiseBays + 1);
                                    
                                    // Calculate column size based on actual dimensions, but scaled down
                                    // Use a scaling factor of 400
                                    const columnWidth = Math.max(results.columnSize.width / 400, 0.2);
                                    const columnHeight = Math.max(results.columnSize.depth / 400, 0.2);
                                    
                                    // Make column size proportional to building size but with a minimum size
                                    const buildingSizeScaleFactor = Math.max(
                                      Math.min(totalWidth / 30, totalHeight / 30),
                                      0.8 // Minimum scale factor to ensure columns are visible
                                    );
                                    
                                    // Swap width and height based on joist direction
                                    let scaledColumnWidth, scaledColumnHeight;
                                    if (joistsRunLengthwise) {
                                      // When joists run lengthwise (vertical joists), columns are oriented with width along the length
                                      scaledColumnWidth = columnWidth * buildingSizeScaleFactor;
                                      scaledColumnHeight = columnHeight * buildingSizeScaleFactor;
                                    } else {
                                      // When joists run widthwise (horizontal joists), columns are rotated 90 degrees
                                      scaledColumnWidth = columnHeight * buildingSizeScaleFactor;
                                      scaledColumnHeight = columnWidth * buildingSizeScaleFactor;
                                    }
                                    
                                    // Calculate column position
                                    let x, y;
                                    
                                    // Ensure we're using the correct variable for edge detection
                                    const lengthwiseBays = results.lengthwiseBays;
                                    const widthwiseBays = results.widthwiseBays;
                                    
                                    const isLeftEdge = col === 0;
                                    const isRightEdge = col === lengthwiseBays;
                                    const isTopEdge = row === 0;
                                    const isBottomEdge = row === widthwiseBays;
                                    
                                    // Check if we have valid positions for this column
                                    if (col < 0 || col > lengthwiseBays || row < 0 || row > widthwiseBays) {
                                      return null; // Skip invalid positions
                                    }
                                    
                                    // Make sure we have a valid position in the bayPositions arrays
                                    const xPos = isRightEdge ? bayPositionsX[col-1] + lengthwiseBayWidths[col-1] : bayPositionsX[col];
                                    const yPos = isBottomEdge ? bayPositionsY[row-1] + widthwiseBayWidths[row-1] : bayPositionsY[row];
                                    
                                    if (isLeftEdge) {
                                      // Left edge column - move inside by half width
                                      x = xPos + scaledColumnWidth/2;
                                    } else if (isRightEdge) {
                                      // Right edge column - move inside by half width
                                      x = xPos - scaledColumnWidth/2;
                                    } else {
                                      // Interior column - centered on grid line
                                      x = xPos;
                                    }
                                    
                                    if (isTopEdge) {
                                      // Top edge column - move inside by half height
                                      y = yPos + scaledColumnHeight/2;
                                    } else if (isBottomEdge) {
                                      // Bottom edge column - move inside by half height
                                      y = yPos - scaledColumnHeight/2;
                              } else {
                                      // Interior column - centered on grid line
                                      y = yPos;
                                    }
                                    
                                return (
                                      <g key={`column-${row}-${col}`}>
                                        <rect
                                          x={x - scaledColumnWidth/2}
                                          y={y - scaledColumnHeight/2}
                                          width={scaledColumnWidth}
                                          height={scaledColumnHeight}
                                          fill="#555"
                                          stroke="#333"
                                          strokeWidth="0.02"
                                          rx="0.02"
                                          ry="0.02"
                                        />
                                      </g>
                                    );
                                  })}
                                </g>
                              </svg>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-sm mt-4" style={{ color: 'var(--apple-text-secondary)' }}>
                      {!useCustomBayDimensions ? (
                        <div className="text-xs md:text-sm">Grid Cell Size: {(results.buildingLength / results.lengthwiseBays).toFixed(2)}m × {(results.buildingWidth / results.widthwiseBays).toFixed(2)}m</div>
                      ) : (
                        <div className="text-xs md:text-sm">Custom grid cell sizes applied</div>
                      )}
                      
                      {/* Joist Direction Toggle UI */}
                      <div className="mt-3 mb-3">
                        <div className="flex flex-col items-center mb-4">
                          <div className="flex w-full max-w-md rounded-lg overflow-hidden border border-gray-300">
                            <button 
                              className={`flex-1 py-2 px-4 text-center ${!joistsRunLengthwise ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                              onClick={() => setJoistsRunLengthwise(false)}
                            >
                              Vertical Joists ↕
                            </button>
                            <button 
                              className={`flex-1 py-2 px-4 text-center ${joistsRunLengthwise ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                              onClick={() => setJoistsRunLengthwise(true)}
                            >
                              Horizontal Joists ↔
                            </button>
                          </div>
                          <p className="text-center text-sm text-gray-500 mt-2">↔ / ↕ Arrows indicate joist span direction (click arrows or use toggle above to change direction)</p>
                          <p className="text-center text-xs text-gray-500 mt-1">Joists are spaced at 800mm centres</p>
                      </div>
                      
                        {/* Beam Legend */}
                        <div className="flex items-center justify-center mt-2">
                          <div className="flex items-center mr-4">
                            <div style={{ 
                              width: '20px', 
                              height: '3px', 
                              backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                              display: 'inline-block',
                              marginRight: '6px'
                            }}></div>
                            <span className="text-xs" style={{ color: 'var(--apple-text-secondary)' }}>
                              Edge beams
                            </span>
                          </div>
                          <div className="flex items-center">
                            <div style={{ 
                              width: '20px', 
                              height: '3px', 
                              borderTop: '3px dashed rgba(0, 0, 0, 0.8)',
                              display: 'inline-block',
                              marginRight: '6px'
                            }}></div>
                            <span className="text-xs" style={{ color: 'var(--apple-text-secondary)' }}>
                              Internal beams
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
              
                {/* Results Section */}
                {results && (
                  <div className="apple-section mt-4">
                    {/* Project Estimate - Moved above Calculated Timber Sizes */}
                    <div className="mb-6">
                      <h3 className="apple-section-title text-lg md:text-xl font-semibold mb-3 md:mb-4">Project Estimate</h3>
                      <div className="apple-section-content">
                        <div className="grid grid-cols-1 bg-white p-3 md:p-4 rounded-lg shadow">
                          <div className="border-b pb-3 mb-3">
                            <h5 className="font-semibold mb-2 text-sm md:text-base">Total Cost Estimate</h5>
                            <p className="text-xl md:text-2xl font-bold text-green-700">{formatCurrency(results.costs?.totalCost || 0)}</p>
                            <p className="text-xs md:text-sm text-gray-500 mt-1">Excluding GST and installation</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs md:text-sm text-gray-600">Joists</p>
                              <p className="text-sm md:text-base font-semibold">{formatCurrency(results.costs?.elements?.joists?.cost || 0)}</p>
                              <p className="text-xs text-gray-500">{results.elementCounts?.joists || 0} pieces</p>
                              <p className="text-xs text-gray-500">{(buildingLength * buildingWidth * numFloors).toFixed(1)} m²</p>
                            </div>
                            <div>
                              <p className="text-xs md:text-sm text-gray-600">Beams</p>
                              <p className="text-sm md:text-base font-semibold">{formatCurrency(results.costs?.elements?.beams?.cost || 0)}</p>
                              <p className="text-xs text-gray-500">{results.elementCounts?.beams || 0} pieces</p>
                              <p className="text-xs text-gray-500">{results.elementVolumes?.beams?.toFixed(1) || 0} m³</p>
                            </div>
                            <div>
                              <p className="text-xs md:text-sm text-gray-600">Columns</p>
                              <p className="text-sm md:text-base font-semibold">{formatCurrency(results.costs?.elements?.columns?.cost || 0)}</p>
                              <p className="text-xs text-gray-500">{results.elementCounts?.columns || 0} pieces</p>
                              <p className="text-xs text-gray-500">{results.elementVolumes?.columns?.toFixed(1) || 0} m³</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="apple-section-title text-lg md:text-xl font-semibold mb-3 md:mb-4">Calculated Timber Sizes</h3>
                    <div className="apple-section-content">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Joist Results */}
                        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
                          <h4 className="font-semibold mb-2 text-sm md:text-base">Joists</h4>
                          <p className="text-sm md:text-base"><strong>Size:</strong> {results.joistSize.width}mm × {results.joistSize.depth}mm</p>
                          <p className="text-sm md:text-base"><strong>Span:</strong> {results.joistSize.span?.toFixed(2) || '0.00'}m</p>
                          <p className="text-sm md:text-base"><strong>Spacing:</strong> 800mm</p>
                          {results.joistSize.fireAllowance > 0 && (
                            <p className="text-sm md:text-base text-blue-600">
                              <strong>Fire Allowance:</strong> {results.joistSize.fireAllowance.toFixed(1)}mm per face
                            </p>
                          )}
                          
                          {/* Display different joist sizes for different bays if using custom bay dimensions */}
                          {useCustomBayDimensions && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs md:text-sm font-medium mb-1">Grid cell-specific sizes:</p>
                              <div className="text-xs space-y-1 overflow-auto max-h-32 md:max-h-none">
                                {(() => {
                                  const { lengthwiseBayWidths, widthwiseBayWidths } = calculateBayDimensions();
                                  const uniqueBaySizes = [];
                                  
                                  // Calculate unique bay combinations
                                  for (let row = 0; row < results.widthwiseBays; row++) {
                                    for (let col = 0; col < results.lengthwiseBays; col++) {
                                      const bayWidth = lengthwiseBayWidths[col];
                                      const bayHeight = widthwiseBayWidths[row];
                                      
                                      // Use global joist direction instead of calculating per bay
                                      const joistsSpanLengthwise = joistsRunLengthwise;
                                      const joistSpan = joistsSpanLengthwise ? bayWidth : bayHeight;
                                      
                                      // Calculate joist size for this specific span
                                      const bayJoistSize = calculateJoistSize(joistSpan, 800, load, timberGrade, fireRating);
                                      
                                      // Find if this size already exists in our unique list
                                      const existingSize = uniqueBaySizes.find(item => 
                                        item.width === bayJoistSize.width && 
                                        item.depth === bayJoistSize.depth &&
                                        Math.abs(item.span - joistSpan) < 0.01
                                      );
                                      
                                      if (!existingSize) {
                                        uniqueBaySizes.push({
                                          span: joistSpan,
                                          width: bayJoistSize.width,
                                          depth: bayJoistSize.depth,
                                          count: 1,
                                          locations: [`R${row+1}C${col+1}`]
                                        });
                                      } else {
                                        existingSize.count++;
                                        existingSize.locations.push(`R${row+1}C${col+1}`);
                                      }
                                    }
                                  }
                                  
                                  // Sort by span
                                  uniqueBaySizes.sort((a, b) => b.span - a.span);
                                  
                                  return uniqueBaySizes.map((item, index) => (
                                    <div key={`joist-size-${index}`}>
                                      <strong>{item.span?.toFixed(2) || '0.00'}m span:</strong> {item.width}mm × {item.depth}mm
                                      <span className="text-gray-500 ml-1">({item.count} {item.count === 1 ? 'grid cell' : 'grid cells'})</span>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
              
                        {/* Beam Results */}
                        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
                          <h4 className="font-semibold mb-2 text-sm md:text-base">Beams</h4>
                          
                          {/* Interior Beams */}
                          <div className="mb-3">
                            <p className="text-sm md:text-base font-medium">Interior Beams:</p>
                          <p className="text-sm md:text-base"><strong>Size:</strong> {results.beamSize.width}mm × {results.beamSize.depth}mm</p>
                          <p className="text-sm md:text-base"><strong>Span:</strong> {results.beamSize.span?.toFixed(2) || '0.00'}m</p>
                          <p className="text-sm md:text-base"><strong>Tributary Width:</strong> {results.beamSize.tributaryWidth?.toFixed(2) || '0.00'}m</p>
                          <p className="text-sm md:text-base"><strong>Load per Meter:</strong> {results.beamSize.loadPerMeter?.toFixed(2) || '0.00'} kN/m</p>
                            <p className="text-sm md:text-base"><strong>Total Load:</strong> {(results.beamSize.loadPerMeter * results.beamSize.span)?.toFixed(2) || '0.00'} kN</p>
                          </div>
                          
                          {/* Edge Beams */}
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm md:text-base font-medium">Edge Beams:</p>
                            <p className="text-sm md:text-base"><strong>Size:</strong> {results.edgeBeamSize.width}mm × {results.edgeBeamSize.depth}mm</p>
                            <p className="text-sm md:text-base"><strong>Span:</strong> {results.edgeBeamSize.span?.toFixed(2) || '0.00'}m</p>
                            <p className="text-sm md:text-base"><strong>Tributary Width:</strong> {results.edgeBeamSize.tributaryWidth?.toFixed(2) || '0.00'}m</p>
                            <p className="text-sm md:text-base"><strong>Load per Meter:</strong> {results.edgeBeamSize.loadPerMeter?.toFixed(2) || '0.00'} kN/m</p>
                            <p className="text-sm md:text-base"><strong>Total Load:</strong> {(results.edgeBeamSize.loadPerMeter * results.edgeBeamSize.span)?.toFixed(2) || '0.00'} kN</p>
                          </div>
                          
                          {results.beamSize.fireAllowance > 0 && (
                            <p className="text-sm md:text-base text-blue-600 mt-3">
                              <strong>Fire Allowance:</strong> {results.beamSize.fireAllowance.toFixed(1)}mm per face
                            </p>
                          )}
                          
                          {results.beamSize.width === results.columnSize.width && (
                            <p className="text-sm md:text-base text-green-600 mt-2">
                              <strong>✓</strong> Width matched with columns
                            </p>
                          )}
                          
                          {/* Display different beam sizes for different bays if using custom bay dimensions */}
                          {useCustomBayDimensions && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs md:text-sm font-medium mb-1">Grid cell-specific sizes:</p>
                              <div className="text-xs space-y-1 overflow-auto max-h-32 md:max-h-none">
                                {(() => {
                                  const { lengthwiseBayWidths, widthwiseBayWidths } = calculateBayDimensions();
                                  const uniqueBaySizes = [];
                                  
                                  // Calculate unique bay combinations
                                  for (let row = 0; row < results.widthwiseBays; row++) {
                                    for (let col = 0; col < results.lengthwiseBays; col++) {
                                      const bayWidth = lengthwiseBayWidths[col];
                                      const bayHeight = widthwiseBayWidths[row];
                                      
                                      // Beams should run perpendicular to joists, not necessarily the longer distance
                                      // Use the global joist direction setting to determine beam direction
                                      const joistsSpanLengthwise = joistsRunLengthwise;
                                      const beamsSpanLengthwise = !joistsSpanLengthwise; // Beams perpendicular to joists
                                      
                                      const beamSpan = beamsSpanLengthwise ? bayWidth : bayHeight;
                                      
                                      // Determine if this is an edge beam or an interior beam
                                      // Edge beams have smaller tributary width than interior beams
                                      let isEdgeBeam = false;
                                      
                                      if (beamsSpanLengthwise) {
                                        // Beams run lengthwise (horizontally in the grid)
                                        // Edge beams are at the top and bottom of the grid (row 0 and last row)
                                        isEdgeBeam = (row === 0 || row === results.widthwiseBays - 1);
                                      } else {
                                        // Beams run widthwise (vertically in the grid)
                                        // Edge beams are at the left and right of the grid (column 0 and last column)
                                        isEdgeBeam = (col === 0 || col === results.lengthwiseBays - 1);
                                      }
                                      
                                      // Calculate tributary width based on beam position
                                      let tributaryWidth;
                                      
                                      if (isEdgeBeam) {
                                        // Edge beams only support load from one side
                                        // Use half the bay dimension on one side only
                                        tributaryWidth = beamsSpanLengthwise ? bayHeight / 4 : bayWidth / 4;
                                      } else {
                                        // Interior beams support load from both sides
                                        // Use half the bay dimension on both sides (total = full bay dimension / 2)
                                        tributaryWidth = beamsSpanLengthwise ? bayHeight / 2 : bayWidth / 2;
                                      }
                                      
                                      const bayBeamSize = calculateBeamSize(beamSpan, load, timberGrade, tributaryWidth, fireRating);
                                      
                                      // Create a unique key that includes the beam position (edge or interior)
                                      const beamKey = `${beamSpan.toFixed(2)}-${bayBeamSize.width}-${bayBeamSize.depth}-${isEdgeBeam ? 'edge' : 'interior'}`;
                                      
                                      // Find if this size already exists in our unique list
                                      const existingSize = uniqueBaySizes.find(item => 
                                        item.width === bayBeamSize.width && 
                                        item.depth === bayBeamSize.depth &&
                                        Math.abs(item.span - beamSpan) < 0.01 &&
                                        item.isEdgeBeam === isEdgeBeam
                                      );
                                      
                                      if (!existingSize) {
                                        uniqueBaySizes.push({
                                          span: beamSpan,
                                          width: bayBeamSize.width,
                                          depth: bayBeamSize.depth,
                                          count: 1,
                                          isEdgeBeam: isEdgeBeam,
                                          tributaryWidth: tributaryWidth,
                                          locations: [`R${row+1}C${col+1}`]
                                        });
                                      } else {
                                        existingSize.count++;
                                        existingSize.locations.push(`R${row+1}C${col+1}`);
                                      }
                                    }
                                  }
                                  
                                  // Sort by span and then by edge/interior
                                  uniqueBaySizes.sort((a, b) => {
                                    // First sort by span
                                    if (b.span !== a.span) return b.span - a.span;
                                    // Then sort by edge/interior (interior beams first)
                                    return a.isEdgeBeam ? 1 : -1;
                                  });
                                  
                                  return uniqueBaySizes.map((item, index) => (
                                    <div key={`beam-size-${index}`}>
                                      <strong>{item.span?.toFixed(2) || '0.00'}m span{item.isEdgeBeam ? ' (edge)' : ' (interior)'}:</strong> {item.width}mm × {item.depth}mm
                                      <span className="text-gray-500 ml-1">({item.count} {item.count === 1 ? 'grid cell' : 'grid cells'})</span>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Column Results */}
                        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
                          <h4 className="font-semibold mb-2 text-sm md:text-base">Columns</h4>
                          <p className="text-sm md:text-base"><strong>Size:</strong> {results.columnSize.width}mm × {results.columnSize.depth}mm</p>
                          <p className="text-sm md:text-base"><strong>Height:</strong> {results.columnSize.height}m</p>
                          <p className="text-sm md:text-base"><strong>Floors:</strong> {results.numFloors}</p>
                          <p className="text-sm md:text-base"><strong>Tributary Area:</strong> {results.columnSize.tributaryArea?.toFixed(2) || '0.00'}m²</p>
                          <p className="text-sm md:text-base"><strong>Load per Floor:</strong> {results.columnSize.loadPerFloor?.toFixed(2) || '0.00'} kN</p>
                          <p className="text-sm md:text-base"><strong>Total Load:</strong> {results.columnSize.load?.toFixed(2) || '0.00'} kN</p>
                          {results.columnSize.fireAllowance > 0 && (
                            <p className="text-sm md:text-base text-blue-600">
                              <strong>Fire Allowance:</strong> {results.columnSize.fireAllowance.toFixed(1)}mm per face
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Timber Weight and Carbon Calculation */}
                      <div className="mt-4 bg-white p-4 rounded-lg shadow">
                        <h4 className="font-semibold mb-2">Material Estimates</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-3 md:p-4 rounded-lg shadow">
                            <h5 className="font-semibold mb-2 text-sm md:text-base">Timber Volume</h5>
                            <div className="space-y-2">
                              <p className="text-sm md:text-base"><strong>Total Volume:</strong> {results.timberVolume?.toFixed(2) || '0.00'} m³</p>
                              <p className="text-sm md:text-base"><strong>Mass:</strong> {(results.timberWeight / 1000)?.toFixed(2) || '0.00'} tonnes</p>
                              <p className="text-sm md:text-base"><strong>Density:</strong> {TIMBER_PROPERTIES[timberGrade]?.density || 600} kg/m³ ({timberGrade})</p>
                              
                              <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 gap-1">
                                <p className="text-xs md:text-sm"><strong>Joists:</strong> {results.elementVolumes?.joists?.toFixed(2) || '0.00'} m³</p>
                                <p className="text-xs md:text-sm"><strong>Beams:</strong> {results.elementVolumes?.beams?.toFixed(2) || '0.00'} m³</p>
                                <p className="text-xs md:text-sm"><strong>Columns:</strong> {results.elementVolumes?.columns?.toFixed(2) || '0.00'} m³</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 md:p-4 rounded-lg shadow">
                            <h5 className="font-semibold mb-2 text-sm md:text-base">Carbon Benefits</h5>
                            <div className="space-y-2">
                              <p className="text-sm md:text-base"><strong>Carbon Storage:</strong> {results.carbonStorage?.toFixed(2) || '0.00'} tonnes CO₂e</p>
                              <p className="text-sm md:text-base"><strong>Embodied Carbon:</strong> {results.embodiedCarbon?.toFixed(2) || '0.00'} tonnes CO₂e</p>
                              
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-sm text-green-700"><strong>Compared to Steel/Concrete:</strong></p>
                                <p className="text-sm md:text-base text-green-700">
                                  <strong>Carbon Saving:</strong> {results.carbonSavings?.toFixed(2) || '0.00'} tonnes CO₂e</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Based on average embodied carbon differential between mass timber and conventional structural systems.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Save Project Button */}
                <div className="flex justify-end mt-8">
                  <button 
                    className="apple-button apple-button-primary"
                    onClick={() => setShowSaveModal(true)}
                  >
                    Save Project
              </button>
            </div>
          </div>
            </div>
          ) : (
            <div className="apple-card p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">Results</h2>
              <p style={{ color: 'var(--apple-text-secondary)' }}>Configure your timber structure parameters to see calculation results.</p>
          </div>
        )}
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="apple-section mt-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
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
      
      {/* Calculated Bay Sizes */}
      <div className="mb-6 md:mb-8 p-4 md:p-6 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
        <h4 className="text-sm md:text-md font-medium mb-3 md:mb-4">Calculated Bay Sizes</h4>
        <div className="grid grid-cols-1 gap-2 md:gap-3">
          <p className="text-sm"><strong>Bay Size (Length):</strong> {(buildingLength / lengthwiseBays).toFixed(2)} m</p>
          <p className="text-sm"><strong>Bay Size (Width):</strong> {(buildingWidth / widthwiseBays).toFixed(2)} m</p>
        </div>
      </div>
    </div>
  );
}