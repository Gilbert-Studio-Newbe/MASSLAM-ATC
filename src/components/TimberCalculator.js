"use client";

import { useEffect } from 'react';
import { useBuildingData } from '../contexts/BuildingDataContext';
import { useFireResistance } from '../contexts/FireResistanceContext';
import { useFormState } from '../hooks/useFormState';
import { useProjectManagement } from '../hooks/useProjectManagement';
import { useSizeData } from '../hooks/useSizeData';
import { useNavigationHandlers } from '../hooks/useNavigationHandlers';

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
  
  // Set up navigation handlers (event listeners are handled inside the hook)
  useNavigationHandlers();

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
      <div className="mb-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">MASSLAM Timber Structure Calculator</h1>
        <p className="text-gray-600 mt-2 md:text-lg">
          Design a multi-level timber building with MASSLAM engineered timber
        </p>
            </div>
            
      {/* Reset Button */}
      <div className="mb-6 text-right">
        <button 
          className="apple-button apple-button-outline py-2 px-4 text-sm"
          onClick={handleReset}
        >
          Reset Calculator
        </button>
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
                
                {/* Calculate Button */}
                <div className="mt-6">
                  <button 
                    className="apple-button apple-button-primary w-full py-3"
                    onClick={() => {
                      console.log("JOIST DEBUG - Manual calculation triggered");
                      calculateResults();
                    }}
                  >
                    Calculate Results
                            </button>
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