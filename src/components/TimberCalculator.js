"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  calculateJoistSize, 
  calculateJoistSizeAsync,
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
const calculateMultiFloorBeamSize = (span, load, joistSpacing, numFloors, fireRating = 'none') => {
  // Calculate tributary width for the beam (in meters)
  // Tributary width is typically half the joist spacing on each side
  const tributaryWidth = joistSpacing;
  console.log(`Beam tributary width: ${tributaryWidth.toFixed(2)} m`);
  
  // Calculate load per meter of beam (kN/m)
  // load is in kPa (kN/m²), so multiply by tributary width to get kN/m
  const loadPerMeter = load * tributaryWidth;
  console.log(`Beam load per meter: ${loadPerMeter.toFixed(2)} kN/m`);
  
  // Calculate total distributed load on the beam
  const totalDistributedLoad = loadPerMeter * span;
  console.log(`Total distributed load on beam: ${totalDistributedLoad.toFixed(2)} kN`);
  
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
  
  console.log(`Beam size before fire adjustment: ${theoreticalWidth}x${theoreticalDepth}mm`);
  console.log(`Beam size after fire adjustment: ${fireAdjustedWidth}x${fireAdjustedDepth}mm`);
  
  // Find the nearest available width and depth
  const width = findNearestWidth(fireAdjustedWidth);
  const depth = findNearestDepth(width, fireAdjustedDepth);
  
  return {
    width: width,
    depth: depth,
    span: span,
    tributaryWidth: tributaryWidth,
    loadPerMeter: loadPerMeter,
    totalDistributedLoad: totalDistributedLoad,
    fireRating: fireRating,
    fireAllowance: fireAllowance
  };
};

