'use client';

import { useState, useEffect, useMemo } from 'react';
import { calculateBeamSize } from '../utils/timberEngineering';

// Default values for the span table
const DEFAULT_LOAD = 3.0; // kPa
const DEFAULT_FIRE_RATING = 'none';
const DEFAULT_TIMBER_GRADE = 'ML38';

// Span range (in meters)
const MIN_SPAN = 3;
const MAX_SPAN = 9;
const SPAN_STEP = 1;

// Tributary width range (in meters)
const MIN_TRIB_WIDTH = 2;
const MAX_TRIB_WIDTH = 10;
const TRIB_WIDTH_STEP = 2;

// Load options (in kPa)
const LOAD_OPTIONS = [2.0, 3.0, 4.0, 5.0, 7.5, 10.0];

// Fire rating options
const FIRE_RATING_OPTIONS = ['none', '30/30/30', '60/60/60', '90/90/90', '120/120/120'];

// Joist depth options (in mm)
const JOIST_DEPTH_OPTIONS = [200, 240, 300, 360, 400, 450, 500];

// Concrete properties
const CONCRETE_DENSITY = 2400; // kg/m³
const TIMBER_DENSITY = 600; // kg/m³

export default function SpanTables() {
  // State for filter values
  const [load, setLoad] = useState(DEFAULT_LOAD);
  const [fireRating, setFireRating] = useState(DEFAULT_FIRE_RATING);
  const [joistDepth, setJoistDepth] = useState(300); // Default 300mm
  
  // State for highlighting criteria
  const [maxUtilization, setMaxUtilization] = useState(80); // Default 80%
  const [maxDeflection, setMaxDeflection] = useState(null); // Default to span/300 (calculated dynamically)
  
  // Calculate concrete slab thickness based on FRL
  const getConcreteThickness = (frl) => {
    switch (frl) {
      case 'none':
      case '30/30/30':
      case '60/60/60':
        return 100; // 100mm for FRL 0/0/0, 30/30/30, 60/60/60
      case '90/90/90':
        return 110; // 110mm for FRL 90/90/90
      case '120/120/120':
        return 120; // 120mm for FRL 120/120/120
      default:
        return 100; // Default to 100mm
    }
  };
  
  // Calculate joist width based on FRL
  const getJoistWidth = (frl) => {
    switch (frl) {
      case 'none':
        return 45; // mm
      case '30/30/30':
        return 65; // mm
      case '60/60/60':
        return 90; // mm
      case '90/90/90':
        return 110; // mm
      case '120/120/120':
        return 130; // mm
      default:
        return 45; // mm
    }
  };
  
  // Calculate masses and loads
  const calculations = useMemo(() => {
    const joistWidth = getJoistWidth(fireRating);
    const concreteThickness = getConcreteThickness(fireRating);
    
    // Calculate timber mass per m²
    // Assume joists at 800mm spacing (0.8m)
    const joistCrossSectionArea = (joistWidth * joistDepth) / 1000000; // m²
    const joistVolumePerM2 = joistCrossSectionArea * (1 / 0.8); // m³/m² (for joists at 800mm spacing)
    const timberMassPerM2 = joistVolumePerM2 * TIMBER_DENSITY; // kg/m²
    
    // Calculate concrete mass per m²
    const concreteVolumePerM2 = concreteThickness / 1000; // m³/m² (thickness in m)
    const concreteMassPerM2 = concreteVolumePerM2 * CONCRETE_DENSITY; // kg/m²
    
    // Convert to kPa (1 kg/m² = 0.00981 kPa)
    const timberLoadKpa = timberMassPerM2 * 0.00981;
    const concreteLoadKpa = concreteMassPerM2 * 0.00981;
    
    // Total dead load (timber + concrete)
    const totalDeadLoad = timberLoadKpa + concreteLoadKpa;
    
    // Total design load (dead + imposed)
    const totalDesignLoad = totalDeadLoad + load;
    
    return {
      joistWidth,
      concreteThickness,
      timberMassPerM2: timberMassPerM2.toFixed(1),
      timberLoadKpa: timberLoadKpa.toFixed(2),
      concreteMassPerM2: concreteMassPerM2.toFixed(1),
      concreteLoadKpa: concreteLoadKpa.toFixed(2),
      totalDeadLoad: totalDeadLoad.toFixed(2),
      totalDesignLoad: totalDesignLoad.toFixed(2)
    };
  }, [fireRating, joistDepth, load]);
  
  // Generate spans array
  const spans = useMemo(() => {
    const spanArray = [];
    for (let span = MIN_SPAN; span <= MAX_SPAN; span += SPAN_STEP) {
      spanArray.push(span);
    }
    return spanArray;
  }, []);
  
  // Generate tributary widths array
  const tributaryWidths = useMemo(() => {
    const tribArray = [];
    for (let trib = MIN_TRIB_WIDTH; trib <= MAX_TRIB_WIDTH; trib += TRIB_WIDTH_STEP) {
      tribArray.push(trib);
    }
    return tribArray;
  }, []);
  
  // Generate span table data
  const spanTableData = useMemo(() => {
    const tableData = {};
    
    spans.forEach(span => {
      tableData[span] = {};
      
      tributaryWidths.forEach(tribWidth => {
        try {
          // Use total design load (dead + imposed) for calculations
          const totalLoad = parseFloat(calculations.totalDesignLoad);
          
          const result = calculateBeamSize(
            span,
            totalLoad, // Use the total load including concrete and timber weight
            DEFAULT_TIMBER_GRADE,
            tribWidth,
            fireRating
          );
          
          tableData[span][tribWidth] = result;
        } catch (error) {
          console.error(`Error calculating beam size for span ${span}m, tributary width ${tribWidth}m:`, error);
          tableData[span][tribWidth] = { error: true, message: error.message };
        }
      });
    });
    
    return tableData;
  }, [spans, tributaryWidths, calculations.totalDesignLoad, fireRating]);
  
  // Function to check if a cell meets the criteria for highlighting
  const meetsCriteria = (result, span) => {
    if (result.error) return false;
    
    const utilizationPercent = result.engineering.utilization.overall * 100;
    const deflectionLimit = maxDeflection || (span * 1000 / 300); // Convert span to mm and divide by 300 if maxDeflection not set
    
    return utilizationPercent <= maxUtilization && 
           result.engineering.actualDeflection <= deflectionLimit;
  };
  
  return (
    <div className="max-w-full">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--apple-text, #1d1d1f)' }}>Primary Beam Span Tables</h1>
      
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8" style={{ borderColor: 'var(--apple-border, #d2d2d7)', borderWidth: '1px' }}>
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="flex-1">
            <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--apple-text, #1d1d1f)' }}>Table Parameters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                  Imposed Load (kPa)
                </label>
                <select
                  value={load}
                  onChange={(e) => setLoad(parseFloat(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ 
                    backgroundColor: '#f5f5f7', 
                    borderColor: 'transparent',
                    color: '#1d1d1f',
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23777%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  {LOAD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.toFixed(1)} kPa
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                  Fire Rating (FRL)
                </label>
                <select
                  value={fireRating}
                  onChange={(e) => setFireRating(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ 
                    backgroundColor: '#f5f5f7', 
                    borderColor: 'transparent',
                    color: '#1d1d1f',
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23777%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  {FIRE_RATING_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'none' ? 'None' : option}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                  Joist Depth (mm)
                </label>
                <select
                  value={joistDepth}
                  onChange={(e) => setJoistDepth(parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ 
                    backgroundColor: '#f5f5f7', 
                    borderColor: 'transparent',
                    color: '#1d1d1f',
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23777%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  {JOIST_DEPTH_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} mm
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--apple-text, #1d1d1f)' }}>Load Calculations</h2>
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--apple-input-bg, #f5f5f7)' }}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {/* Joist Information */}
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--apple-text, #1d1d1f)' }}>Joist Details</p>
                  <p className="text-sm" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                    Size: {calculations.joistWidth} × {joistDepth} mm
                  </p>
                  <p className="text-sm" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                    Mass: {calculations.timberMassPerM2} kg/m²
                  </p>
                  <p className="text-sm" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                    Load: {calculations.timberLoadKpa} kPa
                  </p>
                </div>
                
                {/* Concrete Information */}
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--apple-text, #1d1d1f)' }}>Concrete Slab</p>
                  <p className="text-sm" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                    Thickness: {calculations.concreteThickness} mm
                  </p>
                  <p className="text-sm" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                    Mass: {calculations.concreteMassPerM2} kg/m²
                  </p>
                  <p className="text-sm" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                    Load: {calculations.concreteLoadKpa} kPa
                  </p>
                </div>
                
                {/* Total Loads */}
                <div className="col-span-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--apple-border, #d2d2d7)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--apple-text, #1d1d1f)' }}>Total Loads</p>
                  <div className="flex justify-between">
                    <p className="text-sm" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                      Dead Load: {calculations.totalDeadLoad} kPa
                    </p>
                    <p className="text-sm" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                      Imposed Load: {load.toFixed(2)} kPa
                    </p>
                  </div>
                  <p className="text-sm font-medium mt-2" style={{ color: 'var(--apple-text, #1d1d1f)' }}>
                    Design Load: {calculations.totalDesignLoad} kPa
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-5">
              <h3 className="text-md font-medium mb-2" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                Highlighting Criteria
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                    Max Utilization (%)
                  </label>
                  <select
                    value={maxUtilization}
                    onChange={(e) => setMaxUtilization(parseInt(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ 
                      backgroundColor: '#f5f5f7', 
                      borderColor: 'transparent',
                      color: '#1d1d1f',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23777%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                  >
                    {[50, 60, 70, 80, 90, 100].map((option) => (
                      <option key={option} value={option}>
                        {option}%
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                    Deflection Limit
                  </label>
                  <select
                    value={maxDeflection === null ? 'default' : maxDeflection}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMaxDeflection(value === 'default' ? null : parseInt(value));
                    }}
                    className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ 
                      backgroundColor: '#f5f5f7', 
                      borderColor: 'transparent',
                      color: '#1d1d1f',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23777%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value="default">span/300 (Default)</option>
                    <option value="20">20 mm</option>
                    <option value="30">30 mm</option>
                    <option value="40">40 mm</option>
                    <option value="50">50 mm</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-md font-medium mb-2" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
            Tributary Width (m)
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
            The table below shows beam sizes for different spans and tributary widths. Each column represents a different tributary width in meters.
            <span className="ml-2 font-medium" style={{ color: '#34c759' }}>Cells highlighted in green meet your specified criteria.</span>
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'var(--apple-table-header-bg, #f5f5f7)' }}>
                <th className="px-4 py-3 border text-left text-sm font-medium" 
                    style={{ 
                      color: 'var(--apple-text-secondary, #86868b)',
                      borderColor: 'var(--apple-border, #d2d2d7)'
                    }}>
                  Span (m)
                </th>
                {tributaryWidths.map((tribWidth) => (
                  <th key={tribWidth} className="px-4 py-3 border text-center text-sm font-medium"
                      style={{ 
                        color: 'var(--apple-text-secondary, #86868b)',
                        borderColor: 'var(--apple-border, #d2d2d7)'
                      }}>
                    {tribWidth.toFixed(1)}m
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spans.map((span, index) => (
                <tr key={span} 
                    className="hover:bg-gray-50" 
                    style={{ 
                      backgroundColor: index % 2 === 0 ? 'var(--apple-table-row-even, #ffffff)' : 'var(--apple-table-row-odd, #fafafa)'
                    }}>
                  <td className="px-4 py-3 border text-sm font-medium"
                      style={{ 
                        color: 'var(--apple-text, #1d1d1f)',
                        borderColor: 'var(--apple-border, #d2d2d7)'
                      }}>
                    {span.toFixed(1)}
                  </td>
                  {tributaryWidths.map((tribWidth) => {
                    const result = spanTableData[span][tribWidth];
                    const hasError = result.error;
                    const meetsRequirements = !hasError && meetsCriteria(result, span);
                    
                    return (
                      <td key={tribWidth} className="px-4 py-3 border text-sm"
                          style={{ 
                            borderColor: 'var(--apple-border, #d2d2d7)',
                            backgroundColor: meetsRequirements ? 'rgba(52, 199, 89, 0.15)' : 'inherit'
                          }}>
                        {hasError ? (
                          <span style={{ color: 'var(--apple-error, #ff3b30)' }}>N/A</span>
                        ) : (
                          <div>
                            <div className="font-medium" style={{ color: 'var(--apple-text, #1d1d1f)' }}>
                              {result.width}×{result.depth}
                            </div>
                            
                            <div className="mt-2 text-xs space-y-1" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
                              <p>
                                <span className="font-medium">Utilization:</span>{' '}
                                <span style={{ 
                                  color: result.engineering.utilization.overall * 100 > maxUtilization 
                                    ? 'var(--apple-error, #ff3b30)' 
                                    : 'inherit'
                                }}>
                                  {(result.engineering.utilization.overall * 100).toFixed(0)}%
                                </span>
                              </p>
                              <p>
                                <span className="font-medium">Deflection:</span>{' '}
                                <span style={{ 
                                  color: result.engineering.actualDeflection > (maxDeflection || (span * 1000 / 300))
                                    ? 'var(--apple-error, #ff3b30)' 
                                    : 'inherit'
                                }}>
                                  {result.engineering.actualDeflection.toFixed(1)}mm
                                </span>
                              </p>
                              <p>
                                <span className="font-medium">Bending:</span>{' '}
                                {(result.engineering.utilization.bending * 100).toFixed(0)}%
                              </p>
                              <p>
                                <span className="font-medium">Shear:</span>{' '}
                                {(result.engineering.utilization.shear * 100).toFixed(0)}%
                              </p>
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6" style={{ borderColor: 'var(--apple-border, #d2d2d7)', borderWidth: '1px' }}>
        <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--apple-text, #1d1d1f)' }}>Notes</h2>
        <ul className="list-disc pl-5 text-sm space-y-2" style={{ color: 'var(--apple-text-secondary, #86868b)' }}>
          <li>All beam sizes are calculated using MASSLAM ML38 timber properties.</li>
          <li>Calculations consider bending, shear, and deflection criteria.</li>
          <li>Deflection limit is set to span/300 by default.</li>
          <li>Fire ratings are applied to 3 sides of the beam (bottom and both sides).</li>
          <li>Concrete slab thickness is based on the selected fire rating:
            <ul className="list-disc pl-5 mt-1">
              <li>FRL 0/0/0, 30/30/30, 60/60/60: 100mm concrete</li>
              <li>FRL 90/90/90: 110mm concrete</li>
              <li>FRL 120/120/120: 120mm concrete</li>
            </ul>
          </li>
          <li>Joist self-weight is calculated based on selected depth and fire rating requirements.</li>
          <li>The total design load includes imposed load plus dead loads from joists and concrete.</li>
          <li><strong>Tributary width</strong> represents the perpendicular distance supported by the beam.</li>
          <li>For edge beams, use half the bay width as tributary width.</li>
          <li>For interior beams, use the sum of half the bay width on each side.</li>
          <li>Engineering data shows utilization percentages and deflection values for each beam size.</li>
          <li><span style={{ color: '#34c759' }}>Green highlighted cells</span> meet both utilization and deflection criteria.</li>
        </ul>
      </div>
    </div>
  );
} 