"use client";

import { useState, useEffect, useCallback } from 'react';
import { useBuildingData } from '../contexts/BuildingDataContext';
import { saveBuildingData } from '../utils/helpers';

export function useProjectManagement() {
  const { 
    buildingData,
    updateBuildingData,
    updateCalculationResults,
    updateMultipleProperties,
    resetBuildingData
  } = useBuildingData();

  // Project details state
  const [projectDetails, setProjectDetails] = useState({
    name: buildingData.projectName || '',
    designer: buildingData.designer || '',
    client: buildingData.client || '',
    date: buildingData.date || new Date().toISOString().split('T')[0]
  });

  // UI state for project operations
  const [saveMessage, setSaveMessage] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [error, setError] = useState(null);

  // Load saved project if available
  const loadSavedProject = useCallback(() => {
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
        setProjectDetails({
          name: project.details?.name || '',
          designer: project.details?.designer || '',
          client: project.details?.client || '',
          date: project.details?.date || new Date().toISOString().split('T')[0]
        });
        
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
            updateBuildingData('customLengthwiseBayWidths', project.customBayDimensions.lengthwiseBayWidths);
          }
          if (project.customBayDimensions.widthwiseBayWidths) {
            updateBuildingData('customWidthwiseBayWidths', project.customBayDimensions.widthwiseBayWidths);
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
      setError(`Error loading saved project: ${error.message}`);
    }
  }, [updateBuildingData, updateMultipleProperties]);

  // Save the current project state
  const saveCurrentState = useCallback(() => {
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
      setError(`Error saving state to localStorage: ${error.message}`);
    }
  }, [buildingData]);

  // Save the current project as a named project
  const handleSaveProject = useCallback((results) => {
    // Ensure we have results to save
    if (!results) {
      setError("Please calculate results before saving the project.");
      return;
    }
    
    // Combine building data with project details
    const projectToSave = {
      ...buildingData,
      projectName: projectDetails.name,
      designer: projectDetails.designer,
      client: projectDetails.client,
      date: projectDetails.date,
      results: results
    };
    
    try {
      // Save to local storage
      const saveResult = saveBuildingData(projectToSave, projectDetails.name);
      
      // Update the project list in context
      if (saveResult.success) {
        setSaveMessage(`Project "${projectDetails.name}" saved successfully!`);
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setError(saveResult.message);
      }
      
      // Close the modal
      setShowSaveModal(false);
    } catch (error) {
      setError(`Error saving project: ${error.message}`);
    }
  }, [buildingData, projectDetails]);

  // Handle project details change
  const handleProjectDetailsChange = useCallback((field, value) => {
    setProjectDetails(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Reset form and project details
  const handleReset = useCallback(() => {
    if (window.confirm("Are you sure you want to reset all values to defaults?")) {
      resetBuildingData();
      setProjectDetails({
        name: '',
        designer: '',
        client: '',
        date: new Date().toISOString().split('T')[0]
      });
      setError(null);
    }
  }, [resetBuildingData]);

  // Auto-save state to localStorage when relevant buildingData changes
  useEffect(() => {
    saveCurrentState();
  }, [
    saveCurrentState,
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

  // Initialize on mount
  useEffect(() => {
    console.log('ProjectManagement hook: initializing and loading saved project...');
    loadSavedProject();
  }, [loadSavedProject]);

  return {
    // State
    projectDetails,
    saveMessage,
    showSaveModal,
    error,
    
    // Setters
    setProjectDetails,
    setSaveMessage,
    setShowSaveModal,
    setError,
    
    // Actions
    loadSavedProject,
    saveCurrentState,
    handleSaveProject,
    handleProjectDetailsChange,
    handleReset
  };
} 