// Rename the custom function to avoid naming conflict
const calculateMultiFloorColumnSize = (beamWidth, load, height, floors, fireRating = 'none', bayLength, bayWidth) => {
  // Column width MUST exactly match beam width
  const width = beamWidth;
  console.log(`Setting column width to exactly match beam width: ${width}mm`);
  
  // Calculate tributary area for the column (in square meters)
  // Each column typically supports a quarter of each of the four adjacent bays
  const tributaryArea = bayLength * bayWidth;
  console.log(`Column tributary area: ${tributaryArea.toFixed(2)} m²`);
  
  // Calculate load based on number of floors and tributary area
  // load is in kPa (kN/m²), so multiply by tributary area to get kN
  const loadPerFloor = load * tributaryArea;
  const totalLoad = loadPerFloor * floors;
  console.log(`Column load per floor: ${loadPerFloor.toFixed(2)} kN, Total load: ${totalLoad.toFixed(2)} kN`);
  
  // Calculate required cross-sectional area based on compression strength
  // Using a simplified approach with safety factor
  const compressionStrength = 26; // MPa (from MASSLAM_SL33_Mechanical_Properties.csv)
  const safetyFactor = 2.0; // Conservative safety factor
  const requiredArea = (totalLoad * 1000) / (compressionStrength / safetyFactor); // mm²
  
  // Calculate minimum depth based on required area and fixed width
  let requiredDepth = Math.ceil(requiredArea / width);
  console.log(`Minimum required depth based on axial load: ${requiredDepth}mm`);
  
  // Check for buckling - simplified approach
  // For timber columns, depth should generally be at least 1/20 of height for buckling resistance
  const minDepthForBuckling = Math.ceil(height * 1000 / 20);
  if (minDepthForBuckling > requiredDepth) {
    console.log(`Increasing depth to ${minDepthForBuckling}mm to prevent buckling`);
    requiredDepth = minDepthForBuckling;
  }
  
  // Ensure depth is at least equal to width (square column)
  if (width > requiredDepth) {
    console.log(`Increasing depth to match width: ${width}mm`);
    requiredDepth = width;
  }
  
  // Calculate fire resistance allowance if needed
  let fireAllowance = 0;
  if (fireRating && fireRating !== 'none') {
    fireAllowance = calculateFireResistanceAllowance(fireRating);
    console.log(`Adding fire allowance of ${fireAllowance}mm to column dimensions`);
  }
  
  // Add fire resistance allowance to depth only (width is fixed to match beam)
  // For columns, all 4 sides are exposed, but we only adjust depth
  const fireAdjustedWidth = width + (2 * fireAllowance); // Both sides exposed
  const fireAdjustedDepth = requiredDepth + (2 * fireAllowance); // Both sides exposed
  
  console.log(`Column size before fire adjustment: ${width}x${requiredDepth}mm`);
  console.log(`Column size after fire adjustment: ${fireAdjustedWidth}x${fireAdjustedDepth}mm`);
  
  // For column width, we must use exactly the beam width after fire adjustment
  // This ensures proper connection between beam and column
  const adjustedWidth = findNearestWidth(fireAdjustedWidth);
  
  // Find the nearest available depth for the given width
  const adjustedDepth = findNearestDepth(adjustedWidth, fireAdjustedDepth);
  console.log(`Final column size after rounding to available sizes: ${adjustedWidth}x${adjustedDepth}mm`);
  
  return {
    width: adjustedWidth,
    depth: adjustedDepth,
    height: height,
    load: totalLoad,
    tributaryArea: tributaryArea,
    loadPerFloor: loadPerFloor,
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
  
  // Set initial joist direction based on building dimensions
  useEffect(() => {
    // By default, joists should span the shorter distance
    // This is just for initial setup - after that, the user can toggle
    setJoistsRunLengthwise(buildingWidth > buildingLength);
  }, [buildingLength, buildingWidth]);
  
  // Load saved project if available
  useEffect(() => {
    const loadSavedProject = () => {
      try {
        const currentProject = localStorage.getItem('currentProject');
        if (currentProject) {
          const project = JSON.parse(currentProject);
          
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
          
          // Clear the current project from localStorage
          localStorage.removeItem('currentProject');
        }
      } catch (error) {
        console.error('Error loading saved project:', error);
      }
    };
    
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
  const [load, setLoad] = useState(1.5); // kPa
  
  // Constants
  const structureType = 'floor'; // Fixed to floor
  
  // Add state for timber properties
  const [timberGrade, setTimberGrade] = useState('MASSLAM_SL33');
  const [propertiesLoaded, setPropertiesLoaded] = useState(false);
  
  // Load timber properties from CSV when component mounts
  useEffect(() => {
    const loadProperties = async () => {
      try {
        await loadTimberProperties();
        setPropertiesLoaded(true);
        console.log('Timber properties loaded from CSV:', TIMBER_PROPERTIES.MASSLAM_SL33);
      } catch (error) {
        console.error('Error loading timber properties:', error);
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
      const loadedSizes = await loadMasslamSizes();
      console.log(`Loaded ${loadedSizes.length} MASSLAM sizes`);
      
      // Filter to standard sizes
      console.log('Filtering to standard sizes');
      const standardSizes = filterToStandardSizes();
      console.log(`Filtered to ${standardSizes.length} standard sizes`);
      
      // Verify the loaded sizes
      const verified = verifyLoadedSizes();
      console.log('Verification result:', verified);
      
      // Debug the loaded sizes
      debugMasslamSizes();
    };
    
    loadSizes();
  }, []);
  
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
  
  // Calculate results based on inputs
  const calculateResults = async () => {
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
      // Use the async version to get minimum width from FRL.csv
      const joistSize = await calculateJoistSizeAsync(joistSpan, 800, load, timberGrade, fireRating);
      
      // Calculate beam span (beams span perpendicular to joists)
      const beamSpan = joistsRunLengthwise ? maxWidthwiseSpan : maxLengthwiseSpan;
      
      // Define joist spacing (in meters)
      const joistSpacing = 0.8; // 800mm spacing
      
      // Calculate beam size based on span, load, joist spacing, and number of floors
      const beamSize = calculateMultiFloorBeamSize(beamSpan, load, joistSpacing, numFloors, fireRating);
      
      // Calculate average bay dimensions for tributary area calculation
      const avgBayLength = buildingLength / lengthwiseBays;
      const avgBayWidth = buildingWidth / widthwiseBays;
      
      // Calculate column size based on beam width, load, floor height, and number of floors
      const columnSize = calculateMultiFloorColumnSize(beamSize.width, load, floorHeight, numFloors, fireRating, avgBayLength, avgBayWidth);
      
      // Calculate timber weight and volumes
      const timberResult = calculateTimberWeight(
        joistSize, 
        beamSize, 
        columnSize, 
        buildingLength, 
        buildingWidth, 
        numFloors,
        lengthwiseBays,
        widthwiseBays,
        joistsRunLengthwise,
        timberGrade
      );
      
      // Calculate carbon savings
      const carbonSavings = calculateCarbonSavings(timberResult);
      
      // Calculate cost
      const costResult = calculateCost(
        timberResult,
        joistSize,
        buildingLength,
        buildingWidth,
        numFloors
      );
      
      // Validate the structure
      const validationResult = validateStructure(joistSize, beamSize, columnSize, joistSpan, beamSpan);
      
      // Set results
      setResults({
        buildingLength,
        buildingWidth,
        lengthwiseBays,
        widthwiseBays,
        numFloors,
        floorHeight,
        load,
        fireRating,
        joistSpan,
        beamSpan,
        joistsRunLengthwise,
        joists: joistSize,
        beams: beamSize,
        columns: columnSize,
        timberWeight: timberResult.weight,
        timberVolume: timberResult.totalVolume,
        carbonSavings,
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
        costs: {
          joists: costResult.elements.joists.cost,
          beams: costResult.elements.beams.cost,
          columns: costResult.elements.columns.cost,
          total: costResult.totalCost
        },
        rates: {
          joists: costResult.elements.joists.rate,
          beams: costResult.elements.beams.rate,
          columns: costResult.elements.columns.rate
        },
        floorArea: costResult.elements.joists.area,
        validationResult,
        customBayDimensions: useCustomBayDimensions ? {
          lengthwiseBayWidths,
          widthwiseBayWidths
        } : null
      });
      
      setError(null);
    } catch (error) {
      console.error('Error calculating results:', error);
      setError(error.message);
    }
  };

  useEffect(() => {
    // Call the async function
    calculateResults();
    
    // Dependencies
  }, [buildingLength, buildingWidth, lengthwiseBays, widthwiseBays, numFloors, floorHeight, load, fireRating, joistsRunLengthwise, useCustomBayDimensions, customLengthwiseBayWidths, customWidthwiseBayWidths, timberGrade]);

  // Handle input changes
  const handleBuildingLengthChange = (value) => {
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue)) {
      setBuildingLength(parsedValue);
    }
  };

  const handleBuildingWidthChange = (value) => {
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue)) {
      setBuildingWidth(parsedValue);
    }
  };

  const handleLengthwiseBaysChange = (value) => {
    const parsedValue = parseInt(value, 10);
    if (!isNaN(parsedValue)) {
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
    if (!isNaN(parsedValue)) {
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
    const floors = parseInt(value);
    if (!isNaN(floors) && floors >= 1 && floors <= 10) {
      setNumFloors(floors);
    }
  };

  const handleFloorHeightChange = (value) => {
    const height = parseFloat(value);
    if (!isNaN(height) && height >= 2.4 && height <= 8.0) {
      setFloorHeight(height);
    }
  };

  const handleLoadChange = (value) => {
    setLoad(value);
  };

  // Update handleFireRatingChange to use the extracted calculateResults function
  const handleFireRatingChange = (value) => {
    setFireRating(value);
    // Explicitly trigger recalculation when fire rating changes
    calculateResults();
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
  
  // State for bay-specific joist sizes
  const [bayJoistSizes, setBayJoistSizes] = useState([]);

  // Calculate bay-specific joist sizes when relevant parameters change
  useEffect(() => {
    const calculateBayJoistSizes = async () => {
      if (!useCustomBayDimensions || !results) return;
      
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
          // Use the async version to get minimum width from FRL.csv
          const bayJoistSize = await calculateJoistSizeAsync(joistSpan, 800, load, timberGrade, fireRating);
          
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
      setBayJoistSizes(uniqueBaySizes);
    };
    
    calculateBayJoistSizes();
  }, [useCustomBayDimensions, results, fireRating, load, timberGrade, joistsRunLengthwise]);
  
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
                
                <div className="apple-specs-row">
                  <div className="apple-specs-label">Load Type</div>
                  <div className="apple-specs-value">
                    <div className="flex flex-col space-y-3">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-5 w-5"
                          style={{ accentColor: 'var(--apple-blue)' }}
                          name="loadType"
                          checked={load === 1.5}
                          onChange={() => handleLoadChange(1.5)}
                        />
                        <span className="ml-3">Residential (1.5 kPa)</span>
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
                
                <div className="apple-specs-row">
                  <div className="apple-specs-label">Building Length (m)</div>
                  <div className="apple-specs-value">
                    <input 
                      type="number" 
                      className="apple-input mb-0 w-full"
                      min="1" 
                      max="50" 
                      value={buildingLength} 
                      onChange={(e) => handleBuildingLengthChange(e.target.value)} 
                      onInput={(e) => {
                        if (e.target.value.startsWith('0')) {
                          e.target.value = e.target.value.replace(/^0+/, '');
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="apple-specs-row">
                  <div className="apple-specs-label">Building Width (m)</div>
                  <div className="apple-specs-value">
              <input 
                type="number" 
                      className="apple-input mb-0"
                      min="1" 
                      max="50" 
                      value={buildingWidth} 
                      onChange={(e) => handleBuildingWidthChange(e.target.value)} 
                      onInput={(e) => {
                        if (e.target.value.startsWith('0')) {
                          e.target.value = e.target.value.replace(/^0+/, '');
                        }
                      }}
              />
            </div>
                </div>

                <div className="apple-specs-row">
                  <div className="apple-specs-label">Number of Floors</div>
                  <div className="apple-specs-value">
                    <input 
                      type="number" 
                      className="apple-input mb-0"
                      min="1" 
                      max="10"
                      value={numFloors} 
                      onChange={(e) => handleNumFloorsChange(e.target.value)} 
                      onInput={(e) => {
                        // Remove any leading zeros
                        if (e.target.value.startsWith('0')) {
                          e.target.value = e.target.value.replace(/^0+/, '');
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="apple-specs-row">
                  <div className="apple-specs-label">Floor Height (m)</div>
                  <div className="apple-specs-value">
                    <input 
                      type="number" 
                      className="apple-input mb-0"
                      min="2.4" 
                      max="8.0"
                      step="0.1"
                      value={floorHeight} 
                      onChange={(e) => handleFloorHeightChange(e.target.value)} 
                      onInput={(e) => {
                        // Remove any leading zeros
                        if (e.target.value.startsWith('0')) {
                          e.target.value = e.target.value.replace(/^0+/, '');
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="apple-specs-row">
                  <div className="apple-specs-label">Bays Wide
                    <div className="text-xs" style={{ color: 'var(--apple-text-secondary)' }}>(Columns)</div>
                  </div>
                  <div className="apple-specs-value">
                    <input 
                      type="number" 
                      className="apple-input mb-2"
                      min="1" 
                      max="20" 
                      value={lengthwiseBays} 
                      onChange={(e) => handleLengthwiseBaysChange(e.target.value)} 
                      onInput={(e) => {
                        if (e.target.value.startsWith('0')) {
                          e.target.value = e.target.value.replace(/^0+/, '');
                        }
                      }}
                    />
                    <p className="text-xs" style={{ color: 'var(--apple-text-secondary)' }}>
                      Auto-adjusts when bay span exceeds {MAX_BAY_SPAN}m
                    </p>
                  </div>
                </div>

                <div className="apple-specs-row">
                  <div className="apple-specs-label">Bays Deep
                    <div className="text-xs" style={{ color: 'var(--apple-text-secondary)' }}>(Rows)</div>
                  </div>
                  <div className="apple-specs-value">
                    <input 
                      type="number" 
                      className="apple-input mb-2"
                      min="1" 
                      max="20" 
                      value={widthwiseBays} 
                      onChange={(e) => handleWidthwiseBaysChange(e.target.value)} 
                      onInput={(e) => {
                        if (e.target.value.startsWith('0')) {
                          e.target.value = e.target.value.replace(/^0+/, '');
                        }
                      }}
                    />
                    <p className="text-xs" style={{ color: 'var(--apple-text-secondary)' }}>
                      Auto-adjusts when bay span exceeds {MAX_BAY_SPAN}m
                    </p>
                  </div>
                </div>

                <div className="apple-specs-row">
                  <div className="apple-specs-label">Joist Centres (mm)</div>
                  <div className="apple-specs-value">
                    <input 
                      type="number" 
                      className="apple-input mb-2 bg-gray-100 cursor-not-allowed"
                      value={800} 
                      disabled 
                    />
                    <p className="text-xs" style={{ color: 'var(--apple-text-secondary)' }}>Fixed at 800mm centres</p>
                  </div>
                </div>
              </div>
              
              {/* Calculated Bay Sizes */}
              <div className="mb-6 md:mb-8 p-4 md:p-6 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                <h4 className="text-sm md:text-md font-medium mb-3 md:mb-4">Calculated Bay Sizes</h4>
                <div className="grid grid-cols-1 gap-2 md:gap-3">
                  <p className="text-sm"><strong>Bay Size (Length):</strong> {(buildingLength / lengthwiseBays).toFixed(2)} m</p>
                  <p className="text-sm"><strong>Bay Size (Width):</strong> {(buildingWidth / widthwiseBays).toFixed(2)} m</p>
                  <p className="text-sm"><strong>Joist Spacing:</strong> 800 mm (fixed)</p>
                </div>
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
                {/* Building Information */}
                <div className="apple-results-section p-4 md:p-6 rounded-lg" style={{ backgroundColor: 'rgba(0, 113, 227, 0.05)' }}>
                  <h3 className="font-medium mb-3 md:mb-4">Building Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Dimensions:</p>
                      <p className="font-medium">{results.buildingLength}m × {results.buildingWidth}m</p>
                    </div>
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Number of Floors:</p>
                      <p className="font-medium">{results.numFloors}</p>
                    </div>
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Bay Size:</p>
                      <p className="font-medium">{(results.buildingLength / results.lengthwiseBays).toFixed(2)}m × {(results.buildingWidth / results.widthwiseBays).toFixed(2)}m</p>
                    </div>
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Load:</p>
                      <p className="font-medium">{results.load} kPa ({results.load === 1.5 ? 'Residential' : 'Commercial'})</p>
                    </div>
                  </div>
                </div>
                
                {/* Timber Sizes Table - Moved above visualizations */}
                <div className="apple-results-section">
                  <h3 className="text-md md:text-lg font-semibold mb-3 md:mb-4">Selected Timber Sizes</h3>
                  <div className="overflow-x-auto max-w-full">
                    <TimberSizesTable results={results} compact={true} />
                  </div>
                </div>
                
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
                        <div className="relative w-full" style={{ 
                          maxWidth: '600px',
                          aspectRatio: `${buildingLength} / ${buildingWidth}`,
                          maxHeight: '400px'
                        }}>
                          {/* Calculate bay dimensions */}
                          {(() => {
                            const { lengthwiseBayWidths, widthwiseBayWidths } = calculateBayDimensions();
                            
                            // Calculate grid template columns and rows based on custom widths
                            const gridTemplateColumns = lengthwiseBayWidths.map(width => 
                              `${(width / buildingLength) * 100}fr`
                            ).join(' ');
                            
                            const gridTemplateRows = widthwiseBayWidths.map(width => 
                              `${(width / buildingWidth) * 100}fr`
                            ).join(' ');
                            
                            // Generate column labels (A, B, C, ...)
                            const columnLabels = Array.from({ length: results.lengthwiseBays }, (_, i) => 
                              String.fromCharCode(65 + i)
                            );
                            
                            return (
                              <>
                                {/* Column labels (alphabetical) */}
                                <div className="absolute top-[-20px] left-0 right-0 flex justify-between px-2">
                                  {columnLabels.map((label, index) => {
                                    // Calculate position for custom bay widths
                                    let leftPosition = '50%';
                                    if (useCustomBayDimensions) {
                                      const startPos = lengthwiseBayWidths.slice(0, index).reduce((sum, w) => sum + w, 0);
                                      const width = lengthwiseBayWidths[index];
                                      leftPosition = `${((startPos + width/2) / buildingLength) * 100}%`;
                                    } else {
                                      leftPosition = `${((index + 0.5) / results.lengthwiseBays) * 100}%`;
                                    }
                                    
                                    return (
                                      <div 
                                        key={`col-${label}`} 
                                        className="absolute text-xs font-semibold"
                                        style={{ 
                                          left: leftPosition,
                                          transform: 'translateX(-50%)',
                                          color: 'var(--apple-text-secondary)'
                                        }}
                                      >
                                        {label}
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {/* Row labels (numerical) */}
                                <div className="absolute top-0 bottom-0 left-[-20px] flex flex-col justify-between py-2">
                                  {Array.from({ length: results.widthwiseBays }).map((_, index) => {
                                    // Calculate position for custom bay heights
                                    let topPosition = '50%';
                                    if (useCustomBayDimensions) {
                                      const startPos = widthwiseBayWidths.slice(0, index).reduce((sum, h) => sum + h, 0);
                                      const height = widthwiseBayWidths[index];
                                      topPosition = `${((startPos + height/2) / buildingWidth) * 100}%`;
                                    } else {
                                      topPosition = `${((index + 0.5) / results.widthwiseBays) * 100}%`;
                                    }
                                    
                                    return (
                                      <div 
                                        key={`row-${index+1}`} 
                                        className="absolute text-xs font-semibold"
                                        style={{ 
                                          top: topPosition,
                                          transform: 'translateY(-50%)',
                                          color: 'var(--apple-text-secondary)'
                                        }}
                                      >
                                        {index + 1}
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                <div className="bay-grid absolute inset-0" style={{
                                  display: 'grid',
                                  gridTemplateColumns: useCustomBayDimensions ? gridTemplateColumns : `repeat(${results.lengthwiseBays}, 1fr)`,
                                  gridTemplateRows: useCustomBayDimensions ? gridTemplateRows : `repeat(${results.widthwiseBays}, 1fr)`,
                                  gap: '2px'
                                }}>
                                  {Array.from({ length: results.lengthwiseBays * results.widthwiseBays }).map((_, index) => {
                                    const row = Math.floor(index / results.lengthwiseBays);
                                    const col = index % results.lengthwiseBays;
                                    
                                    // Get the dimensions for this specific bay
                                    const bayWidth = lengthwiseBayWidths[col];
                                    const bayHeight = widthwiseBayWidths[row];
                                    
                                    // Generate bay label (e.g., "A1", "B2", etc.)
                                    const bayLabel = `${columnLabels[col]}${row + 1}`;
                                    
                                    return (
                                      <div key={index} className="bay-cell relative" style={{
                                        backgroundColor: '#e0e0e0',
                                        border: '1px solid #999',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        fontSize: '0.8rem',
                                        padding: '8px',
                                        borderRadius: '0'
                                      }}>
                                        {/* Bay Label */}
                                        <div className="absolute top-1 left-1 text-xs font-medium text-gray-600">
                                          {bayLabel}
                                        </div>
                                        
                                        {useCustomBayDimensions && bayWidth !== undefined && bayHeight !== undefined && (
                                          <div className="text-xs" style={{ 
                                            position: 'relative', 
                                            top: '-20px', 
                                            padding: '2px 4px',
                                            borderRadius: '2px'
                                          }}>
                                            {bayWidth.toFixed(1)}m × {bayHeight.toFixed(1)}m
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            );
                          })()}
                          
                          {/* Joist Direction Arrows */}
                          {(() => {
                            // Calculate bay dimensions
                            const { lengthwiseBayWidths, widthwiseBayWidths } = calculateBayDimensions();
                            
                            // Determine if joists span lengthwise or widthwise for each bay
                            return Array.from({ length: results.lengthwiseBays * results.widthwiseBays }).map((_, index) => {
                              const row = Math.floor(index / results.lengthwiseBays);
                              const col = index % results.lengthwiseBays;
                              
                              // Get the dimensions for this specific bay
                              const bayWidth = lengthwiseBayWidths[col];
                              const bayHeight = widthwiseBayWidths[row];
                              
                              // Use global joist direction instead of calculating per bay
                              const joistsSpanLengthwise = joistsRunLengthwise;
                              
                              // Calculate position based on cumulative widths
                              const leftPosition = lengthwiseBayWidths.slice(0, col).reduce((sum, w) => sum + w, 0) + bayWidth / 2;
                              const topPosition = widthwiseBayWidths.slice(0, row).reduce((sum, h) => sum + h, 0) + bayHeight / 2;
                              
                              // Calculate percentages
                              const leftPercent = (leftPosition / buildingLength) * 100;
                              const topPercent = (topPosition / buildingWidth) * 100;
                              
                              const arrowStyle = {
                                position: 'absolute',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#4B5563', // Dark gray color
                                fontWeight: 'bold',
                                fontSize: '1.2rem',
                                zIndex: 10,
                                cursor: 'pointer' // Add cursor pointer to indicate clickable
                              };
                              
                              if (joistsSpanLengthwise) {
                                // Horizontal arrows (joists span left to right)
                                return (
                                  <div 
                                    key={`arrow-${index}`}
                                    style={{
                                      ...arrowStyle,
                                      top: `${topPercent}%`,
                                      left: `${leftPercent}%`,
                                      transform: 'translate(-50%, -50%)',
                                      width: `${(bayWidth / buildingLength) * 70}%`,
                                      height: '20%'
                                    }}
                                    onClick={toggleJoistDirection}
                                  >
                                    <span>↔</span>
                                  </div>
                                );
                              } else {
                                // Vertical arrows (joists span top to bottom)
                                return (
                                  <div 
                                    key={`arrow-${index}`}
                                    style={{
                                      ...arrowStyle,
                                      left: `${leftPercent}%`,
                                      top: `${topPercent}%`,
                                      transform: 'translate(-50%, -50%)',
                                      height: `${(bayHeight / buildingWidth) * 70}%`,
                                      width: '20%',
                                      flexDirection: 'column'
                                    }}
                                    onClick={toggleJoistDirection}
                                  >
                                    <span>↕</span>
                                  </div>
                                );
                              }
                            });
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
                        <div className="flex items-center justify-center">
                          <div className="flex items-center bg-gray-100 rounded-lg p-1" style={{ border: '1px solid var(--apple-border)' }}>
                            <button 
                              className={`px-2 md:px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-colors ${joistsRunLengthwise ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                              style={{ 
                                color: joistsRunLengthwise ? 'var(--apple-blue)' : 'var(--apple-text-secondary)',
                              }}
                              onClick={() => setJoistsRunLengthwise(true)}
                            >
                              Horizontal Joists ↔
                            </button>
                            <button 
                              className={`px-2 md:px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-colors ${!joistsRunLengthwise ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                              style={{ 
                                color: !joistsRunLengthwise ? 'var(--apple-blue)' : 'var(--apple-text-secondary)',
                              }}
                              onClick={() => setJoistsRunLengthwise(false)}
                            >
                              Vertical Joists ↕
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <span style={{ color: '#4B5563' }}>↔ &#47; ↕ Arrows indicate joist span direction</span> <span className="text-xs">(click arrows or use toggle above to change direction)</span>
                      </div>
                    </div>
                  </div>
              </div>
              
                {/* Results Section */}
                {results && (
                  <div className="apple-section mt-4">
                    <h3 className="apple-section-title text-lg md:text-xl font-semibold mb-3 md:mb-4">Calculated Timber Sizes</h3>
                    <div className="apple-section-content">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Joist Results */}
                        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
                          <h4 className="font-semibold mb-2 text-sm md:text-base">Joists</h4>
                          <p className="text-sm md:text-base"><strong>Size:</strong> {results.joists.width}mm × {results.joists.depth}mm</p>
                          <p className="text-sm md:text-base"><strong>Span:</strong> {results.joistSpan?.toFixed(2) || '0.00'}m</p>
                          <p className="text-sm md:text-base"><strong>Spacing:</strong> 800mm</p>
                          {results.joists.fireAllowance > 0 && (
                            <p className="text-sm md:text-base text-blue-600">
                              <strong>Fire Allowance:</strong> {results.joists.fireAllowance.toFixed(1)}mm per face
                            </p>
                          )}
                          
                          {/* Display different joist sizes for different bays if using custom bay dimensions */}
                          {useCustomBayDimensions && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs md:text-sm font-medium mb-1">Grid cell-specific sizes:</p>
                              <div className="text-xs space-y-1 overflow-auto max-h-32 md:max-h-none">
                                {bayJoistSizes.map((item, index) => (
                                  <div key={`joist-size-${index}`}>
                                    <strong>{item.span?.toFixed(2) || '0.00'}m span:</strong> {item.width}mm × {item.depth}mm
                                    <span className="text-gray-500 ml-1">({item.count} {item.count === 1 ? 'grid cell' : 'grid cells'})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
              
                        {/* Beam Results */}
                        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
                          <h4 className="font-semibold mb-2 text-sm md:text-base">Beams</h4>
                          <p className="text-sm md:text-base"><strong>Size:</strong> {results.beams.width}mm × {results.beams.depth}mm</p>
                          <p className="text-sm md:text-base"><strong>Span:</strong> {results.beamSpan?.toFixed(2) || '0.00'}m</p>
                          <p className="text-sm md:text-base"><strong>Tributary Width:</strong> {results.beams.tributaryWidth?.toFixed(2) || '0.00'}m</p>
                          <p className="text-sm md:text-base"><strong>Load per Meter:</strong> {results.beams.loadPerMeter?.toFixed(2) || '0.00'} kN/m</p>
                          <p className="text-sm md:text-base"><strong>Total Load:</strong> {results.beams.totalDistributedLoad?.toFixed(2) || '0.00'} kN</p>
                          {results.beams.fireAllowance > 0 && (
                            <p className="text-sm md:text-base text-blue-600">
                              <strong>Fire Allowance:</strong> {results.beams.fireAllowance.toFixed(1)}mm per face
                            </p>
                          )}
                          {results.beams.width === results.columns.width && (
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
                                      
                                      // Beams span the longer distance
                                      const beamsSpanLengthwise = bayWidth > bayHeight;
                                      const beamSpan = beamsSpanLengthwise ? bayWidth : bayHeight;
                                      
                                      // Calculate beam size for this specific span
                                      const bayBeamSize = calculateBeamSize(beamSpan, load, numFloors, fireRating);
                                      
                                      // Find if this size already exists in our unique list
                                      const existingSize = uniqueBaySizes.find(item => 
                                        item.width === bayBeamSize.width && 
                                        item.depth === bayBeamSize.depth &&
                                        Math.abs(item.span - beamSpan) < 0.01
                                      );
                                      
                                      if (!existingSize) {
                                        uniqueBaySizes.push({
                                          span: beamSpan,
                                          width: bayBeamSize.width,
                                          depth: bayBeamSize.depth,
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
                                    <div key={`beam-size-${index}`}>
                                      <strong>{item.span?.toFixed(2) || '0.00'}m span:</strong> {item.width}mm × {item.depth}mm
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
                          <p className="text-sm md:text-base"><strong>Size:</strong> {results.columns.width}mm × {results.columns.depth}mm</p>
                          <p className="text-sm md:text-base"><strong>Height:</strong> {results.columns.height}m</p>
                          <p className="text-sm md:text-base"><strong>Floors:</strong> {results.numFloors}</p>
                          <p className="text-sm md:text-base"><strong>Tributary Area:</strong> {results.columns.tributaryArea?.toFixed(2) || '0.00'}m²</p>
                          <p className="text-sm md:text-base"><strong>Load per Floor:</strong> {results.columns.loadPerFloor?.toFixed(2) || '0.00'} kN</p>
                          <p className="text-sm md:text-base"><strong>Total Load:</strong> {results.columns.load?.toFixed(2) || '0.00'} kN</p>
                          {results.columns.fireAllowance > 0 && (
                            <p className="text-sm md:text-base text-blue-600">
                              <strong>Fire Allowance:</strong> {results.columns.fireAllowance.toFixed(1)}mm per face
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
                              <p className="text-sm md:text-base"><strong>Carbon Storage:</strong> {(results.timberVolume * 0.9 || 0).toFixed(2)} tonnes CO₂e</p>
                              <p className="text-sm md:text-base"><strong>Embodied Carbon:</strong> {(results.timberVolume * 0.2 || 0).toFixed(2)} tonnes CO₂e</p>
                              
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
                      
                      {/* Project Estimate */}
                      <div className="mt-4 bg-white p-4 rounded-lg shadow">
                        <h4 className="font-semibold mb-2">Project Estimate</h4>
                        <div className="grid grid-cols-1 bg-white p-3 md:p-4 rounded-lg shadow">
                          <div className="border-b pb-3 mb-3">
                            <h5 className="font-semibold mb-2 text-sm md:text-base">Total Cost Estimate</h5>
                            <p className="text-xl md:text-2xl font-bold text-green-700">{formatCurrency(results.costs?.total || 0)}</p>
                            <p className="text-xs md:text-sm text-gray-500 mt-1">Excluding GST and installation</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs md:text-sm text-gray-600">Joists</p>
                              <p className="text-sm md:text-base font-semibold">{formatCurrency(results.costs?.joists || 0)}</p>
                              <p className="text-xs text-gray-500">{results.elementCounts?.joists || 0} pieces</p>
                            </div>
                            <div>
                              <p className="text-xs md:text-sm text-gray-600">Beams</p>
                              <p className="text-sm md:text-base font-semibold">{formatCurrency(results.costs?.beams || 0)}</p>
                              <p className="text-xs text-gray-500">{results.elementCounts?.beams || 0} pieces</p>
                            </div>
                            <div>
                              <p className="text-xs md:text-sm text-gray-600">Columns</p>
                              <p className="text-sm md:text-base font-semibold">{formatCurrency(results.costs?.columns || 0)}</p>
                              <p className="text-xs text-gray-500">{results.elementCounts?.columns || 0} pieces</p>
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
    </div>
  );
}