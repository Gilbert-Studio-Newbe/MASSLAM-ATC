'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadRates, saveRates, formatCurrency } from '../../utils/costEstimator';

export default function TimberRatesPage() {
  const [beamRate, setBeamRate] = useState(0);
  const [columnRate, setColumnRate] = useState(0);
  const [joistRates, setJoistRates] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Load rates on component mount
  useEffect(() => {
    const rates = loadRates();
    setBeamRate(rates.beamRate);
    setColumnRate(rates.columnRate);
    setJoistRates(rates.joistRates);
  }, []);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Parse values to ensure they're numbers
    const parsedBeamRate = parseFloat(beamRate);
    const parsedColumnRate = parseFloat(columnRate);
    
    // Validate inputs
    if (isNaN(parsedBeamRate) || parsedBeamRate <= 0 || isNaN(parsedColumnRate) || parsedColumnRate <= 0) {
      setMessage('Beam and column rates must be valid numbers greater than zero');
      setMessageType('error');
      return;
    }
    
    // Check if any joist rate is invalid
    const hasInvalidJoistRate = Object.values(joistRates).some(rate => {
      const parsed = parseFloat(rate);
      return isNaN(parsed) || parsed <= 0;
    });
    
    if (hasInvalidJoistRate) {
      setMessage('All joist rates must be valid numbers greater than zero');
      setMessageType('error');
      return;
    }
    
    // Prepare the formatted joist rates object with parsed values
    const formattedJoistRates = {};
    Object.entries(joistRates).forEach(([key, value]) => {
      formattedJoistRates[key] = parseFloat(value);
    });
    
    // Save rates
    console.log('Attempting to save rates:', {
      beamRate: parsedBeamRate,
      columnRate: parsedColumnRate,
      joistRatesCount: Object.keys(formattedJoistRates).length
    });
    
    const success = saveRates(parsedBeamRate, parsedColumnRate, formattedJoistRates);
    
    if (success) {
      setMessage('Rates saved successfully');
      setMessageType('success');
    } else {
      setMessage('Failed to save rates');
      setMessageType('error');
    }
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  // Handle beam rate change
  const handleBeamRateChange = (value) => {
    const parsed = parseFloat(value);
    setBeamRate(isNaN(parsed) ? 0 : parsed);
  };
  
  // Handle column rate change
  const handleColumnRateChange = (value) => {
    const parsed = parseFloat(value);
    setColumnRate(isNaN(parsed) ? 0 : parsed);
  };

  // Handle joist rate change
  const handleJoistRateChange = (sizeKey, value) => {
    const parsed = parseFloat(value);
    setJoistRates(prev => ({
      ...prev,
      [sizeKey]: isNaN(parsed) ? 0 : parsed
    }));
  };

  return (
    <div className="apple-container py-8">
      <h1 className="text-2xl font-semibold mb-6">Timber Rates</h1>
      
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Calculator
        </Link>
      </div>
      
      {message && (
        <div className={`p-4 mb-6 rounded-lg ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Volume-Based Rates</h2>
          <p className="text-sm text-gray-600 mb-4">
            Set the cost per cubic meter (m³) for beams and columns.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <label htmlFor="beamRate" className="block text-sm font-medium text-gray-700 mb-1">
                Beam Rate ($/m³)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                <input
                  type="number"
                  id="beamRate"
                  className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={beamRate}
                  onChange={(e) => handleBeamRateChange(e.target.value)}
                  min="0"
                  step="1"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="columnRate" className="block text-sm font-medium text-gray-700 mb-1">
                Column Rate ($/m³)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                <input
                  type="number"
                  id="columnRate"
                  className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={columnRate}
                  onChange={(e) => handleColumnRateChange(e.target.value)}
                  min="0"
                  step="1"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Area-Based Rates for Joists</h2>
          <p className="text-sm text-gray-600 mb-4">
            Set the cost per square meter ($/m²) for different joist sizes.
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joist Size
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate ($/m²)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(joistRates).map(([sizeKey, rate]) => (
                  <tr key={sizeKey}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sizeKey.replace('x', ' × ')} mm
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                        <input
                          type="number"
                          className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={rate}
                          onChange={(e) => handleJoistRateChange(sizeKey, e.target.value)}
                          min="0"
                          step="1"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save Rates
          </button>
        </div>
      </form>
    </div>
  );
} 