"use client";

import { useState } from 'react';

/**
 * TimberSizesTable component for displaying timber sizes with Apple-inspired styling
 * 
 * @param {Object} props Component props
 * @param {Object} props.results The calculation results containing joists, beams, and columns
 * @param {boolean} props.compact Whether to display the table in compact mode
 * @returns {JSX.Element} The TimberSizesTable component
 */
export default function TimberSizesTable({ results, compact = false }) {
  const [activeTab, setActiveTab] = useState('all');
  
  if (!results) return null;
  
  const { joists, beams, columns, joistSpan, beamSpan } = results;
  
  // Prepare data for display
  const allSizes = [
    { 
      type: 'Joist', 
      width: joists.width, 
      depth: joists.depth, 
      span: joistSpan.toFixed(2)
    },
    { 
      type: 'Beam', 
      width: beams.width, 
      depth: beams.depth, 
      span: beamSpan.toFixed(2)
    },
    { 
      type: 'Column', 
      width: columns.width, 
      depth: columns.depth, 
      span: '3.00' // Fixed height
    }
  ];
  
  // Filter data based on active tab
  const displayData = activeTab === 'all' 
    ? allSizes 
    : allSizes.filter(item => item.type.toLowerCase() === activeTab);
  
  return (
    <div className="rounded-lg overflow-hidden">
      {!compact && (
        <div className="flex border-b mb-6" style={{ borderColor: 'var(--apple-border)' }}>
          <button 
            className={`px-5 py-3 font-medium transition-colors ${activeTab === 'all' ? 'border-b-2' : ''}`}
            style={{ 
              color: activeTab === 'all' ? 'var(--apple-blue)' : 'var(--apple-text-secondary)',
              borderColor: 'var(--apple-blue)'
            }}
            onClick={() => setActiveTab('all')}
          >
            All Sizes
          </button>
          <button 
            className={`px-5 py-3 font-medium transition-colors ${activeTab === 'joist' ? 'border-b-2' : ''}`}
            style={{ 
              color: activeTab === 'joist' ? 'var(--apple-blue)' : 'var(--apple-text-secondary)',
              borderColor: 'var(--apple-blue)'
            }}
            onClick={() => setActiveTab('joist')}
          >
            Joists
          </button>
          <button 
            className={`px-5 py-3 font-medium transition-colors ${activeTab === 'beam' ? 'border-b-2' : ''}`}
            style={{ 
              color: activeTab === 'beam' ? 'var(--apple-blue)' : 'var(--apple-text-secondary)',
              borderColor: 'var(--apple-blue)'
            }}
            onClick={() => setActiveTab('beam')}
          >
            Beams
          </button>
          <button 
            className={`px-5 py-3 font-medium transition-colors ${activeTab === 'column' ? 'border-b-2' : ''}`}
            style={{ 
              color: activeTab === 'column' ? 'var(--apple-blue)' : 'var(--apple-text-secondary)',
              borderColor: 'var(--apple-blue)'
            }}
            onClick={() => setActiveTab('column')}
          >
            Columns
          </button>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
              <th scope="col" className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} text-left text-xs font-medium uppercase tracking-wider`} style={{ color: 'var(--apple-text-secondary)' }}>
                Type
              </th>
              <th scope="col" className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} text-left text-xs font-medium uppercase tracking-wider`} style={{ color: 'var(--apple-text-secondary)' }}>
                Width
              </th>
              <th scope="col" className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} text-left text-xs font-medium uppercase tracking-wider`} style={{ color: 'var(--apple-text-secondary)' }}>
                Depth
              </th>
              <th scope="col" className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} text-left text-xs font-medium uppercase tracking-wider`} style={{ color: 'var(--apple-text-secondary)' }}>
                Span
              </th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((item, index) => (
              <tr 
                key={index} 
                style={{ 
                  backgroundColor: index % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
                  borderBottom: '1px solid var(--apple-border)'
                }}
              >
                <td className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm font-medium`} style={{ color: 'var(--apple-text)' }}>
                  {item.type}
                </td>
                <td className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm`} style={{ color: 'var(--apple-text)' }}>
                  {item.width}
                </td>
                <td className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm`} style={{ color: 'var(--apple-text)' }}>
                  {item.depth}
                </td>
                <td className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm`} style={{ color: 'var(--apple-text)' }}>
                  {item.span}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {!compact && (
        <div className="mt-6 text-sm" style={{ color: 'var(--apple-text-secondary)' }}>
          <p className="mb-2">All sizes are in millimeters (mm) except spans which are in meters (m).</p>
          <p className="mb-2">These sizes are selected from the standard MASSLAM timber sections catalog.</p>
          <p className="mb-2"><strong>Note:</strong> Joists are spaced at fixed 800mm centers.</p>
          <p className="mt-4 text-xs">
            <a href="/masslam-sizes" style={{ color: 'var(--apple-blue)', textDecoration: 'none' }}>
              View all available MASSLAM sizes →
            </a>
          </p>
        </div>
      )}
    </div>
  );
} 