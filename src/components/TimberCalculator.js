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
  
  // Calculate results based on inputs
  useEffect(() => {
    // Skip calculation if any required input is missing
    if (!buildingLength || !buildingWidth || !lengthwiseBays || !widthwiseBays || !load || !numFloors) {
      return;
    }
    
    // Calculate spans
    const lengthwiseSpan = buildingLength / lengthwiseBays;
    const widthwiseSpan = buildingWidth / widthwiseBays;
    
    // Validate spans
    if (lengthwiseSpan > MAX_BAY_SPAN || widthwiseSpan > MAX_BAY_SPAN) {
      setError(`Maximum span exceeded. Please add more bays or reduce building dimensions.`);
      return;
    } else {
      setError(null);
    }
    
    // Determine which direction joists and beams run
    // Joists span the shorter distance, beams span the longer distance
    const joistSpan = Math.min(lengthwiseSpan, widthwiseSpan);
    const beamSpan = Math.max(lengthwiseSpan, widthwiseSpan);
    
    console.log('Calculated spans:', { joistSpan, beamSpan });
    
    // Calculate initial results based on inputs
    const joistResult = calculateJoistSize(joistSpan, 0.8, load, timberGrade, fireRating);
    const beamResult = calculateBeamSize(beamSpan, load, timberGrade, fireRating);
    
    // Find nearest available sizes from MASSLAM catalog (rounding up)
    // For joists
    const joistType = 'joist';
    const adjustedJoistWidth = findNearestWidth(joistResult.width);
    const adjustedJoistDepth = findNearestDepth(adjustedJoistWidth, joistResult.depth);
    
    // For beams - initial calculation
    const beamType = 'beam';
    let adjustedBeamWidth = findNearestWidth(beamResult.width);
    let adjustedBeamDepth = findNearestDepth(adjustedBeamWidth, beamResult.depth);
    
    // For columns - initial calculation
    const columnType = 'column';
    const columnHeight = 3; // Standard floor height in meters
    const initialColumnResult = calculateMultiFloorColumnSize(adjustedBeamWidth, load * joistSpan * 0.8, columnHeight, numFloors, fireRating);
    
    // Apply the constraint: beam and column widths must match
    // Use the wider of the two to determine the width of both
    const commonWidth = Math.max(adjustedBeamWidth, initialColumnResult.width);
    
    // If the common width is different from the beam width, recalculate beam depth
    if (commonWidth !== adjustedBeamWidth) {
      console.log(`Adjusting beam width from ${adjustedBeamWidth}mm to ${commonWidth}mm to match column width`);
      adjustedBeamWidth = commonWidth;
      adjustedBeamDepth = findNearestDepth(adjustedBeamWidth, beamResult.depth);
    }
    
    // Recalculate column with the common width
    const columnResult = calculateMultiFloorColumnSize(commonWidth, load * joistSpan * 0.8, columnHeight, numFloors, fireRating);
    
    console.log('Calculation results after width matching:', { 
      joists: { width: adjustedJoistWidth, depth: adjustedJoistDepth },
      beams: { width: adjustedBeamWidth, depth: adjustedBeamDepth },
      columns: { width: columnResult.width, depth: columnResult.depth }
    });
    
    // Verify that the adjusted sizes exist in the MASSLAM catalog
    const sizes = getMasslamSizes();
    const joistExists = sizes.some(size => 
      size.width === adjustedJoistWidth && 
      size.depth === adjustedJoistDepth && 
      size.type === joistType
    );
    
    const beamExists = sizes.some(size => 
      size.width === adjustedBeamWidth && 
      size.depth === adjustedBeamDepth && 
      size.type === beamType
    );
    
    const columnExists = sizes.some(size => 
      size.width === columnResult.width && 
      size.depth === columnResult.depth && 
      size.type === columnType
    );
    
    console.log('Size verification:', {
      joist: { width: adjustedJoistWidth, depth: adjustedJoistDepth, exists: joistExists },
      beam: { width: adjustedBeamWidth, depth: adjustedBeamDepth, exists: beamExists },
      column: { width: columnResult.width, depth: columnResult.depth, exists: columnExists }
    });
    
    if (!joistExists || !beamExists || !columnExists) {
      console.warn('WARNING: Some selected sizes do not exist in the MASSLAM catalog!', {
        joist: { width: adjustedJoistWidth, depth: adjustedJoistDepth, exists: joistExists },
        beam: { width: adjustedBeamWidth, depth: adjustedBeamDepth, exists: beamExists },
        column: { width: columnResult.width, depth: columnResult.depth, exists: columnExists }
      });
    } else {
      console.log('All selected sizes exist in the MASSLAM catalog.');
    }
    
    // Update the results with the adjusted sizes
    joistResult.width = adjustedJoistWidth;
    joistResult.depth = adjustedJoistDepth;
    
    beamResult.width = adjustedBeamWidth;
    beamResult.depth = adjustedBeamDepth;
    
    columnResult.width = columnResult.width;
    columnResult.depth = columnResult.depth;
    
    // Calculate volume and environmental impact
    const joistVolume = (joistResult.width / 1000) * (joistResult.depth / 1000) * joistSpan;
    const beamVolume = (beamResult.width / 1000) * (beamResult.depth / 1000) * beamSpan;
    const columnVolume = (columnResult.width / 1000) * (columnResult.depth / 1000) * columnHeight * 4; // 4 columns
    
    const totalVolume = joistVolume + beamVolume + columnVolume;
    const weight = calculateTimberWeight(totalVolume, timberGrade);
    const carbonSavings = calculateCarbonSavings(totalVolume);
    
    setResults({
      joists: joistResult,
      beams: beamResult,
      columns: columnResult,
      joistSpan,
      beamSpan,
      buildingLength,
      buildingWidth,
      lengthwiseBays,
      widthwiseBays,
      load,
      numFloors,
      volume: totalVolume,
      weight,
      carbonSavings,
      valid: true
    });

    // Validate that all sizes are from the MASSLAM catalog
    setTimeout(() => {
      const allSizesValid = verifyLoadedSizes();
      console.log('All sizes valid:', allSizesValid);
    }, 100);
  }, [buildingLength, buildingWidth, lengthwiseBays, widthwiseBays, load, numFloors, timberGrade, fireRating]);

  // Handle input changes
  const handleBuildingLengthChange = (value) => {
    setBuildingLength(Number(value));
  };

  const handleBuildingWidthChange = (value) => {
    setBuildingWidth(Number(value));
  };

  const handleLengthwiseBaysChange = (value) => {
    setLengthwiseBays(Number(value));
  };

  const handleWidthwiseBaysChange = (value) => {
    setWidthwiseBays(Number(value));
  };

  const handleNumFloorsChange = (value) => {
    setNumFloors(Number(value));
  };

  const handleLoadChange = (value) => {
    setLoad(Number(value));
  };

  const handleFireRatingChange = (value) => {
    setFireRating(value);
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
                <div className="apple-results-section grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Bay Layout Visualization */}
                  <div>
                    <div className="apple-visualization mb-3">
                      <h3 className="apple-visualization-title">Bay Layout</h3>
                      <div className="flex justify-center">
                        <div className="relative" style={{ 
                          height: `${Math.max(180, results.numFloors * 60)}px`,
                          width: '100%',
                          maxWidth: '300px'
                        }}>
                          <div className="bay-grid absolute inset-0" style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${results.lengthwiseBays}, 1fr)`,
                            gridTemplateRows: `repeat(${results.widthwiseBays}, 1fr)`,
                            gap: '2px'
                          }}>
                            {Array.from({ length: results.lengthwiseBays * results.widthwiseBays }).map((_, index) => (
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
                                {/* Bay cells are empty now */}
                              </div>
                            ))}
                          </div>
                          
                          {/* Joist Direction Arrows */}
                          {(() => {
                            // Determine if joists span lengthwise or widthwise
                            const lengthwiseSpan = results.buildingLength / results.lengthwiseBays;
                            const widthwiseSpan = results.buildingWidth / results.widthwiseBays;
                            
                            // Joists span the shorter distance
                            const joistsSpanLengthwise = lengthwiseSpan < widthwiseSpan;
                            
                            // Return arrows for each bay
                            return Array.from({ length: results.lengthwiseBays * results.widthwiseBays }).map((_, index) => {
                              const row = Math.floor(index / results.lengthwiseBays);
                              const col = index % results.lengthwiseBays;
                              
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
                                      top: `${(row + 0.5) * (100 / results.widthwiseBays)}%`,
                                      left: `${(col + 0.5) * (100 / results.lengthwiseBays)}%`,
                                      transform: 'translate(-50%, -50%)',
                                      width: `${70 / results.lengthwiseBays}%`,
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
                                      left: `${(col + 0.5) * (100 / results.lengthwiseBays)}%`,
                                      top: `${(row + 0.5) * (100 / results.widthwiseBays)}%`,
                                      transform: 'translate(-50%, -50%)',
                                      height: `${70 / results.widthwiseBays}%`,
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
                      <div>Bay Size: {(results.buildingLength / results.lengthwiseBays).toFixed(2)}m × {(results.buildingWidth / results.widthwiseBays).toFixed(2)}m</div>
                      <div className="mt-2">
                        <strong style={{ color: '#4B5563' }}>↔ Arrows indicate joist span direction:</strong> {results.joistSpan.toFixed(2)}m
                      </div>
                    </div>
      </div>
      
                  {/* Structure Visualization */}
                  <div>
                    <div className="apple-visualization mb-3">
                      <h3 className="apple-visualization-title">Structure Visualization</h3>
                      <div className="flex justify-center">
                        <div className="relative" style={{ 
                          height: `${Math.max(180, results.numFloors * 60)}px`,
                          width: '100%',
                          maxWidth: '300px'
                        }}>
                          {Array.from({ length: results.numFloors }).map((_, index) => {
                            const floorIndex = results.numFloors - 1 - index; // Start from top floor
                            
                            return (
                              <div 
                                key={floorIndex}
                                className="absolute left-0 right-0"
                                style={{ 
                                  height: '50px',
                                  bottom: `${floorIndex * 60}px`,
                                  zIndex: results.numFloors - floorIndex,
                                  backgroundColor: '#e0e0e0',
                                  border: '1px solid #999',
                                  borderRadius: '0'
                                }}
                              >
                                <div className="text-center text-xs mt-1">Floor {floorIndex + 1}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-sm" style={{ color: 'var(--apple-text-secondary)' }}>
                      <div>Floors: {results.numFloors}</div>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p><strong>Total Timber Volume:</strong> {results.volume.toFixed(2)} m³</p>
                          </div>
                          <div>
                            <p><strong>Timber Weight:</strong> {results.weight.toFixed(2)} kg</p>
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