"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchMasslamSizes } from '../../utils/data-fetchers';

export default function MasslamSizes() {
  const [sizes, setSizes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const loadSizes = async () => {
      try {
        const data = await fetchMasslamSizes();
        setSizes(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadSizes();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600 italic">Loading MASSLAM sizes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-400 rounded-lg mb-6">
        <p className="text-red-700">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link 
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Calculator
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">MASSLAM Sizes</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Available Sections</h2>
        
        {sizes && Object.entries(sizes).map(([type, sections]) => (
          <div key={type} className="mb-8">
            <h3 className="text-lg font-medium mb-3">{type}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Width (mm)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depth (mm)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area (mm²)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">I<sub>xx</sub> (mm⁴)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Z<sub>xx</sub> (mm³)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sections.map((section, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{section.width}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{section.depth}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{section.area}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{section.Ixx}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{section.Zxx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Notes</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>All sections are manufactured from Victorian Hardwood</li>
          <li>Custom sizes available on request</li>
          <li>GL17 and GL21 grades available</li>
          <li>Fire resistance ratings up to 120 minutes</li>
        </ul>
      </div>
    </div>
  );
} 