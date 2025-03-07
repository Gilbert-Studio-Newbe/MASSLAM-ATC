"use client";

import { useState, useEffect } from 'react';
import Papa from 'papaparse';

/**
 * RainbowCSVViewer component for displaying CSV data with colorful formatting
 * 
 * @param {Object} props Component props
 * @param {string} props.csvPath Path to the CSV file to display
 * @param {string} props.title Optional title for the CSV viewer
 * @param {boolean} props.showLineNumbers Whether to show line numbers (default: true)
 * @param {string[]} props.highlightColumns Columns to highlight
 * @returns {JSX.Element} The RainbowCSVViewer component
 */
export default function RainbowCSVViewer({ 
  csvPath, 
  title = "CSV Data", 
  showLineNumbers = true,
  highlightColumns = []
}) {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Column colors for rainbow effect
  const columnColors = [
    'bg-blue-100', 'bg-green-100', 'bg-yellow-100', 
    'bg-purple-100', 'bg-pink-100', 'bg-indigo-100', 
    'bg-red-100', 'bg-orange-100', 'bg-teal-100'
  ];

  useEffect(() => {
    const loadCSV = async () => {
      try {
        setLoading(true);
        const response = await fetch(csvPath);
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              setCsvData(results.data);
              setHeaders(results.meta.fields || []);
              console.log('CSV data loaded:', results.data);
            } else {
              setError('No data found in CSV file');
            }
            setLoading(false);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            setError(`Error parsing CSV: ${error.message}`);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error loading CSV:', error);
        setError(`Error loading CSV: ${error.message}`);
        setLoading(false);
      }
    };

    loadCSV();
  }, [csvPath]);

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-white shadow">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-white shadow">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {showLineNumbers && (
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
              )}
              {headers.map((header, index) => (
                <th 
                  key={index} 
                  scope="col" 
                  className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    highlightColumns.includes(header) ? 'bg-yellow-100' : ''
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {csvData.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                {showLineNumbers && (
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {rowIndex + 1}
                  </td>
                )}
                {headers.map((header, colIndex) => (
                  <td 
                    key={colIndex} 
                    className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 ${
                      highlightColumns.includes(header) 
                        ? 'bg-yellow-100' 
                        : columnColors[colIndex % columnColors.length]
                    }`}
                  >
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {csvData.length} rows × {headers.length} columns
      </div>
    </div>
  );
} 