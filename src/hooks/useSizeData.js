"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  loadMasslamSizes,
  debugMasslamSizes,
  initializeMasslamSizes,
  getMasslamSizes,
  verifyLoadedSizes,
  filterToStandardSizes,
  resetMasslamSizes
} from '../utils/timberSizes';
import { loadTimberProperties, TIMBER_PROPERTIES } from '../utils/timberEngineering';

export function useSizeData() {
  // State for tracking loading status
  const [propertiesLoaded, setPropertiesLoaded] = useState(false);
  const [sizesLoaded, setSizesLoaded] = useState(false);
  const [loadingErrors, setLoadingErrors] = useState({
    properties: false,
    sizes: false
  });

  // Load MASSLAM sizes from the CSV file
  const loadSizes = useCallback(async () => {
    console.log('Loading MASSLAM sizes from useSizeData hook');
    try {
      // Initialize first
      initializeMasslamSizes();
      console.log('Initial MASSLAM sizes:', getMasslamSizes());
      
      // Load from CSV
      const loadedSizes = await loadMasslamSizes();
      console.log(`Loaded ${loadedSizes.length} MASSLAM sizes`);
      
      if (loadedSizes.length === 0) {
        console.warn('No MASSLAM sizes loaded from CSV, calculations will use fallback values');
        setLoadingErrors(prev => ({ ...prev, sizes: true }));
        return false;
      }
      
      // Filter to standard sizes
      console.log('Filtering to standard sizes');
      const standardSizes = filterToStandardSizes();
      console.log(`Filtered to ${standardSizes.length} standard sizes`);
      
      if (standardSizes.length === 0) {
        console.warn('No standard sizes found after filtering, calculations will use fallback values');
        setLoadingErrors(prev => ({ ...prev, sizes: true }));
        return false;
      }
      
      // Verify the loaded sizes
      const verified = verifyLoadedSizes();
      console.log('Size verification result:', verified);
      
      if (!verified) {
        console.warn('Size verification failed, calculations may use fallback values');
        setLoadingErrors(prev => ({ ...prev, sizes: true }));
        return false;
      }
      
      // Debug the loaded sizes
      debugMasslamSizes();
      
      // Mark as successfully loaded
      setSizesLoaded(true);
      return true;
    } catch (error) {
      console.error('Error loading MASSLAM sizes:', error);
      setLoadingErrors(prev => ({ ...prev, sizes: true }));
      return false;
    }
  }, []);

  // Load timber properties from CSV
  const loadProperties = useCallback(async () => {
    try {
      await loadTimberProperties();
      setPropertiesLoaded(true);
      console.log('Timber properties loaded from CSV:', TIMBER_PROPERTIES.MASSLAM_SL33);
      return true;
    } catch (error) {
      console.error('Error loading timber properties:', error);
      setLoadingErrors(prev => ({ ...prev, properties: true }));
      return false;
    }
  }, []);

  // Load all data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadProperties(),
        loadSizes()
      ]);
    };
    
    loadAllData();
  }, [loadProperties, loadSizes]);

  // Helper function to check if required data is loaded
  const isDataReady = useCallback(() => {
    return propertiesLoaded && sizesLoaded;
  }, [propertiesLoaded, sizesLoaded]);

  // Reset all size data (useful for testing)
  const resetData = useCallback(() => {
    resetMasslamSizes();
    setSizesLoaded(false);
    setPropertiesLoaded(false);
    setLoadingErrors({
      properties: false,
      sizes: false
    });
  }, []);

  return {
    // State
    propertiesLoaded,
    sizesLoaded,
    loadingErrors,
    
    // Getters
    isDataReady,
    
    // Actions
    loadProperties,
    loadSizes,
    resetData
  };
} 