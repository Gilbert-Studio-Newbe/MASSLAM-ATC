'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { calculateCarbonSavings } from '../../utils/timberEngineering';

export default function CarbonCalculator() {
  // State for input values with updated defaults
  const [timberVolume, setTimberVolume] = useState(10); // Default 10 m³
  const [carbonStorageFactor, setCarbonStorageFactor] = useState(0.5); // Updated to 0.5 tonnes CO₂e per m³
  const [embodiedCarbonFactor, setEmbodiedCarbonFactor] = useState(0.2); // Default 0.2 tonnes CO₂e per m³
  const [alternativeMaterialFactor, setAlternativeMaterialFactor] = useState(0.45); // Updated to 0.45 tonnes CO₂e per m³
  const [weightRatio, setWeightRatio] = useState(3); // Default: concrete/steel is 3x heavier than timber
  
  // State for saved presets
  const [savedPresets, setSavedPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // State for calculated results
  const [results, setResults] = useState({
    carbonStorage: 0,
    embodiedCarbon: 0,
    carbonSavings: 0,
    totalVolume: 0,
    weightSavings: 0
  });
  
  // Load saved presets from localStorage on component mount
  useEffect(() => {
    const savedPresetsFromStorage = localStorage.getItem('carbonCalculatorPresets');
    if (savedPresetsFromStorage) {
      setSavedPresets(JSON.parse(savedPresetsFromStorage));
    }
  }, []);
  
  // Calculate results when inputs change
  useEffect(() => {
    // Custom calculation based on user-defined factors
    const carbonStorage = timberVolume * carbonStorageFactor;
    const embodiedCarbon = timberVolume * embodiedCarbonFactor;
    const alternativeMaterialEmissions = timberVolume * alternativeMaterialFactor;
    const carbonSavings = alternativeMaterialEmissions - embodiedCarbon;
    
    // Assuming timber density of 600 kg/m³ (from ML38 properties)
    const timberWeight = timberVolume * 600; // kg
    const alternativeWeight = timberWeight * weightRatio; // kg
    const weightSavings = alternativeWeight - timberWeight; // kg
    
    setResults({
      carbonStorage,
      embodiedCarbon,
      carbonSavings,
      totalVolume: timberVolume,
      weightSavings
    });
  }, [timberVolume, carbonStorageFactor, embodiedCarbonFactor, alternativeMaterialFactor, weightRatio]);
  
  // Save current settings as a preset
  const savePreset = () => {
    if (!presetName.trim()) {
      setSaveMessage('Please enter a preset name');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    
    const newPreset = {
      id: Date.now(),
      name: presetName,
      timberVolume,
      carbonStorageFactor,
      embodiedCarbonFactor,
      alternativeMaterialFactor,
      weightRatio
    };
    
    const updatedPresets = [...savedPresets, newPreset];
    setSavedPresets(updatedPresets);
    localStorage.setItem('carbonCalculatorPresets', JSON.stringify(updatedPresets));
    
    setPresetName('');
    setShowSaveModal(false);
    setSaveMessage('Preset saved successfully');
    setTimeout(() => setSaveMessage(''), 3000);
  };
  
  // Load a saved preset
  const loadPreset = (preset) => {
    setTimberVolume(preset.timberVolume);
    setCarbonStorageFactor(preset.carbonStorageFactor);
    setEmbodiedCarbonFactor(preset.embodiedCarbonFactor);
    setAlternativeMaterialFactor(preset.alternativeMaterialFactor);
    setWeightRatio(preset.weightRatio || 3); // Default to 3 if not in older presets
    
    setSaveMessage(`Loaded preset: ${preset.name}`);
    setTimeout(() => setSaveMessage(''), 3000);
  };
  
  // Delete a saved preset
  const deletePreset = (id) => {
    const updatedPresets = savedPresets.filter(preset => preset.id !== id);
    setSavedPresets(updatedPresets);
    localStorage.setItem('carbonCalculatorPresets', JSON.stringify(updatedPresets));
    
    setSaveMessage('Preset deleted');
    setTimeout(() => setSaveMessage(''), 3000);
  };
  
  return (
    <div className="apple-section">
      <div className="flex justify-between items-center mb-12">
        <h1 style={{ color: 'var(--apple-text)' }}>Carbon Calculator</h1>
      </div>
      
      {/* Success Message */}
      {saveMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
          <span className="block sm:inline">{saveMessage}</span>
        </div>
      )}
      
      {/* Save Preset Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="apple-card max-w-md w-full">
            <div className="apple-card-header">
              <h2 className="text-xl font-semibold">Save Preset</h2>
            </div>
            
            <div className="apple-card-body">
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Preset Name</label>
                  <input 
                    type="text" 
                    className="apple-input w-full"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Enter a name for this preset"
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
                onClick={savePreset}
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="apple-grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-6 xl:col-span-5 w-full">
          <div className="apple-card">
            <div className="apple-card-header flex justify-between items-center">
              <h2 className="text-lg md:text-xl font-semibold m-0">Carbon Parameters</h2>
              <button 
                className="apple-button apple-button-primary text-sm"
                onClick={() => setShowSaveModal(true)}
              >
                Save Preset
              </button>
            </div>
            
            <div className="apple-card-body">
              {/* Saved Presets */}
              {savedPresets.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-semibold mb-3">Saved Presets</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {savedPresets.map(preset => (
                      <div key={preset.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                        <span className="font-medium">{preset.name}</span>
                        <div>
                          <button 
                            className="text-blue-600 hover:text-blue-800 mr-3 text-sm"
                            onClick={() => loadPreset(preset)}
                          >
                            Load
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-800 text-sm"
                            onClick={() => deletePreset(preset.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="apple-specs-table mb-6 md:mb-8">
                <h3 className="text-md md:text-lg font-semibold mb-4 md:mb-6">Timber Volume</h3>
                
                <div className="apple-specs-row">
                  <div className="apple-specs-label">Total Timber Volume (m³)</div>
                  <div className="apple-specs-value">
                    <input 
                      type="number" 
                      className="apple-input mb-0 w-full"
                      min="0.1" 
                      max="1000" 
                      step="0.1"
                      value={timberVolume} 
                      onChange={(e) => setTimberVolume(parseFloat(e.target.value))} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="apple-specs-table mb-6 md:mb-8">
                <h3 className="text-md md:text-lg font-semibold mb-4 md:mb-6">Carbon Factors</h3>
                
                <div className="apple-specs-row">
                  <div className="apple-specs-label">Carbon Storage Factor (tonnes CO₂e/m³)</div>
                  <div className="apple-specs-value">
                    <input 
                      type="number" 
                      className="apple-input mb-0 w-full"
                      min="0.1" 
                      max="5" 
                      step="0.1"
                      value={carbonStorageFactor} 
                      onChange={(e) => setCarbonStorageFactor(parseFloat(e.target.value))} 
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--apple-text-secondary)' }}>
                      Amount of carbon sequestered in timber
                    </p>
                  </div>
                </div>
                
                <div className="apple-specs-row">
                  <div className="apple-specs-label">Embodied Carbon Factor (tonnes CO₂e/m³)</div>
                  <div className="apple-specs-value">
                    <input 
                      type="number" 
                      className="apple-input mb-0 w-full"
                      min="0.1" 
                      max="5" 
                      step="0.1"
                      value={embodiedCarbonFactor} 
                      onChange={(e) => setEmbodiedCarbonFactor(parseFloat(e.target.value))} 
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--apple-text-secondary)' }}>
                      Carbon emitted during timber production
                    </p>
                  </div>
                </div>
                
                <div className="apple-specs-row">
                  <div className="apple-specs-label">Alternative Material Factor (tonnes CO₂e/m³)</div>
                  <div className="apple-specs-value">
                    <input 
                      type="number" 
                      className="apple-input mb-0 w-full"
                      min="0.1" 
                      max="10" 
                      step="0.1"
                      value={alternativeMaterialFactor} 
                      onChange={(e) => setAlternativeMaterialFactor(parseFloat(e.target.value))} 
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--apple-text-secondary)' }}>
                      Carbon emitted by steel/concrete alternatives
                    </p>
                  </div>
                </div>
                
                <div className="apple-specs-row">
                  <div className="apple-specs-label">Weight Ratio (concrete/steel to timber)</div>
                  <div className="apple-specs-value">
                    <input 
                      type="number" 
                      className="apple-input mb-0 w-full"
                      min="1" 
                      max="10" 
                      step="0.1"
                      value={weightRatio} 
                      onChange={(e) => setWeightRatio(parseFloat(e.target.value))} 
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--apple-text-secondary)' }}>
                      How many times heavier steel/concrete is compared to timber
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mb-6 md:mb-8 p-4 md:p-6 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                <h4 className="text-sm md:text-md font-medium mb-3 md:mb-4">How It's Calculated</h4>
                <div className="grid grid-cols-1 gap-2 md:gap-3">
                  <p className="text-sm"><strong>Carbon Storage:</strong> Timber Volume × Carbon Storage Factor</p>
                  <p className="text-sm"><strong>Embodied Carbon:</strong> Timber Volume × Embodied Carbon Factor</p>
                  <p className="text-sm"><strong>Alternative Material Emissions:</strong> Timber Volume × Alternative Material Factor</p>
                  <p className="text-sm"><strong>Carbon Savings:</strong> Alternative Material Emissions - Embodied Carbon</p>
                  <p className="text-sm"><strong>Weight Savings:</strong> Timber Weight × (Weight Ratio - 1)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Results Panel */}
        <div className="lg:col-span-6 xl:col-span-7 w-full">
          <div className="apple-results">
            <div className="apple-results-header">
              <h2 className="text-lg md:text-xl font-semibold">Carbon Calculation Results</h2>
            </div>
            
            <div className="apple-results-body">
              {/* Carbon Results */}
              <div className="apple-results-section p-4 md:p-6 rounded-lg" style={{ backgroundColor: 'rgba(0, 113, 227, 0.05)' }}>
                <h3 className="font-medium mb-3 md:mb-4">Carbon Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Timber Volume:</p>
                    <p className="font-medium">{results.totalVolume.toFixed(2)} m³</p>
                  </div>
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Carbon Storage:</p>
                    <p className="font-medium">{results.carbonStorage.toFixed(2)} tonnes CO₂e</p>
                  </div>
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Embodied Carbon:</p>
                    <p className="font-medium">{results.embodiedCarbon.toFixed(2)} tonnes CO₂e</p>
                  </div>
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Carbon Savings:</p>
                    <p className="font-medium text-green-600">{results.carbonSavings.toFixed(2)} tonnes CO₂e</p>
                  </div>
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Weight Savings:</p>
                    <p className="font-medium text-green-600">{(results.weightSavings / 1000).toFixed(2)} tonnes</p>
                  </div>
                </div>
              </div>
              
              {/* Visualization */}
              <div className="apple-results-section mt-6">
                <h3 className="apple-section-title text-lg md:text-xl font-semibold mb-3 md:mb-4">Carbon Visualization</h3>
                <div className="apple-section-content">
                  <div className="bg-white p-4 md:p-6 rounded-lg shadow">
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3 text-sm md:text-base">Carbon Storage</h4>
                      <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-green-500 rounded-full"
                          style={{ width: `${Math.min(100, (results.carbonStorage / (results.totalVolume * 2)) * 100)}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                          {results.carbonStorage.toFixed(2)} tonnes CO₂e
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3 text-sm md:text-base">Embodied Carbon</h4>
                      <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-yellow-500 rounded-full"
                          style={{ width: `${Math.min(100, (results.embodiedCarbon / (results.totalVolume * 2)) * 100)}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                          {results.embodiedCarbon.toFixed(2)} tonnes CO₂e
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3 text-sm md:text-base">Alternative Material Emissions</h4>
                      <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-red-500 rounded-full"
                          style={{ width: `${Math.min(100, (results.totalVolume * alternativeMaterialFactor / (results.totalVolume * 3)) * 100)}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                          {(results.totalVolume * alternativeMaterialFactor).toFixed(2)} tonnes CO₂e
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3 text-sm md:text-base">Net Carbon Benefit</h4>
                      <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, (results.carbonSavings / (results.totalVolume * 3)) * 100)}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                          {results.carbonSavings.toFixed(2)} tonnes CO₂e
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3 text-sm md:text-base">Weight Comparison</h4>
                      <div className="flex items-center mb-2">
                        <div className="w-24 text-sm">Timber:</div>
                        <div className="relative flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="absolute h-full bg-green-400 rounded-full"
                            style={{ width: '100%' }}
                          ></div>
                          <div className="absolute inset-0 flex items-center px-3 text-xs font-medium">
                            {(results.totalVolume * 600 / 1000).toFixed(2)} tonnes
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="w-24 text-sm">Alternative:</div>
                        <div className="relative flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="absolute h-full bg-red-400 rounded-full"
                            style={{ width: '100%' }}
                          ></div>
                          <div className="absolute inset-0 flex items-center px-3 text-xs font-medium">
                            {(results.totalVolume * 600 * weightRatio / 1000).toFixed(2)} tonnes
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 md:p-6 rounded-lg shadow mt-6">
                    <h4 className="font-semibold mb-3 text-sm md:text-base">Equivalent Environmental Impact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 border border-gray-200 rounded-lg">
                        <p className="text-sm font-medium">Car Emissions Avoided</p>
                        <p className="text-2xl font-bold text-green-600">{(results.carbonSavings / 2.3).toFixed(1)}</p>
                        <p className="text-xs text-gray-500">Cars off the road for a year</p>
                      </div>
                      <div className="p-3 border border-gray-200 rounded-lg">
                        <p className="text-sm font-medium">Trees Planted Equivalent</p>
                        <p className="text-2xl font-bold text-green-600">{(results.carbonSavings * 45).toFixed(0)}</p>
                        <p className="text-xs text-gray-500">Tree seedlings grown for 10 years</p>
                      </div>
                      <div className="p-3 border border-gray-200 rounded-lg">
                        <p className="text-sm font-medium">Weight Reduction</p>
                        <p className="text-2xl font-bold text-green-600">{(results.weightSavings / 1000).toFixed(1)}</p>
                        <p className="text-xs text-gray-500">Tonnes of material saved</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/" className="apple-button apple-button-secondary">
              Return to Timber Calculator
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 