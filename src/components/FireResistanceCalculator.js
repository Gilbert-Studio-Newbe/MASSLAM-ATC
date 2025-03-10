import React, { useState, useEffect } from 'react';
import { calculateFireResistance, CHARRING_RATES, loadMasslamSL33CharringRate } from '@/utils/masslamProperties';

/**
 * Component to calculate and display fire resistance properties
 */
export default function FireResistanceCalculator({ charringRate = CHARRING_RATES.masslam_sl33, dimensions = { width: 90, depth: 240 }, selectedFRL = "0" }) {
  // State for calculation results
  const [results, setResults] = useState(null);
  const [actualCharringRate, setActualCharringRate] = useState(charringRate);
  
  // Parse FRL value (e.g., "60/60/60" -> 60)
  const getFRLMinutes = (frl) => {
    if (frl === '0' || frl === 'none') return 0;
    return parseInt(frl.split('/')[0]) || 0;
  };

  // Load the charring rate from the CSV file on component mount
  useEffect(() => {
    const loadCharringRate = async () => {
      try {
        const rate = await loadMasslamSL33CharringRate();
        setActualCharringRate(rate);
        console.log(`Using MASSLAM SL33 charring rate: ${rate} mm/min`);
      } catch (error) {
        console.error('Error loading charring rate:', error);
        // Keep using the default value if there's an error
      }
    };
    
    loadCharringRate();
  }, []);
  
  // Calculate fire resistance when dimensions, FRL, or charring rate changes
  useEffect(() => {
    const minutes = getFRLMinutes(selectedFRL);
    if (minutes > 0 && dimensions.width > 0 && dimensions.depth > 0) {
      const fireResults = calculateFireResistance(actualCharringRate, dimensions, minutes);
      setResults(fireResults);
    } else {
      setResults(null);
    }
  }, [dimensions, selectedFRL, actualCharringRate]);

  // If no FRL is selected or dimensions are invalid, show a message
  if (!results) {
    return (
      <div className="apple-message p-4 text-center">
        <p className="apple-message-text text-lg">
          {selectedFRL === '0' || selectedFRL === 'none' 
            ? 'No fire resistance level (FRL) selected.' 
            : 'Calculating fire resistance...'}
        </p>
        <p className="apple-message-subtext text-sm text-gray-500 mt-2">
          Using MASSLAM SL33 charring rate: {actualCharringRate} mm/min
        </p>
      </div>
    );
  }

  // Display the fire resistance results
  return (
    <div className="apple-fire-results p-4 bg-white rounded-lg shadow">
      <div className="apple-fire-results-grid grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="apple-fire-results-col space-y-3">
          <div className="apple-fire-results-item flex justify-between items-center border-b pb-2">
            <div className="apple-fire-results-label font-medium">Charring Rate:</div>
            <div className="apple-fire-results-value">{actualCharringRate} mm/min</div>
          </div>
          <div className="apple-fire-results-item flex justify-between items-center border-b pb-2">
            <div className="apple-fire-results-label font-medium">Required FRL:</div>
            <div className="apple-fire-results-value">{selectedFRL}</div>
          </div>
          <div className="apple-fire-results-item flex justify-between items-center border-b pb-2">
            <div className="apple-fire-results-label font-medium">Char Depth:</div>
            <div className="apple-fire-results-value">{results.charDepth.toFixed(1)} mm</div>
          </div>
        </div>
        
        <div className="apple-fire-results-col space-y-3">
          <div className="apple-fire-results-item flex justify-between items-center border-b pb-2">
            <div className="apple-fire-results-label font-medium">Effective Width:</div>
            <div className="apple-fire-results-value">{results.effectiveWidth.toFixed(1)} mm</div>
          </div>
          <div className="apple-fire-results-item flex justify-between items-center border-b pb-2">
            <div className="apple-fire-results-label font-medium">Effective Depth:</div>
            <div className="apple-fire-results-value">{results.effectiveDepth.toFixed(1)} mm</div>
          </div>
          <div className="apple-fire-results-item flex justify-between items-center border-b pb-2">
            <div className="apple-fire-results-label font-medium">Residual Area:</div>
            <div className="apple-fire-results-value">{results.residualPercentage.toFixed(1)}%</div>
          </div>
        </div>
      </div>
      
      <div className={`apple-fire-results-status mt-4 p-3 text-center rounded ${results.passes ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {results.passes 
          ? `✓ Passes ${selectedFRL} fire resistance requirement` 
          : `✗ Does not meet ${selectedFRL} fire resistance requirement`}
      </div>
    </div>
  );
}
