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
  TIMBER_PROPERTIES
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
import { calculateFireResistanceAllowance } from '@/utils/masslamProperties';
import TimberSizesTable from './TimberSizesTable';
// ... other imports as before

// Rename the custom function to avoid naming conflict
const calculateMultiFloorColumnSize = (beamWidth, load, height, floors, fireRating = 'none') => {
  // Column width should match beam width
  const width = beamWidth;
  console.log(`Setting column width to match beam width: ${width}mm`);
  
  // Calculate load based on number of floors
  const totalLoad = load * floors;
  
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
  
  console.log(`Column size before fire adjustment: ${width}x${depth}mm`);
  console.log(`Column size after fire adjustment: ${fireAdjustedWidth}x${fireAdjustedDepth}mm`);
  
  // Find nearest available width and depth
  const adjustedWidth = findNearestWidth(fireAdjustedWidth);
  const adjustedDepth = findNearestDepth(adjustedWidth, fireAdjustedDepth);
  
  return {
    width: adjustedWidth,
    depth: adjustedDepth,
    height: height,
    load: totalLoad,
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
  
  // Custom bay dimensions state variables
  const [customLengthwiseBayWidths, setCustomLengthwiseBayWidths] = useState([]);
  const [customWidthwiseBayWidths, setCustomWidthwiseBayWidths] = useState([]);
  const [useCustomBayDimensions, setUseCustomBayDimensions] = useState(false);
  
  // Maximum allowed span for a single bay (in meters)
  const MAX_BAY_SPAN = 9.0;
  
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
          
          // Load other settings
          setFireRating(project.fireRating);
          setLoad(project.load);
          
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
  const timberGrade = 'GL21'; // Fixed timber grade
  
  // Save the current project
  const saveProject = () => {
    try {
      // Create a project object with all the current settings
      const project = {
        id: Date.now().toString(), // Use timestamp as unique ID
        details: projectDetails,
        buildingLength,
        buildingWidth,
        lengthwiseBays,
        widthwiseBays,
        numFloors,
        fireRating,
        load,
        structureType,
        timberGrade,
        results,
        savedAt: new Date().toISOString()
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
  useEffect(() => {
    const calculateResults = () => {
      try {
        // Get bay dimensions
        const { lengthwiseBayWidths, widthwiseBayWidths } = calculateBayDimensions();
        
        // Find the maximum bay span (for joists)
        let maxLengthwiseSpan = Math.max(...lengthwiseBayWidths);
        let maxWidthwiseSpan = Math.max(...widthwiseBayWidths);
        
        // Determine joist span (joists span the shorter distance)
        const joistSpan = Math.min(maxLengthwiseSpan, maxWidthwiseSpan);
        
        // Calculate joist size based on span and load
        const joistSize = calculateJoistSize(joistSpan, load, fireRating);
        
        // Calculate beam span (beams span the longer distance)
        const beamSpan = Math.max(maxLengthwiseSpan, maxWidthwiseSpan);
        
        // Calculate beam size based on span, load, and number of floors
        const beamSize = calculateBeamSize(beamSpan, load, numFloors, fireRating);
        
        // Calculate column size based on beam width, load, and number of floors
        const columnSize = calculateMultiFloorColumnSize(beamSize.width, load, 3.0, numFloors, fireRating);
        
        // Calculate timber weight
        const timberWeight = calculateTimberWeight(
          joistSize, 
          beamSize, 
          columnSize, 
          buildingLength, 
          buildingWidth, 
          numFloors
        );
        
        // Calculate carbon savings
        const carbonSavings = calculateCarbonSavings(timberWeight);
        
        // Validate the structure
        const validationResult = validateStructure(joistSize, beamSize, columnSize, joistSpan, beamSpan);
        
        // Set results
        setResults({
          buildingLength,
          buildingWidth,
          lengthwiseBays,
          widthwiseBays,
          numFloors,
          load,
          fireRating,
          joistSpan,
          beamSpan,
          joists: joistSize,
          beams: beamSize,
          columns: columnSize,
          timberWeight,
          carbonSavings,
          validationResult,
          customBayDimensions: useCustomBayDimensions ? {
            lengthwiseBayWidths,
            widthwiseBayWidths
          } : null
        });
        
        setError(null);
      } catch (err) {
        console.error('Calculation error:', err);
        setError(err.message || 'An error occurred during calculations');
      }
    };
    
    // Debounce calculations to avoid excessive recalculations
    const timer = setTimeout(() => {
      calculateResults();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [buildingLength, buildingWidth, lengthwiseBays, widthwiseBays, load, numFloors, timberGrade, fireRating, useCustomBayDimensions, customLengthwiseBayWidths, customWidthwiseBayWidths]);

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
      setLengthwiseBays(parsedValue);
    }
  };

  const handleWidthwiseBaysChange = (value) => {
    const parsedValue = parseInt(value, 10);
    if (!isNaN(parsedValue)) {
      setWidthwiseBays(parsedValue);
    }
  };

  const handleNumFloorsChange = (value) => {
    // Parse the input value as an integer to avoid issues with leading zeros
    const parsedValue = parseInt(value, 10);
    
    // Check if the parsed value is a valid number
    if (!isNaN(parsedValue)) {
      setNumFloors(parsedValue);
    }
  };

  const handleLoadChange = (value) => {
    setLoad(Number(value));
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
      const newWidths = [...customLengthwiseBayWidths];
      newWidths[index] = parsedValue;
      setCustomLengthwiseBayWidths(newWidths);
    }
  };
  
  const handleWidthwiseBayWidthChange = (index, value) => {
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue) && parsedValue > 0) {
      const newWidths = [...customWidthwiseBayWidths];
      newWidths[index] = parsedValue;
      setCustomWidthwiseBayWidths(newWidths);
    }
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
      
      <div className="apple-grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Config Panel */}
        <div className="lg:col-span-6 xl:col-span-5">
          <div className="apple-card">
            <div className="apple-card-header flex justify-between items-center">
              <h2 className="text-xl font-semibold m-0">Configuration</h2>
            </div>
            
            <div className="apple-card-body">
              <div className="apple-specs-table mb-8">
                <h3 className="text-lg font-semibold mb-6">Structure Configuration</h3>
                
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
        
              <div className="apple-specs-table mb-8">
                <h3 className="text-lg font-semibold mb-6">Dimensions</h3>
                
                <div className="apple-specs-row">
                  <div className="apple-specs-label">Building Length (m)</div>
                  <div className="apple-specs-value">
              <input 
                type="number" 
                      className="apple-input mb-0"
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
                  <div className="apple-specs-label">Bays (Length)</div>
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
                  <div className="apple-specs-label">Bays (Width)</div>
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
              <div className="mb-8 p-6 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                <h4 className="text-md font-medium mb-4">Calculated Bay Sizes</h4>
                <div className="grid grid-cols-1 gap-3">
                  <p className="text-sm"><strong>Bay Size (Length):</strong> {(buildingLength / lengthwiseBays).toFixed(2)} m</p>
                  <p className="text-sm"><strong>Bay Size (Width):</strong> {(buildingWidth / widthwiseBays).toFixed(2)} m</p>
                  <p className="text-sm"><strong>Joist Spacing:</strong> 800 mm (fixed)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Results Panel */}
        <div className="lg:col-span-6 xl:col-span-7">
          {results ? (
            <div className="apple-results">
              <div className="apple-results-header">
                <h2 className="text-xl font-semibold">Calculation Results</h2>
              </div>
              
              <div className="apple-results-body">
                {/* Building Information */}
                <div className="apple-results-section p-6 rounded-lg" style={{ backgroundColor: 'rgba(0, 113, 227, 0.05)' }}>
                  <h3 className="font-medium mb-4">Building Information</h3>
                  <div className="grid grid-cols-2 gap-6">
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
                  <h3 className="text-lg font-semibold mb-4">Selected Timber Sizes</h3>
                  <div className="overflow-x-auto">
                    <TimberSizesTable results={results} compact={true} />
                  </div>
                </div>
                
                {/* Visualizations - Side by side */}
                <div className="apple-results-section grid grid-cols-1 gap-8">
                  {/* Bay Layout Visualization - Now spans full width */}
                  <div>
                    <div className="apple-visualization mb-3">
                      <h3 className="apple-visualization-title">Bay Layout</h3>
                      
                      {/* Custom Bay Dimensions Toggle */}
                      <div className="mb-4 flex items-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="form-checkbox h-5 w-5" 
                            style={{ accentColor: 'var(--apple-blue)' }}
                            checked={useCustomBayDimensions} 
                            onChange={handleToggleCustomBayDimensions}
                          />
                          <span className="ml-2 text-sm font-medium">Customize Bay Dimensions</span>
                        </label>
                      </div>
                      
                      {/* Custom Bay Dimensions Controls */}
                      {useCustomBayDimensions && (
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Lengthwise Bay Controls */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Lengthwise Bay Widths (m)</h4>
                            <div className="space-y-2">
                              {customLengthwiseBayWidths.map((width, index) => (
                                <div key={`length-${index}`} className="flex items-center">
                                  <span className="text-xs w-16">Bay {index + 1}:</span>
                                  <input
                                    type="number"
                                    className="apple-input mb-0 text-sm"
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
                              <div className="text-xs text-right mt-1" style={{ color: 'var(--apple-text-secondary)' }}>
                                Total: {customLengthwiseBayWidths.reduce((sum, width) => sum + width, 0).toFixed(2)}m / {buildingLength.toFixed(2)}m
                              </div>
                            </div>
                          </div>
                          
                          {/* Widthwise Bay Controls */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Widthwise Bay Widths (m)</h4>
                            <div className="space-y-2">
                              {customWidthwiseBayWidths.map((width, index) => (
                                <div key={`width-${index}`} className="flex items-center">
                                  <span className="text-xs w-16">Bay {index + 1}:</span>
                                  <input
                                    type="number"
                                    className="apple-input mb-0 text-sm"
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
                              <div className="text-xs text-right mt-1" style={{ color: 'var(--apple-text-secondary)' }}>
                                Total: {customWidthwiseBayWidths.reduce((sum, width) => sum + width, 0).toFixed(2)}m / {buildingWidth.toFixed(2)}m
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-center">
                        <div className="relative" style={{ 
                          height: `${Math.max(250, results.numFloors * 60)}px`,
                          width: '100%',
                          maxWidth: '600px'
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
                            
                            return (
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
                                  
                                  return (
                                    <div key={index} className="bay-cell" style={{
                                      backgroundColor: '#e0e0e0',
                                      border: '1px solid #999',
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      fontSize: '0.8rem',
                                      padding: '8px',
                                      borderRadius: '0'
                                    }}>
                                      {useCustomBayDimensions && (
                                        <div className="text-xs">
                                          {bayWidth.toFixed(1)}m × {bayHeight.toFixed(1)}m
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
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
                              
                              // Joists span the shorter distance for this specific bay
                              const joistsSpanLengthwise = bayWidth < bayHeight;
                              
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
                                fontSize: '1rem',
                                zIndex: 10
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
                                  >
                                    <span>⟷</span>
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
                                  >
                                    <span>⟷</span>
                                  </div>
                                );
                              }
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-sm" style={{ color: 'var(--apple-text-secondary)' }}>
                      {!useCustomBayDimensions ? (
                        <div>Bay Size: {(results.buildingLength / results.lengthwiseBays).toFixed(2)}m × {(results.buildingWidth / results.widthwiseBays).toFixed(2)}m</div>
                      ) : (
                        <div>Custom bay sizes applied</div>
                      )}
                      <div className="mt-2">
                        <strong style={{ color: '#4B5563' }}>↔ Arrows indicate joist span direction</strong> (joists span the shorter distance in each bay)
                      </div>
                    </div>
                  </div>
              </div>
              
                {/* Results Section */}
                {results && (
                  <div className="apple-section mt-4">
                    <h3 className="apple-section-title">Calculated Timber Sizes</h3>
                    <div className="apple-section-content">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Joist Results */}
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="font-semibold mb-2">Joists</h4>
                          <p><strong>Size:</strong> {results.joists.width}mm × {results.joists.depth}mm</p>
                          <p><strong>Span:</strong> {results.joistSpan.toFixed(2)}m</p>
                          <p><strong>Spacing:</strong> 800mm</p>
                          {results.joists.fireAllowance > 0 && (
                            <p className="text-blue-600">
                              <strong>Fire Allowance:</strong> {results.joists.fireAllowance.toFixed(1)}mm per face
                            </p>
                          )}
              </div>
              
                        {/* Beam Results */}
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="font-semibold mb-2">Beams</h4>
                          <p><strong>Size:</strong> {results.beams.width}mm × {results.beams.depth}mm</p>
                          <p><strong>Span:</strong> {results.beamSpan.toFixed(2)}m</p>
                          {results.beams.fireAllowance > 0 && (
                            <p className="text-blue-600">
                              <strong>Fire Allowance:</strong> {results.beams.fireAllowance.toFixed(1)}mm per face
                            </p>
                          )}
                          {results.beams.width === results.columns.width && (
                            <p className="text-green-600 mt-2">
                              <strong>✓</strong> Width matched with columns
                            </p>
                          )}
              </div>
              
                        {/* Column Results */}
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="font-semibold mb-2">Columns</h4>
                          <p><strong>Size:</strong> {results.columns.width}mm × {results.columns.depth}mm</p>
                          <p><strong>Height:</strong> {results.columns.height}m</p>
                          <p><strong>Floors:</strong> {results.numFloors}</p>
                          {results.columns.fireAllowance > 0 && (
                            <p className="text-blue-600">
                              <strong>Fire Allowance:</strong> {results.columns.fireAllowance.toFixed(1)}mm per face
                            </p>
                          )}
                          {results.beams.width === results.columns.width && (
                            <p className="text-green-600 mt-2">
                              <strong>✓</strong> Width matched with beams
                            </p>
                          )}
              </div>
            </div>
            
                      {/* Environmental Impact */}
                      <div className="mt-4 bg-white p-4 rounded-lg shadow">
                        <h4 className="font-semibold mb-2">Environmental Impact</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p><strong>Timber Weight:</strong> {results.timberWeight.toFixed(2)} kg</p>
                          </div>
                          <div>
                            <p><strong>Carbon Savings:</strong> {results.carbonSavings.toFixed(2)} tonnes CO₂e</p>
                          </div>
                        </div>
                      </div>
            
                      {/* Additional Resources */}
                      <div className="mt-4 bg-white p-4 rounded-lg shadow">
                        <h4 className="font-semibold mb-2">Additional Resources</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Link href="/fire-resistance" className="text-blue-600 hover:text-blue-800">
                            <div className="border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors">
                              <h5 className="font-semibold">Fire Resistance Analysis</h5>
                              <p className="text-sm text-gray-600">Analyze fire resistance for specific timber sizes</p>
                            </div>
                          </Link>
                          <Link href="/calculation-methodology" className="text-blue-600 hover:text-blue-800">
                            <div className="border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors">
                              <h5 className="font-semibold">Calculation Methodology</h5>
                              <p className="text-sm text-gray-600">Learn about design constraints and calculation methods</p>
                            </div>
                          </Link>
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
              <p style={{ color: 'var(--apple-text-secondary)' }}>Configure your timber structure and click "Calculate Structure" to see results.</p>
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