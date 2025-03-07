"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  loadMasslamSizes, 
  getMasslamSizes,
  initializeMasslamSizes
} from '@/utils/timberSizes';
import FireResistanceCalculator from '@/components/FireResistanceCalculator';
import { calculateFireResistanceAllowance, CHARRING_RATES } from '@/utils/masslamProperties';

export default function FireResistancePage() {
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedFRL, setSelectedFRL] = useState("60/60/60");
  const [charringRate, setCharringRate] = useState(CHARRING_RATES.masslam_sl33);

  useEffect(() => {
    // Initialize the MASSLAM sizes module
    console.log('Initializing MASSLAM sizes module from FireResistancePage');
    initializeMasslamSizes();
    
    // Load sizes from CSV
    const loadSizesFromCSV = async () => {
      try {
        setLoading(true);
        
        await loadMasslamSizes();
        const allSizes = getMasslamSizes();
        setSizes(allSizes);
        
        // Set default selected size if available
        if (allSizes.length > 0) {
          setSelectedSize(allSizes[0]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading MASSLAM sizes:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    loadSizesFromCSV();
  }, []);

  // Group sizes by type
  const sizesByType = sizes.reduce((acc, size) => {
    acc[size.type] = acc[size.type] || [];
    acc[size.type].push(size);
    return acc;
  }, {});

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
  };

  const handleFRLChange = (e) => {
    setSelectedFRL(e.target.value);
  };

  return (
    <div className="apple-page">
      <div className="apple-page-header">
        <h1 className="apple-page-title">Fire Resistance Analysis</h1>
      </div>
      
      <div className="apple-section">
        <h2 className="apple-section-title">About Fire Resistance in Timber Structures</h2>
        <div className="apple-section-content">
          <p className="apple-text">
            Fire Resistance Level (FRL) is a critical consideration in timber construction. MASSLAM SL33 has a charring rate of {charringRate} mm/min, 
            which means that during a fire, the timber chars at this rate, creating a protective layer that slows heat transfer to the inner wood.
          </p>
          <p className="apple-text">
            For each FRL rating (e.g., 60/60/60, 90/90/90), additional material is needed beyond what's structurally required to account for charring during fire exposure:
          </p>
          <ul className="apple-list">
            <li>For a 60-minute rating: approximately {(60 * charringRate).toFixed(1)}mm per exposed face</li>
            <li>For a 90-minute rating: approximately {(90 * charringRate).toFixed(1)}mm per exposed face</li>
            <li>For a 120-minute rating: approximately {(120 * charringRate).toFixed(1)}mm per exposed face</li>
          </ul>
          <p className="apple-text">
            Plus an additional 7mm zero-strength layer beyond the char layer.
          </p>
        </div>
      </div>
      
      {loading ? (
        <div className="apple-section">
          <div className="apple-loading">Loading timber sizes...</div>
        </div>
      ) : error ? (
        <div className="apple-section">
          <div className="apple-error">
            <h2 className="apple-error-title">Error Loading Sizes</h2>
            <p className="apple-error-message">{error}</p>
          </div>
        </div>
      ) : (
        <div className="apple-grid">
          {/* Size Selection Panel */}
          <div className="apple-grid-sidebar">
            <div className="apple-card">
              <h2 className="apple-card-title">Select Timber Size</h2>
              
              <div className="apple-form-group">
                <label className="apple-label">Fire Resistance Level (FRL)</label>
                <select 
                  className="apple-select"
                  value={selectedFRL}
                  onChange={handleFRLChange}
                >
                  <option value="30/30/30">30/30/30</option>
                  <option value="60/60/60">60/60/60</option>
                  <option value="90/90/90">90/90/90</option>
                  <option value="120/120/120">120/120/120</option>
                </select>
              </div>
              
              {Object.keys(sizesByType).map(type => (
                <div key={type} className="apple-size-group">
                  <h3 className="apple-size-group-title capitalize">{type}s</h3>
                  <div className="apple-size-buttons">
                    {sizesByType[type].map((size, index) => (
                      <button
                        key={index}
                        className={`apple-size-button ${
                          selectedSize && selectedSize.width === size.width && 
                          selectedSize.depth === size.depth && 
                          selectedSize.type === size.type
                            ? 'apple-size-button-selected'
                            : ''
                        }`}
                        onClick={() => handleSizeSelect(size)}
                      >
                        {size.width}×{size.depth}mm
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Fire Resistance Analysis Panel */}
          <div className="apple-grid-main">
            {selectedSize ? (
              <div className="apple-card">
                <h2 className="apple-card-title">
                  Fire Resistance Analysis for {selectedSize.width}×{selectedSize.depth}mm {selectedSize.type}
                </h2>
                
                <FireResistanceCalculator 
                  dimensions={{ 
                    width: selectedSize.width, 
                    depth: selectedSize.depth 
                  }} 
                  selectedFRL={selectedFRL} 
                />
              </div>
            ) : (
              <div className="apple-card apple-card-placeholder">
                <p className="apple-text-center">Please select a timber size to analyze</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 