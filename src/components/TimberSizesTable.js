"use client";

import { useState } from 'react';

/**
 * TimberSizesTable component for displaying timber sizes with colorful formatting
 * 
 * @param {Object} props Component props
 * @param {Object} props.results The calculation results containing joists, beams, and columns
 * @returns {JSX.Element} The TimberSizesTable component
 */
export default function TimberSizesTable({ results }) {
  const [activeTab, setActiveTab] = useState('all');
  
  if (!results) return null;
  
  const { joists, beams, columns, joistSpan, beamSpan } = results;
  
  // Column colors for rainbow effect
  const columnColors = {
    width: 'bg-blue-100',
    depth: 'bg-green-100',
    grade: 'bg-yellow-100',
    span: 'bg-purple-100',
    type: 'bg-pink-100'
  };
  
  // Prepare data for display
  const allSizes = [
    { 
      type: 'Joist', 
      width: joists.width, 
      depth: joists.depth, 
      grade: joists.grade,
      span: joistSpan.toFixed(2)
    },
    { 
      type: 'Beam', 
      width: beams.width, 
      depth: beams.depth, 
      grade: beams.grade,
      span: beamSpan.toFixed(2)
    },
    { 
      type: 'Column', 
      width: columns.width, 
      depth: columns.depth, 
      grade: columns.grade,
      span: '3.00' // Fixed height
    }
  ];
  
  // Filter data based on active tab
  const displayData = activeTab === 'all' 
    ? allSizes 
    : allSizes.filter(item => item.type.toLowerCase() === activeTab);
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex border-b mb-4">
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('all')}
        >
          All Sizes
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'joist' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('joist')}
        >
          Joists
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'beam' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('beam')}
        >
          Beams
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'column' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('column')}
        >
          Columns
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Width (mm)
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Depth (mm)
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Span (m)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayData.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className={`px-3 py-2 whitespace-nowrap text-sm font-medium ${columnColors.type}`}>
                  {item.type}
                </td>
                <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 ${columnColors.width}`}>
                  {item.width}
                </td>
                <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 ${columnColors.depth}`}>
                  {item.depth}
                </td>
                <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 ${columnColors.grade}`}>
                  {item.grade}
                </td>
                <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 ${columnColors.span}`}>
                  {item.span}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>All sizes are in millimeters (mm) except spans which are in meters (m).</p>
        <p>These sizes are selected from the standard MASSLAM timber sections catalog.</p>
        <p><strong>Note:</strong> Joists are spaced at fixed 800mm centers.</p>
        <p className="mt-2 text-xs text-blue-600">
          <a href="/masslam-sizes" className="underline">View all available MASSLAM sizes</a>
        </p>
      </div>
    </div>
  );
} 