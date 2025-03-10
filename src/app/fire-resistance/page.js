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
    <div className="container mx-auto py-4 md:py-8 px-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-0">Fire Resistance Analysis</h1>
        <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
          &larr; Back to Member Calculator
        </Link>
      </div>
      
      <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg md:text-xl font-semibold mb-4">About Fire Resistance in Timber Structures</h2>
        <p className="mb-4 text-sm md:text-base">
          Fire Resistance Level (FRL) is a critical consideration in timber construction. MASSLAM SL33 has a charring rate of {charringRate} mm/min, 
          which means that during a fire, the timber chars at this rate, creating a protective layer that slows heat transfer to the inner wood.
        </p>
        <p className="mb-4 text-sm md:text-base">
          For each FRL rating (e.g., 60/60/60, 90/90/90), additional material is needed beyond what's structurally required to account for charring during fire exposure:
        </p>
        <ul className="list-disc pl-5 mb-4 space-y-2 text-sm md:text-base">
          <li>For a 60-minute rating: approximately {(60 * charringRate).toFixed(1)}mm per exposed face</li>
          <li>For a 90-minute rating: approximately {(90 * charringRate).toFixed(1)}mm per exposed face</li>
          <li>For a 120-minute rating: approximately {(120 * charringRate).toFixed(1)}mm per exposed face</li>
        </ul>
        <p className="mb-4 text-sm md:text-base">
          Plus an additional 7mm zero-strength layer beyond the char layer.
        </p>
      </div>
      
      {loading ? (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <div className="text-center py-8">Loading timber sizes...</div>
        </div>
      ) : error ? (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <div className="text-red-600">
            <p>Error loading timber sizes: {error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Timber Size Selection */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Select Timber Size</h2>
            
            {/* Size Type Tabs */}
            <div className="flex flex-wrap mb-4 border-b">
              {Object.keys(sizesByType).map(type => (
                <button 
                  key={type}
                  className={`px-3 py-2 text-sm font-medium ${
                    selectedSize && selectedSize.type === type 
                      ? 'border-b-2 border-blue-500 text-blue-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => handleSizeSelect(sizesByType[type][0])}
                >
                  {type}
                </button>
              ))}
            </div>
            
            {/* Size Selection */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {selectedSize && sizesByType[selectedSize.type]?.map(size => (
                <div 
                  key={`${size.type}-${size.width}-${size.depth}`}
                  className={`p-2 rounded cursor-pointer ${
                    selectedSize && selectedSize.width === size.width && selectedSize.depth === size.depth
                      ? 'bg-blue-100 border border-blue-300'
                      : 'hover:bg-gray-100 border border-gray-200'
                  }`}
                  onClick={() => handleSizeSelect(size)}
                >
                  <div className="flex justify-between">
                    <span>{size.width}mm × {size.depth}mm</span>
                    <span className="text-gray-500 text-sm">{size.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Fire Rating Selection and Results */}
          <div className="md:col-span-2">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-6">
              <h2 className="text-lg font-semibold mb-4">Fire Resistance Level (FRL)</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select FRL Rating:
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={selectedFRL}
                  onChange={handleFRLChange}
                >
                  <option value="none">None</option>
                  <option value="30/30/30">30/30/30</option>
                  <option value="60/60/60">60/60/60</option>
                  <option value="90/90/90">90/90/90</option>
                  <option value="120/120/120">120/120/120</option>
                </select>
              </div>
              
              {selectedSize && (
                <div className="mb-4">
                  <h3 className="text-md font-medium mb-2">Selected Timber Size:</h3>
                  <div className="p-3 bg-gray-100 rounded-md">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Type: <span className="font-medium">{selectedSize.type}</span></div>
                      <div>Width: <span className="font-medium">{selectedSize.width}mm</span></div>
                      <div>Depth: <span className="font-medium">{selectedSize.depth}mm</span></div>
                      <div>Area: <span className="font-medium">{(selectedSize.width * selectedSize.depth / 1000000).toFixed(4)}m²</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Fire Resistance Results */}
            {selectedSize && selectedFRL !== 'none' && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 md:p-6 border-b">
                  <h2 className="text-lg font-semibold">Fire Resistance Results</h2>
                </div>
                <FireResistanceCalculator 
                  dimensions={{ width: selectedSize.width, depth: selectedSize.depth }}
                  selectedFRL={selectedFRL}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 