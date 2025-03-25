/**
 * Utility functions for timber calculations
 */

import { TIMBER_PROPERTIES } from '../timber-utils';

/**
 * Checks if element volumes and counts are present and correctly formatted
 * @param {Object} results - The results object to check
 * @return {Object} An object with info about which data is present and valid
 */
export function checkElementData(results) {
  // Check if the results object exists
  if (!results) {
    return { 
      hasData: false,
      message: 'No results object found'
    };
  }
  
  // Check for element volumes
  const hasElementVolumes = results.elementVolumes !== undefined;
  const validElementVolumes = hasElementVolumes && 
    typeof results.elementVolumes === 'object' &&
    results.elementVolumes !== null;
  
  // Check for element counts
  const hasElementCounts = results.elementCounts !== undefined;
  const validElementCounts = hasElementCounts && 
    typeof results.elementCounts === 'object' &&
    results.elementCounts !== null;
  
  // Check for specific element data
  const hasJoistVolume = validElementVolumes && 
    typeof results.elementVolumes.joists === 'number';
  const hasBeamVolume = validElementVolumes && 
    typeof results.elementVolumes.beams === 'number';
  const hasColumnVolume = validElementVolumes && 
    typeof results.elementVolumes.columns === 'number';
  
  const hasJoistCount = validElementCounts && 
    typeof results.elementCounts.joists === 'number';
  const hasBeamCount = validElementCounts && 
    typeof results.elementCounts.beams === 'number';
  const hasColumnCount = validElementCounts && 
    typeof results.elementCounts.columns === 'number';
  
  // Check if all required data is present
  const allVolumesPresent = hasJoistVolume && hasBeamVolume && hasColumnVolume;
  const allCountsPresent = hasJoistCount && hasBeamCount && hasColumnCount;
  
  // Summarize the findings
  return {
    hasData: validElementVolumes || validElementCounts,
    allDataPresent: allVolumesPresent && allCountsPresent,
    elementVolumes: {
      valid: validElementVolumes,
      joists: hasJoistVolume,
      beams: hasBeamVolume,
      columns: hasColumnVolume
    },
    elementCounts: {
      valid: validElementCounts,
      joists: hasJoistCount,
      beams: hasBeamCount,
      columns: hasColumnCount
    },
    message: validElementVolumes && validElementCounts ? 
      'Element data is present' : 
      'Missing or invalid element data'
  };
} 