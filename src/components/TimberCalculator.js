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
  useEffect(() => {
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
          false // isEdgeBeam = false
        );
        
        // Calculate edge beam size (beams that support load from only one side)
        // These beams have a smaller tributary width (half of interior beams)
        const edgeBeamSize = calculateMultiFloorBeamSize(
          beamSpan, 
          load, 
          joistSpacing, 
          numFloors, 
          fireRating, 
          joistsRunLengthwise, 
          avgBayWidth, 
          avgBayLength,
          true // isEdgeBeam = true
        );
        
        // Use the interior beam size as the primary beam size for column calculations
        // since interior beams are typically larger and more critical
        const beamSize = interiorBeamSize;
        
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
        
        // Calculate carbon benefits
        const carbonResults = calculateCarbonSavings(timberResult);
        
        // Calculate cost estimate
        const costEstimate = calculateCost(timberResult, joistSize, buildingLength, buildingWidth, numFloors);
        
        // Validate the structure
        const validationResult = validateStructure(joistSize, beamSize, columnSize);
        
        // Set the results
        setResults({
          buildingLength,
          buildingWidth,
          numFloors,
          floorHeight,
          load,
          fireRating,
          lengthwiseBays,
          widthwiseBays,
          joistsRunLengthwise,
          joistSize,
          beamSize,
          columnSize,
          timberWeight: timberResult.weight,
          timberVolume: timberResult.totalVolume,
          elementVolumes: {
            joists: timberResult.elements.joists.volume,
            beams: timberResult.elements.beams.volume,
            columns: timberResult.elements.columns.volume
          },
          carbonStorage: carbonResults.carbonStorage,
          embodiedCarbon: carbonResults.embodiedCarbon,
          carbonSavings: carbonResults.carbonSavings,
          costs: costEstimate,
          elementCounts: {
            joists: timberResult.elements.joists.count,
            beams: timberResult.elements.beams.count,
            columns: timberResult.elements.columns.count
          },
          validation: validationResult,
          edgeBeamSize: edgeBeamSize
        });
        
        setError(null);
      } catch (err) {
        console.error('Error calculating results:', err);
        setError(`Failed to calculate results: ${err.message}`);
        setResults(null);
      }
    };
    
    // Debounce calculations to avoid excessive recalculations
    const timer = setTimeout(() => {
      calculateResults();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [buildingLength, buildingWidth, lengthwiseBays, widthwiseBays, load, numFloors, timberGrade, fireRating, useCustomBayDimensions, customLengthwiseBayWidths, customWidthwiseBayWidths, joistsRunLengthwise]);

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
    // State to track the displayed value during sliding
    const [localValue, setLocalValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);
    const debounceTimerRef = useRef(null);
    const inputRef = useRef(null);
    
    // Generate tick marks for the slider if needed
    const tickMarks = showTicks ? [] : null;
    if (showTicks) {
      for (let i = min; i <= max; i += (max - min) / 5) {
        tickMarks.push(isInteger ? Math.round(i) : Math.round(i * 100) / 100);
      }
    }

    // Handle slider change with debouncing
    const handleSliderChange = (e) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      
      // Clear any existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Set a new timer to update the actual value after user stops sliding
      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue);
      }, 300); // 300ms debounce
    };

    // Handle manual input change
    const handleInputChange = (e) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
    };

    // Handle input blur (when user finishes editing)
    const handleInputBlur = () => {
      setIsEditing(false);
      
      // Parse the value and ensure it's within bounds
      let parsedValue = isInteger ? parseInt(localValue, 10) : parseFloat(localValue);
      
      // Handle invalid input
      if (isNaN(parsedValue)) {
        setLocalValue(value); // Reset to the original value
        return;
      }
      
      // Clamp the value between min and max
      parsedValue = Math.max(min, Math.min(max, parsedValue));
      
      // Update the local value and trigger the onChange
      setLocalValue(parsedValue);
      onChange(parsedValue.toString());
    };

    // Handle key press in the input field
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        e.target.blur(); // Trigger the blur event to apply the change
      }
    };

    // Start editing and select the entire input text
    const startEditing = () => {
      if (disabled) return;
      
      setIsEditing(true);
      
      // Use setTimeout to ensure the input is rendered before trying to focus
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          
          // Select the entire input text instead of just positioning cursor at the end
          inputRef.current.select();
        }
      }, 10);
    };

    // Ensure the local value stays in sync with the prop value
    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    return (
      <div className="apple-specs-row">
        <div className="apple-specs-label">{label}</div>
        <div className="apple-specs-value">
          <div className="flex items-center space-x-3 mb-1">
            <div className="relative w-full">
              <input 
                type="range" 
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                min={min} 
                max={max} 
                step={step}
                value={localValue} 
                onChange={handleSliderChange}
                disabled={disabled}
              />
              {showTicks && (
                <div className="flex justify-between w-full px-1 mt-1">
                  {tickMarks.map((mark, index) => (
                    <div key={index} className="text-xs text-gray-400">{mark}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="w-16 flex-shrink-0 text-right">
              {/* Show editable input on desktop, static text on mobile */}
              <div className="hidden md:block">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    className="apple-input mb-0 w-full text-right"
                    value={localValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyPress={handleKeyPress}
                    disabled={disabled}
                  />
                ) : (
                  <span 
                    className="text-sm font-medium cursor-pointer hover:text-blue-500 border border-gray-300 rounded px-2 py-1 transition-colors hover:border-blue-400"
                    onClick={startEditing}
                  >
                    {isInteger ? Math.round(localValue) : localValue}{unit}
                  </span>
                )}
              </div>
              {/* Always show static text on mobile */}
              <div className="block md:hidden">
                <span className="text-sm font-medium">
                  {isInteger ? Math.round(localValue) : localValue}{unit}
                </span>
              </div>
            </div>
          </div>
          {description && <p className="text-xs" style={{ color: 'var(--apple-text-secondary)' }}>{description}</p>}
        </div>
      </div>
    );
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
                  min={6}
                  max={80}
                  step={0.1}
                  unit="m"
                  showTicks={false}
                />

                <SliderInput 
                  label="Building Width (m)"
                  value={buildingWidth}
                  onChange={handleBuildingWidthChange}
                  min={6}
                  max={80}
                  step={0.1}
                  unit="m"
                  showTicks={false}
                />

                <SliderInput 
                  label="Number of Floors"
                  value={numFloors}
                  onChange={handleNumFloorsChange}
                  min={1}
                  max={10}
                  step={1}
                  isInteger={true}
                />

                <SliderInput 
                  label="Floor Height (m)"
                  value={floorHeight}
                  onChange={handleFloorHeightChange}
                  min={2}
                  max={6}
                  step={0.2}
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
                  description={`Auto-adjusts when bay span exceeds ${MAX_BAY_SPAN}m`}
                />

                <SliderInput 
                  label="Bays Deep (Rows)"
                  value={widthwiseBays}
                  onChange={handleWidthwiseBaysChange}
                  min={1}
                  max={20}
                  step={1}
                  isInteger={true}
                  description={`Auto-adjusts when bay span exceeds ${MAX_BAY_SPAN}m`}
                />

                {/* Fixed Joist Centres - Static display instead of slider */}
                <div className="apple-specs-row">
                  <div className="apple-specs-label">Joist Centres</div>
                  <div className="apple-specs-value">
                    <div className="flex items-center mb-1">
                      <span className="text-sm font-medium">800 mm</span>
                    </div>
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
                        <div className="relative w-full" style={{ 
                          maxWidth: '100%',
                          aspectRatio: `${buildingLength} / ${buildingWidth}`,
                          maxHeight: '500px'
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
                            
                            // Set gap based on joist direction - smaller gap where there are no beams
                            const horizontalGap = joistsRunLengthwise ? '1px' : '4px';
                            const verticalGap = joistsRunLengthwise ? '4px' : '1px';
                            
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
                                  columnGap: horizontalGap,
                                  rowGap: verticalGap
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
                                        borderRadius: '0',
                                        margin: '2px'
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
                                      width: '30px',
                                      height: '30px'
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
                                      width: '30px',
                                      height: '30px'
                                    }}
                                    onClick={toggleJoistDirection}
                                  >
                                    <span>↕</span>
                                  </div>
                                );
                              }
                            });
                          })()}
                          
                          {/* Beam Lines */}
                          {(() => {
                            // Calculate bay dimensions
                            const { lengthwiseBayWidths, widthwiseBayWidths } = calculateBayDimensions();
                            
                            // Beams run perpendicular to joists
                            const beamsRunLengthwise = !joistsRunLengthwise;
                            
                            // Create arrays to hold beam lines
                            const beamLines = [];
                            
                            // Set gap based on joist direction - smaller gap where there are no beams
                            // Defining these variables here so they're in scope for the beam lines
                            const horizontalGap = joistsRunLengthwise ? '1px' : '4px';
                            const verticalGap = joistsRunLengthwise ? '4px' : '1px';
                            
                            // Calculate the offset for beam lines to account for grid gaps and margins
                            const gridGapHorizontal = parseInt(horizontalGap.replace('px', ''));
                            const gridGapVertical = parseInt(verticalGap.replace('px', ''));
                            const cellMargin = 2; // The margin of each bay cell (from the style)
                            
                            if (beamsRunLengthwise) {
                              // Horizontal beams (when joists run vertically)
                              // Add horizontal lines at each row boundary
                              let cumulativeHeight = 0;
                              
                              // Add a line at the top of the grid (edge beam)
                              beamLines.push(
                                <div 
                                  key="beam-top"
                                  style={{
                                    position: 'absolute',
                                    top: '-3px', // Slightly above the grid to avoid overlapping
                                    left: '0',
                                    width: '100%',
                                    height: '3px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    zIndex: 5
                                  }}
                                />
                              );
                              
                              // Add lines between rows (internal beams)
                              for (let i = 0; i < results.widthwiseBays; i++) {
                                cumulativeHeight += widthwiseBayWidths[i];
                                const topPercent = (cumulativeHeight / buildingWidth) * 100;
                                
                                // Determine if this is an edge beam (bottom of grid)
                                const isEdgeBeam = i === results.widthwiseBays - 1;
                                
                                if (isEdgeBeam) {
                                  // Edge beam at the bottom
                                  beamLines.push(
                                    <div 
                                      key={`beam-row-${i}`}
                                      style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 2px)',
                                        left: '0',
                                        width: '100%',
                                        height: '3px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        zIndex: 5
                                      }}
                                    />
                                  );
                                } else {
                                  // Internal beam - needs to be centered in the gap
                                  // Calculate the exact position to center in the gap
                                  beamLines.push(
                                    <div 
                                      key={`beam-row-${i}`}
                                      style={{
                                        position: 'absolute',
                                        top: `calc(${topPercent}% + ${gridGapVertical/2}px)`,
                                        left: '0',
                                        width: '100%',
                                        height: '3px',
                                        borderTop: '3px dashed rgba(0, 0, 0, 0.8)',
                                        zIndex: 5,
                                        transform: 'translateY(-50%)'
                                      }}
                                    />
                                  );
                                }
                              }
                            } else {
                              // Vertical beams (when joists run horizontally)
                              // Add vertical lines at each column boundary
                              let cumulativeWidth = 0;
                              
                              // Add a line at the left of the grid (edge beam)
                              beamLines.push(
                                <div 
                                  key="beam-left"
                                  style={{
                                    position: 'absolute',
                                    left: '-2px', // Slightly to the left of the grid to avoid overlapping
                                    top: '0',
                                    height: '100%',
                                    width: '3px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    zIndex: 5
                                  }}
                                />
                              );
                              
                              // Add lines between columns (internal beams)
                              for (let i = 0; i < results.lengthwiseBays; i++) {
                                cumulativeWidth += lengthwiseBayWidths[i];
                                const leftPercent = (cumulativeWidth / buildingLength) * 100;
                                
                                // Determine if this is an edge beam (right of grid)
                                const isEdgeBeam = i === results.lengthwiseBays - 1;
                                
                                if (isEdgeBeam) {
                                  // Edge beam at the right
                                  beamLines.push(
                                    <div 
                                      key={`beam-col-${i}`}
                                      style={{
                                        position: 'absolute',
                                        left: 'calc(100% + 2px)',
                                        top: '0',
                                        height: '100%',
                                        width: '3px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        zIndex: 5
                                      }}
                                    />
                                  );
                                } else {
                                  // Internal beam - needs to be centered in the gap
                                  // Calculate the exact position to center in the gap
                                  beamLines.push(
                                    <div 
                                      key={`beam-col-${i}`}
                                      style={{
                                        position: 'absolute',
                                        left: `calc(${leftPercent}% + ${gridGapHorizontal/2}px)`,
                                        top: '0',
                                        height: '100%',
                                        width: '3px',
                                        borderLeft: '3px dashed rgba(0, 0, 0, 0.8)',
                                        zIndex: 5,
                                        transform: 'translateX(-50%)'
                                      }}
                                    />
                                  );
                                }
                              }
                            }
                            
                            return beamLines;
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
                          <div className="flex items-center bg-gray-100 rounded-lg p-1 w-full max-w-xs" style={{ border: '1px solid var(--apple-border)' }}>
                            <button 
                              className={`px-2 md:px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-colors flex-1 ${joistsRunLengthwise ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                              style={{ 
                                color: joistsRunLengthwise ? 'var(--apple-blue)' : 'var(--apple-text-secondary)',
                              }}
                              onClick={() => setJoistsRunLengthwise(true)}
                            >
                              Horizontal Joists ↔
                            </button>
                            <button 
                              className={`px-2 md:px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-colors flex-1 ${!joistsRunLengthwise ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                              style={{ 
                                color: !joistsRunLengthwise ? 'var(--apple-blue)' : 'var(--apple-text-secondary)',
                              }}
                              onClick={() => setJoistsRunLengthwise(false)}
                            >
                              Vertical Joists ↕
                            </button>
                          </div>
                        </div>
                        
                        {/* Arrows explanation */}
                        <div className="text-xs text-center mt-2" style={{ color: 'var(--apple-text-secondary)' }}>
                          ↔ / ↕ Arrows indicate joist span direction <span className="text-gray-400">(click arrows or use toggle above to change direction)</span>
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
    </div>
  );
}