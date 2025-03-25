"use client";

import { useEffect } from 'react';
import { useBuildingData } from '../contexts/BuildingDataContext';
import { useFireResistance } from '../contexts/FireResistanceContext';
import { useFormState } from '../hooks/useFormState';
import { useProjectManagement } from '../hooks/useProjectManagement';
import { useSizeData } from '../hooks/useSizeData';
import { useNavigationHandlers } from '../hooks/useNavigationHandlers';
import { useNotification } from '../contexts/NotificationContext';
import { test9mJoistCalculation, calculateJoistSize } from '../utils/timber-calculator';

// UI Components
import SaveProjectModal from './calculator/SaveProjectModal';
import StructureConfigSection from './calculator/StructureConfigSection';
import LoadTypeSelector from './calculator/LoadTypeSelector';
import FireRatingSelector from './calculator/FireRatingSelector';
import ResultsDisplay from './calculator/ResultsDisplay';
import SuccessMessage from './common/SuccessMessage';

export default function TimberCalculator() {
  // Use our custom hooks
  const { 
    buildingData,
    updateBuildingData 
  } = useBuildingData();
  
  const { 
    handleFireRatingChange: fireResistanceHandleFireRatingChange 
  } = useFireResistance();
  
  const {
    // State
    error,
    results,
    isMobile,
    showAdvancedOptions,
    
    // Setters
    setError,
    setShowAdvancedOptions,
    setIsMobile,
    
    // Form handlers
    handleInputChange,
    handleLoadChange,
    onFireRatingChange,
    handleToggleCustomBayDimensions,
    handleLengthwiseBayWidthChange,
    handleWidthwiseBayWidthChange,
    toggleJoistDirection,
    calculateResults
  } = useFormState();
  
  // Direct test function for debugging
  const testJoistCalculation = () => {
    console.log("========= DIRECT JOIST CALCULATION TEST =========");
    
    // Test with various spans
    const spans = [7, 8, 9];
    spans.forEach(span => {
      const result = calculateJoistSize(
        span,           // span in meters
        800,            // spacing in mm
        2.0,            // load in kPa
        'ML56',         // timber grade
        'none',         // fire rating
        300,            // deflection limit (L/300)
        1.5             // safety factor
      );
      
      console.log(`\nTEST SPAN ${span}m RESULT:`);
      console.log(`Width: ${result.width}mm`);
      console.log(`Depth: ${result.depth}mm`);
      console.log(`Governing: ${result.isDeflectionGoverning ? 'Deflection' : 'Bending'}`);
      console.log(`Bending depth required: ${result.bendingDepth}mm`);
      console.log(`Deflection depth required: ${result.deflectionDepth}mm`);
      console.log(`Fire adjusted depth: ${result.fireAdjustedDepth}mm`);
    });
    
    // Also run the dedicated test function for 9m span
    console.log("\nRunning built-in test function for 9m span:");
    test9mJoistCalculation();
    
    console.log("========= END OF DIRECT TEST =========");
  };
  
  // Add debugging output for the results received from useFormState
  console.log("TimberCalculator - results from useFormState:", {
    hasResults: !!results,
    joistSize: results?.joistSize ? {
      width: results.joistSize.width,
      depth: results.joistSize.depth,
      span: results.joistSize.span,
      isDeflectionGoverning: results.joistSize.isDeflectionGoverning,
      deflectionLimit: results.joistSize.deflectionLimit,
      safetyFactor: results.joistSize.safetyFactor
    } : 'No joistSize data',
    timestamp: results?.updatedAt || 'No timestamp'
  });
  
  const {
    // State
    projectDetails,
    saveMessage,
    showSaveModal,
    
    // Setters 
    setSaveMessage,
    setShowSaveModal,
    
    // Actions
    handleProjectDetailsChange,
    handleSaveProject,
    handleReset
  } = useProjectManagement();
  
  const {
    // State
    loadingErrors,
    
    // Actions
    isDataReady
  } = useSizeData();
  
  // Get notification functions
  const { showAlert } = useNotification();
  
  // Set up navigation handlers (event listeners are handled inside the hook)
  useNavigationHandlers();
  
  // Run the test calculation when component mounts
  useEffect(() => {
    // Wait a bit for other initialization
    setTimeout(() => {
      console.log("Running direct joist calculation test...");
      testJoistCalculation();
    }, 1000);
  }, []);
  
  // Listen for bay adjustment events from useFormState
  useEffect(() => {
    const handleBayAdjustment = (event) => {
      const { message } = event.detail;
      showAlert(message, 'warning');
    };
    
    window.addEventListener('bay-adjustment', handleBayAdjustment);
    
    return () => {
      window.removeEventListener('bay-adjustment', handleBayAdjustment);
    };
  }, [showAlert]);

  // Add automatic calculation when key parameters change
  useEffect(() => {
    // Don't calculate on first render to avoid duplicate calculations
    const shouldCalculate = buildingData.results === null || 
      (buildingData.results && buildingData.results.updatedAt);
      
    if (shouldCalculate) {
      console.log("AUTO CALCULATION: Detecting changes in building configuration, triggering calculation");
      calculateResults();
    }
  }, [
    buildingData.buildingLength,
    buildingData.buildingWidth,
    buildingData.numFloors,
    buildingData.lengthwiseBays,
    buildingData.widthwiseBays,
    buildingData.customLengthwiseBayWidths,
    buildingData.customWidthwiseBayWidths,
    buildingData.load,
    buildingData.fireRating,
    buildingData.joistsRunLengthwise,
    buildingData.joistSpacing,
    calculateResults
  ]);

  // Use calculation parameters from BuildingDataContext if available
  useEffect(() => {
    if (buildingData.calculationParams) {
      console.log("Using saved calculation parameters:", buildingData.calculationParams);
    }
  }, [buildingData.calculationParams]);

  // Modify the calculateStructure function to use calculation parameters
  const calculateStructure = async () => {
    setIsCalculating(true);
    setError(null);
    
    try {
      console.log("Calculating structure with data:", buildingData);
      
      // Get calculation parameters from BuildingData if available
      const calculationParams = buildingData.calculationParams || {};
      const deflectionLimit = calculationParams.allowableDeflection || 300; // Default to L/300
      const safetyFactor = calculationParams.safetyFactor || 2.0; // Default to 2.0
      
      // Calculate structure using timber-calculator.js with our parameters
      const structureResults = await calculateTimberStructure({
        ...buildingData,
        deflectionLimit,
        safetyFactor
      });
      
      console.log("Structure calculation results:", structureResults);
      
      // Update results in state and context
      setResults(structureResults);
      setResults(prevResults => {
        const newResults = { ...structureResults, timestamp: new Date().toISOString() };
        updateCalculationResults(newResults);
        return newResults;
      });
      
    } catch (err) {
      console.error("Calculation error:", err);
      setError(err.message || "Failed to calculate structure");
    } finally {
      setIsCalculating(false);
    }
  };

  // Handle save button click
  const onSaveClick = () => {
    if (!results) {
      // Calculate results first if not available
      calculateResults();
        setTimeout(() => {
        // Wait for results to be calculated
        setShowSaveModal(true);
        }, 500);
    } else {
      setShowSaveModal(true);
    }
  };

  // Handle save project submission
  const onSaveProject = () => {
    handleSaveProject(results);
  };

  return (
    <div className="apple-container mx-auto px-4 py-8">
      {/* Success message for saving */}
      {saveMessage && (
      <SuccessMessage 
        message={saveMessage} 
          onClose={() => setSaveMessage('')}
      />
      )}
      
      {/* Save Project Modal */}
      {showSaveModal && (
      <SaveProjectModal
        projectDetails={projectDetails}
          onDetailChange={handleProjectDetailsChange}
          onSave={onSaveProject}
          onCancel={() => setShowSaveModal(false)}
        />
      )}
      
      {/* Header */}
      <div className="mb-8">
        {/* Reset Button */}
        <div className="text-right">
          <button 
            className="apple-button apple-button-outline py-2 px-4 text-sm"
            onClick={handleReset}
          >
            Reset Calculator
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* Input Panel */}
        <div className="md:col-span-5 lg:col-span-6 xl:col-span-5">
          <div className="apple-panel">
            <div className="apple-panel-content">
              <h2 className="text-xl font-semibold mb-4">
                Building Configuration
              </h2>
              
              {/* Structure Configuration Section */}
              <StructureConfigSection 
                buildingData={buildingData}
                onInputChange={handleInputChange}
                onToggleJoistDirection={toggleJoistDirection}
                onToggleCustomBayDimensions={handleToggleCustomBayDimensions}
                onLengthwiseBayWidthChange={handleLengthwiseBayWidthChange}
                onWidthwiseBayWidthChange={handleWidthwiseBayWidthChange}
                maxBaySpan={buildingData.maxBaySpan}
                isMobile={isMobile}
              />
              
              {/* Loading Parameters Section */}
              <div className="mb-8">
                <div className="space-y-6">
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
                  
                  {/* Calculate Button */}
                  <div className="mt-8">
                    <button 
                      className="w-full px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={calculateResults}
                    >
                      Calculate Results
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Note: Timber Grade moved to Calculation Methodology Page */}
                      </div>
                  </div>
              </div>
              
        {/* Results Panel */}
        <div className="lg:col-span-6 xl:col-span-7 w-full">
          <ResultsDisplay 
            results={results}
            onSaveClick={onSaveClick}
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
      {(loadingErrors?.properties || loadingErrors?.sizes) && (
        <div className="apple-section mt-4">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">CSV Data Issue: </strong>
            <span className="block sm:inline">
              {loadingErrors.properties && loadingErrors.sizes 
                ? "Unable to load required CSV data files for mechanical properties and timber sizes. The application is using built-in default values which may not reflect the latest product specifications."
                : loadingErrors.properties 
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
            <strong className="font-bold">FALLBACK MODE - Using Approximate Sizes: </strong>
            <span className="block sm:inline">
              <span className="text-red-700 font-bold">[DEBUG: FALLBACK CALCULATION USED]</span> The exact timber dimensions required for your project could not be found in the available data.
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