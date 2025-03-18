'use client';

import { useState, useEffect } from 'react';
import { 
  initializeMasslamSizes, 
  loadMasslamSizes, 
  getMasslamSizes,
  debugMasslamSizesLoading
} from '@/utils/timberSizes';

export default function TestCSVPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sizes, setSizes] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('TestCSVPage: Initializing MASSLAM sizes module');
        initializeMasslamSizes();
        
        console.log('TestCSVPage: Loading MASSLAM sizes from CSV');
        const loadedSizes = await loadMasslamSizes();
        console.log(`TestCSVPage: Loaded ${loadedSizes.length} MASSLAM sizes`);
        
        // Get debug info
        const debug = debugMasslamSizesLoading();
        setDebugInfo(debug);
        
        // Get all sizes
        const allSizes = getMasslamSizes();
        setSizes(allSizes);
        
        setLoading(false);
      } catch (err) {
        console.error('TestCSVPage: Error loading MASSLAM sizes:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleReload = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('TestCSVPage: Reinitializing MASSLAM sizes module');
      initializeMasslamSizes();
      
      console.log('TestCSVPage: Reloading MASSLAM sizes from CSV');
      const loadedSizes = await loadMasslamSizes();
      console.log(`TestCSVPage: Reloaded ${loadedSizes.length} MASSLAM sizes`);
      
      // Get debug info
      const debug = debugMasslamSizesLoading();
      setDebugInfo(debug);
      
      // Get all sizes
      const allSizes = getMasslamSizes();
      setSizes(allSizes);
      
      setLoading(false);
    } catch (err) {
      console.error('TestCSVPage: Error reloading MASSLAM sizes:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Test CSV Loading</h1>
      
      <div className="mb-4">
        <button 
          onClick={handleReload}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Reload CSV
        </button>
      </div>
      
      {loading && (
        <div className="bg-yellow-100 p-4 rounded mb-4">
          <p className="text-yellow-800">Loading MASSLAM sizes...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 p-4 rounded mb-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}
      
      {debugInfo && (
        <div className="bg-blue-100 p-4 rounded mb-4">
          <h2 className="text-xl font-bold mb-2">Debug Info</h2>
          <pre className="bg-gray-100 p-2 rounded">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-2">MASSLAM Sizes</h2>
        
        {sizes.length === 0 ? (
          <p className="text-red-500">No sizes loaded!</p>
        ) : (
          <>
            <p className="mb-2">Loaded {sizes.length} sizes</p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b">Width (mm)</th>
                    <th className="py-2 px-4 border-b">Depth (mm)</th>
                    <th className="py-2 px-4 border-b">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {sizes.slice(0, 20).map((size, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-2 px-4 border-b">{size.width}</td>
                      <td className="py-2 px-4 border-b">{size.depth}</td>
                      <td className="py-2 px-4 border-b">{size.type}</td>
                    </tr>
                  ))}
                  {sizes.length > 20 && (
                    <tr>
                      <td colSpan="3" className="py-2 px-4 border-b text-center">
                        ... and {sizes.length - 20} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 