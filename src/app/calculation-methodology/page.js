'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TIMBER_PROPERTIES, loadTimberProperties } from '@/utils/timberEngineering';
import { getMasslamSL33Properties } from '@/utils/masslamProperties';

export default function CalculationMethodologyPage() {
  // Default values for calculation parameters
  const [allowableDeflection, setAllowableDeflection] = useState(300); // L/300 is typical
  const [safetyFactor, setSafetyFactor] = useState(2.0); // Typical safety factor
  const [loadDurationFactor, setLoadDurationFactor] = useState(0.8); // Medium-term loading
  const [deadLoad, setDeadLoad] = useState(0.5); // kPa
  const [liveLoad, setLiveLoad] = useState(1.5); // kPa (residential)
  const [maxSpan, setMaxSpan] = useState(9.0); // meters
  
  // State for mechanical properties
  const [mechanicalProperties, setMechanicalProperties] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load mechanical properties on component mount
  useEffect(() => {
    async function loadProperties() {
      setIsLoading(true);
      try {
        // Load properties from CSV
        await loadTimberProperties();
        const rawProperties = await getMasslamSL33Properties();
        setMechanicalProperties(rawProperties);
      } catch (error) {
        console.error('Error loading mechanical properties:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadProperties();
  }, []);
  
  // Calculate example span based on current parameters
  const calculateExampleSpan = () => {
    // Get timber properties for MASSLAM_SL33
    const timberProps = TIMBER_PROPERTIES.MASSLAM_SL33;
    
    // Example joist: 90mm x 240mm
    const width = 90; // mm
    const depth = 240; // mm
    
    // Calculate section properties
    const area = width * depth; // mm²
    const momentOfInertia = (width * Math.pow(depth, 3)) / 12; // mm⁴
    
    // Calculate total load
    const totalLoad = deadLoad + liveLoad; // kPa
    
    // Convert to line load (assuming 450mm spacing)
    const spacing = 450; // mm
    const lineLoad = totalLoad * spacing / 1000; // kN/m
    
    // Calculate maximum moment
    const moment = lineLoad * Math.pow(maxSpan, 2) / 8; // kNm
    
    // Calculate bending stress
    const bendingStress = (moment * 1000000) / (momentOfInertia / (depth / 2)); // MPa
    
    // Calculate allowable stress with safety factor and load duration
    const allowableStress = timberProps.bendingStrength * loadDurationFactor / safetyFactor;
    
    // Calculate maximum span based on strength
    const strengthSpan = Math.sqrt((allowableStress * momentOfInertia) / (lineLoad * 1000000 * (depth / 2)) * 8);
    
    // Calculate maximum span based on deflection
    const deflectionSpan = Math.pow((5 * lineLoad * Math.pow(1000, 4)) / (384 * timberProps.modulusOfElasticity * momentOfInertia * (1 / allowableDeflection)), 0.25);
    
    // Return the limiting span (smaller of the two)
    return {
      strengthSpan: strengthSpan.toFixed(2),
      deflectionSpan: deflectionSpan.toFixed(2),
      limitingSpan: Math.min(strengthSpan, deflectionSpan).toFixed(2),
      limitingFactor: strengthSpan < deflectionSpan ? 'Strength' : 'Deflection'
    };
  };
  
  const exampleResults = calculateExampleSpan();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Member Calculation Methodology</h1>
        <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
          &larr; Back to Member Calculator
        </Link>
      </div>
      
      {/* MASSLAM SL33 Mechanical Properties Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">MASSLAM SL33 Mechanical Properties</h2>
        <p className="mb-4">
          The following mechanical properties are loaded from the MASSLAM_SL33_Mechanical_Properties.csv file and used in all calculations:
        </p>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            <span className="ml-2">Loading properties...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border-b text-left">Property</th>
                  <th className="py-2 px-4 border-b text-left">Value</th>
                  <th className="py-2 px-4 border-b text-left">Unit</th>
                </tr>
              </thead>
              <tbody>
                {mechanicalProperties ? (
                  Object.entries(mechanicalProperties).map(([property, data], index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-2 px-4 border-b">{property}</td>
                      <td className="py-2 px-4 border-b">{data.value === null ? 'N/A' : data.value}</td>
                      <td className="py-2 px-4 border-b">{data.unit}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="py-4 px-4 border-b text-center text-gray-500">
                      Failed to load mechanical properties. Using default values.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
          <h3 className="text-md font-medium text-blue-800 mb-2">How These Properties Are Used</h3>
          <p className="text-sm text-blue-700">
            These mechanical properties are used in all structural calculations throughout the application. 
            The values are loaded directly from the MASSLAM_SL33_Mechanical_Properties.csv file, ensuring 
            that all calculations use the most up-to-date specifications for MASSLAM SL33 timber.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column - Explanation */}
        <div>
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">How Timber Spans Are Calculated</h2>
            <p className="mb-4">
              Timber span calculations are based on two primary criteria:
            </p>
            <ol className="list-decimal pl-5 mb-4 space-y-2">
              <li>
                <strong>Strength:</strong> The timber must be strong enough to resist the bending moment caused by the applied loads without exceeding its allowable stress.
              </li>
              <li>
                <strong>Deflection:</strong> The timber must be stiff enough to limit deflection (sagging) to acceptable levels for serviceability.
              </li>
            </ol>
            <p className="mb-4">
              The smaller of these two calculated spans becomes the limiting factor for design.
            </p>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Strength Calculation</h3>
            <div className="bg-gray-100 p-3 rounded mb-4">
              <p className="font-mono text-sm">
                M = w × L² ÷ 8<br />
                σ = M × y ÷ I<br />
                L = √(8 × σ<sub>allow</sub> × I ÷ (w × y))
              </p>
              <p className="text-xs mt-2">
                Where:<br />
                M = Maximum bending moment (kNm)<br />
                w = Distributed load (kN/m)<br />
                L = Span (m)<br />
                σ = Bending stress (MPa)<br />
                y = Distance from neutral axis to extreme fiber (mm)<br />
                I = Moment of inertia (mm⁴)<br />
                σ<sub>allow</sub> = Allowable stress = f<sub>b</sub> × k<sub>mod</sub> ÷ γ<sub>M</sub>
              </p>
            </div>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Deflection Calculation</h3>
            <div className="bg-gray-100 p-3 rounded mb-4">
              <p className="font-mono text-sm">
                δ = 5 × w × L⁴ ÷ (384 × E × I)<br />
                L = ⁴√(384 × E × I × δ<sub>allow</sub> ÷ (5 × w))
              </p>
              <p className="text-xs mt-2">
                Where:<br />
                δ = Maximum deflection (mm)<br />
                w = Distributed load (N/mm)<br />
                L = Span (mm)<br />
                E = Modulus of elasticity (MPa)<br />
                I = Moment of inertia (mm⁴)<br />
                δ<sub>allow</sub> = L ÷ (deflection limit)
              </p>
            </div>
          </div>
          
          {/* New Section: Detailed Component Calculation Methodology */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Detailed Component Calculation Methodology</h2>
            <p className="mb-4">
              This section provides a detailed explanation of how each structural component (joist, beam, and column) is calculated in the application, using MASSLAM SL33 properties and standard sizes.
            </p>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Joist Size Calculation</h3>
            <p className="mb-4">
              The joist size calculation follows these steps:
            </p>
            <ol className="list-decimal pl-5 mb-4 space-y-2">
              <li>
                <strong>Convert span to millimeters:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">spanMm = span * 1000</code><br />
                <span className="text-sm text-gray-600">Example: For a 4.5m span, spanMm = 4500 mm</span>
              </li>
              <li>
                <strong>Calculate theoretical width:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">theoreticalWidth = Math.max(45, Math.ceil(spanMm / 30))</code><br />
                <span className="text-sm text-gray-600">Example: For a 4.5m span, theoreticalWidth = Math.max(45, Math.ceil(4500 / 30)) = Math.max(45, 150) = 150 mm</span>
              </li>
              <li>
                <strong>Calculate theoretical depth:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">theoreticalDepth = Math.max(140, Math.ceil(spanMm / 15))</code><br />
                <span className="text-sm text-gray-600">Example: For a 4.5m span, theoreticalDepth = Math.max(140, Math.ceil(4500 / 15)) = Math.max(140, 300) = 300 mm</span>
              </li>
              <li>
                <strong>Calculate fire resistance allowance (if applicable):</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">fireAllowance = calculateFireResistanceAllowance(fireRating)</code><br />
                <span className="text-sm text-gray-600">Example: For a 60-minute fire rating with MASSLAM SL33 charring rate of 0.7 mm/min, fireAllowance = 0.7 * 60 = 42 mm</span>
              </li>
              <li>
                <strong>Add fire resistance allowance to dimensions:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">fireAdjustedWidth = theoreticalWidth + (2 * fireAllowance)</code><br />
                <code className="bg-gray-100 px-2 py-1 rounded">fireAdjustedDepth = theoreticalDepth + fireAllowance</code><br />
                <span className="text-sm text-gray-600">Example: For a 150 mm width and 300 mm depth with 42 mm allowance, fireAdjustedWidth = 150 + (2 * 42) = 234 mm, fireAdjustedDepth = 300 + 42 = 342 mm</span>
              </li>
              <li>
                <strong>Find nearest available standard size:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">width = findNearestWidth(fireAdjustedWidth)</code><br />
                <code className="bg-gray-100 px-2 py-1 rounded">depth = findNearestDepth(width, fireAdjustedDepth)</code><br />
                <span className="text-sm text-gray-600">Example: For a 234 mm adjusted width and 342 mm adjusted depth, the nearest standard size from masslam_sizes.csv would be 250 mm width and 410 mm depth</span>
              </li>
            </ol>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Example Joist Calculation</h4>
              <p className="mb-2">Input parameters:</p>
              <ul className="list-disc pl-5 mb-2">
                <li>Span: 4.5m</li>
                <li>Spacing: 450 mm</li>
                <li>Load: 2.0 kPa</li>
                <li>Timber Grade: MASSLAM_SL33</li>
                <li>Fire Rating: 60 minutes</li>
              </ul>
              <p className="mb-2">Calculation steps:</p>
              <ol className="list-decimal pl-5 mb-2 text-sm">
                <li>spanMm = 4.5 * 1000 = 4500 mm</li>
                <li>theoreticalWidth = Math.max(45, Math.ceil(4500 / 30)) = 150 mm</li>
                <li>theoreticalDepth = Math.max(140, Math.ceil(4500 / 15)) = 300 mm</li>
                <li>fireAllowance = 0.7 * 60 = 42 mm</li>
                <li>fireAdjustedWidth = 150 + (2 * 42) = 234 mm</li>
                <li>fireAdjustedDepth = 300 + 42 = 342 mm</li>
                <li>Final size (from standard sizes): 250 mm × 410 mm</li>
              </ol>
            </div>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Beam Size Calculation</h3>
            <p className="mb-4">
              The beam size calculation follows these steps:
            </p>
            <ol className="list-decimal pl-5 mb-4 space-y-2">
              <li>
                <strong>Convert span to millimeters:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">spanMm = span * 1000</code><br />
                <span className="text-sm text-gray-600">Example: For a 6.0m span, spanMm = 6000 mm</span>
              </li>
              <li>
                <strong>Calculate theoretical width:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">theoreticalWidth = Math.max(65, Math.ceil(spanMm / 25))</code><br />
                <span className="text-sm text-gray-600">Example: For a 6.0m span, theoreticalWidth = Math.max(65, Math.ceil(6000 / 25)) = Math.max(65, 240) = 240 mm</span>
              </li>
              <li>
                <strong>Calculate theoretical depth:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">theoreticalDepth = Math.max(240, Math.ceil(spanMm / 12))</code><br />
                <span className="text-sm text-gray-600">Example: For a 6.0m span, theoreticalDepth = Math.max(240, Math.ceil(6000 / 12)) = Math.max(240, 500) = 500 mm</span>
              </li>
              <li>
                <strong>Calculate fire resistance allowance (if applicable):</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">fireAllowance = calculateFireResistanceAllowance(fireRating)</code><br />
                <span className="text-sm text-gray-600">Example: For a 60-minute fire rating with MASSLAM SL33 charring rate of 0.7 mm/min, fireAllowance = 0.7 * 60 = 42 mm</span>
              </li>
              <li>
                <strong>Add fire resistance allowance to dimensions:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">fireAdjustedWidth = theoreticalWidth + (2 * fireAllowance)</code><br />
                <code className="bg-gray-100 px-2 py-1 rounded">fireAdjustedDepth = theoreticalDepth + fireAllowance</code><br />
                <span className="text-sm text-gray-600">Example: For a 240 mm width and 500 mm depth with 42 mm allowance, fireAdjustedWidth = 240 + (2 * 42) = 324 mm, fireAdjustedDepth = 500 + 42 = 542 mm</span>
              </li>
              <li>
                <strong>Find nearest available standard size:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">width = findNearestWidth(fireAdjustedWidth)</code><br />
                <code className="bg-gray-100 px-2 py-1 rounded">depth = findNearestDepth(width, fireAdjustedDepth)</code><br />
                <span className="text-sm text-gray-600">Example: For a 324 mm adjusted width and 542 mm adjusted depth, the nearest standard size from masslam_sizes.csv would be 335 mm width and 550 mm depth</span>
              </li>
            </ol>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Example Beam Calculation</h4>
              <p className="mb-2">Input parameters:</p>
              <ul className="list-disc pl-5 mb-2">
                <li>Span: 6.0m</li>
                <li>Load: 3.0 kPa</li>
                <li>Timber Grade: MASSLAM_SL33</li>
                <li>Fire Rating: 60 minutes</li>
              </ul>
              <p className="mb-2">Calculation steps:</p>
              <ol className="list-decimal pl-5 mb-2 text-sm">
                <li>spanMm = 6.0 * 1000 = 6000 mm</li>
                <li>theoreticalWidth = Math.max(65, Math.ceil(6000 / 25)) = 240 mm</li>
                <li>theoreticalDepth = Math.max(240, Math.ceil(6000 / 12)) = 500 mm</li>
                <li>fireAllowance = 0.7 * 60 = 42 mm</li>
                <li>fireAdjustedWidth = 240 + (2 * 42) = 324 mm</li>
                <li>fireAdjustedDepth = 500 + 42 = 542 mm</li>
                <li>Final size (from standard sizes): 335 mm × 550 mm</li>
              </ol>
            </div>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Column Size Calculation</h3>
            <p className="mb-4">
              The column size calculation follows these steps:
            </p>
            <ol className="list-decimal pl-5 mb-4 space-y-2">
              <li>
                <strong>Width Matching:</strong> Column width matches the supporting beam width for proper connection.
              </li>
              <li>
                <strong>Tributary Area Calculation:</strong> The area supported by each column is calculated based on the bay dimensions.
              </li>
              <li>
                <strong>Load Accumulation:</strong> Total load is calculated as the floor load (kPa) multiplied by the tributary area (m²) and the number of floors.
              </li>
              <li>
                <strong>Progressive Sizing:</strong> Column depth increases with additional floors (50mm per additional floor).
              </li>
              <li>
                <strong>Minimum Proportions:</strong> Column depth is always at least equal to its width (square minimum).
              </li>
              <li>
                <strong>Standard Size Adjustment:</strong> Final dimensions are adjusted to the nearest available MASSLAM sizes.
              </li>
            </ol>
            
            <div className="bg-gray-100 p-3 rounded mb-4">
              <pre className="font-mono text-sm whitespace-pre-wrap">
{`// Calculate tributary area for the column
tributaryArea = bayLength * bayWidth

// Calculate load based on tributary area and number of floors
loadPerFloor = floorLoad * tributaryArea  // kN per floor
totalLoad = loadPerFloor * numberOfFloors  // Total kN

// Size the column based on load
initialDepth = columnWidth
let depth = initialDepth
if (floors > 1) {
  depth += (floors - 1) * 50
}
depth = max(depth, width) // Ensure minimum square proportion`}
              </pre>
            </div>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Fire Resistance Calculation</h3>
            <p className="mb-4">
              Fire resistance is calculated based on the charring rate of MASSLAM SL33 timber:
            </p>
            <div className="bg-gray-100 p-3 rounded mb-4">
              <pre className="font-mono text-sm whitespace-pre-wrap">
{`fireAllowance = charringRate * requiredMinutes
where:
charringRate = 0.7 mm/min (from MASSLAM_SL33_Mechanical_Properties.csv)
requiredMinutes = fire rating in minutes (e.g., 30, 60, 90, 120)`}
              </pre>
            </div>
            <p className="mb-4">
              This fire allowance is added to the dimensions of the structural members to ensure they maintain their structural integrity for the required fire rating period.
            </p>
            
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <h3 className="text-md font-medium text-blue-800 mb-2">Verification of Calculations</h3>
              <p className="text-sm text-blue-700">
                Engineers can verify these calculations by following the step-by-step process outlined above. The calculations use the mechanical properties from MASSLAM_SL33_Mechanical_Properties.csv and select from the standard sizes in masslam_sizes.csv. The simplified formulas used in the calculator provide a conservative estimate for preliminary design, but detailed structural analysis should be performed for final design.
              </p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Key Factors Affecting Span</h2>
            
            <h3 className="text-lg font-medium mb-2">Allowable Deflection Limits</h3>
            <p className="mb-4">
              Typically expressed as a fraction of the span (L). Common values:
            </p>
            <ul className="list-disc pl-5 mb-4">
              <li>L/300 - Standard for floor joists</li>
              <li>L/250 - Acceptable for some applications</li>
              <li>L/360 - More stringent, for higher quality floors</li>
              <li>L/480 - Very strict, for special applications</li>
            </ul>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Safety Factors</h3>
            <p className="mb-4">
              Applied to material strength to account for uncertainties:
            </p>
            <ul className="list-disc pl-5 mb-4">
              <li>1.5 - Minimum safety factor</li>
              <li>2.0 - Typical for structural applications</li>
              <li>2.5 - Conservative design</li>
            </ul>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Load Duration Factors</h3>
            <p className="mb-4">
              Adjust strength based on load duration:
            </p>
            <ul className="list-disc pl-5 mb-4">
              <li>1.0 - Short-term loads (e.g., wind, snow)</li>
              <li>0.8 - Medium-term loads (e.g., live loads)</li>
              <li>0.6 - Long-term loads (e.g., permanent loads)</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow mt-6">
            <h2 className="text-xl font-semibold mb-4">Column Calculation Methodology</h2>
            
            <h3 className="text-lg font-medium mb-2">Multi-Floor Column Sizing</h3>
            <p className="mb-4">
              For multi-story structures, columns must be sized to support the cumulative load from all floors above. Our approach:
            </p>
            
            <ol className="list-decimal pl-5 mb-4 space-y-2">
              <li>
                <strong>Width Matching:</strong> Column width matches the supporting beam width for proper connection.
              </li>
              <li>
                <strong>Tributary Area Calculation:</strong> The area supported by each column is calculated based on the bay dimensions.
              </li>
              <li>
                <strong>Load Accumulation:</strong> Total load is calculated as the floor load (kPa) multiplied by the tributary area (m²) and the number of floors.
              </li>
              <li>
                <strong>Progressive Sizing:</strong> Column depth increases with additional floors (50mm per additional floor).
              </li>
              <li>
                <strong>Minimum Proportions:</strong> Column depth is always at least equal to its width (square minimum).
              </li>
              <li>
                <strong>Standard Size Adjustment:</strong> Final dimensions are adjusted to the nearest available MASSLAM sizes.
              </li>
            </ol>
            
            <div className="bg-gray-100 p-3 rounded mb-4">
              <pre className="font-mono text-sm whitespace-pre-wrap">
{`// Calculate tributary area for the column
tributaryArea = bayLength * bayWidth

// Calculate load based on tributary area and number of floors
loadPerFloor = floorLoad * tributaryArea  // kN per floor
totalLoad = loadPerFloor * numberOfFloors  // Total kN

// Size the column based on load
initialDepth = columnWidth
let depth = initialDepth
if (floors > 1) {
  depth += (floors - 1) * 50
}
depth = max(depth, width) // Ensure minimum square proportion`}
              </pre>
            </div>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Column Calculation Parameters</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 border-b text-left">Parameter</th>
                    <th className="py-2 px-4 border-b text-left">Typical Value</th>
                    <th className="py-2 px-4 border-b text-left">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-4 border-b">Slenderness Ratio Limit</td>
                    <td className="py-2 px-4 border-b">50</td>
                    <td className="py-2 px-4 border-b">Maximum ratio of effective length to radius of gyration</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b">Effective Length Factor (K)</td>
                    <td className="py-2 px-4 border-b">1.0</td>
                    <td className="py-2 px-4 border-b">For columns with pinned ends (typical in timber construction)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b">Compression Strength Parallel to Grain</td>
                    <td className="py-2 px-4 border-b">{TIMBER_PROPERTIES.MASSLAM_SL33.compressiveStrength} MPa (MASSLAM SL33)</td>
                    <td className="py-2 px-4 border-b">Characteristic strength value for the timber grade</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b">Minimum Width/Depth Ratio</td>
                    <td className="py-2 px-4 border-b">1:1</td>
                    <td className="py-2 px-4 border-b">Minimum ratio to ensure column stability</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b">Size Increment per Floor</td>
                    <td className="py-2 px-4 border-b">50mm</td>
                    <td className="py-2 px-4 border-b">Depth increase for each additional floor</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b">Axial Shortening Limit</td>
                    <td className="py-2 px-4 border-b">1mm per meter</td>
                    <td className="py-2 px-4 border-b">Maximum acceptable shortening under load</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Column Buckling Considerations</h3>
            <p className="mb-4">
              For taller columns, buckling becomes a critical factor. The effective length and slenderness ratio are considered:
            </p>
            
            <div className="bg-gray-100 p-3 rounded mb-4">
              <pre className="font-mono text-sm whitespace-pre-wrap">
{`slendernessRatio = effectiveLength / radiusOfGyration
radiusOfGyration = √(I / A)
where:
I = moment of inertia
A = cross-sectional area`}
              </pre>
            </div>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Axial Shortening</h3>
            <p className="mb-4">
              In multi-story timber structures, axial shortening of columns is an important consideration that affects the overall building performance:
            </p>
            
            <div className="bg-gray-100 p-3 rounded mb-4">
              <pre className="font-mono text-sm whitespace-pre-wrap">
{`Δ = (P × L) / (E × A)
where:
Δ = axial shortening (mm)
P = axial load (N)
L = column length (mm)
E = modulus of elasticity (MPa)
A = cross-sectional area (mm²)`}
              </pre>
            </div>
            
            <p className="mb-4">
              Factors affecting axial shortening in timber columns:
            </p>
            
            <ul className="list-disc pl-5 mb-4">
              <li><strong>Elastic Deformation:</strong> Immediate shortening under load (calculated above)</li>
              <li><strong>Creep:</strong> Long-term deformation under sustained load (typically 1.5-2× elastic deformation)</li>
              <li><strong>Moisture Content:</strong> Dimensional changes due to moisture variations (shrinkage/swelling)</li>
              <li><strong>Connection Compression:</strong> Deformation at connection points between structural elements</li>
            </ul>
            
            <p className="text-sm text-gray-600 mt-4">
              Note: The current implementation focuses on strength and stability. For tall timber buildings where differential axial shortening between columns and walls becomes significant, additional compensation measures should be incorporated in the design by a structural engineer.
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Example Column Calculation with Tributary Area</h4>
              <p className="mb-2">Input parameters:</p>
              <ul className="list-disc pl-5 mb-2">
                <li>Beam Width: 335 mm</li>
                <li>Floor Load: 3.0 kPa</li>
                <li>Bay Length: 6.0 m</li>
                <li>Bay Width: 7.0 m</li>
                <li>Height: 3.2 m</li>
                <li>Number of Floors: 3</li>
                <li>Fire Rating: 60 minutes</li>
              </ul>
              <p className="mb-2">Calculation steps:</p>
              <ol className="list-decimal pl-5 mb-2 text-sm">
                <li>tributaryArea = bayLength * bayWidth = 6.0 * 7.0 = 42.0 m²</li>
                <li>loadPerFloor = floorLoad * tributaryArea = 3.0 * 42.0 = 126.0 kN</li>
                <li>totalLoad = loadPerFloor * numberOfFloors = 126.0 * 3 = 378.0 kN</li>
                <li>width = beamWidth = 335 mm</li>
                <li>depth = width = 335 mm</li>
                <li>depth += (floors - 1) * 50 = 335 + (3 - 1) * 50 = 335 + 100 = 435 mm</li>
                <li>depth = Math.max(435, 335) = 435 mm</li>
                <li>fireAllowance = 0.7 * 60 = 42 mm</li>
                <li>fireAdjustedWidth = 335 + (2 * 42) = 419 mm</li>
                <li>fireAdjustedDepth = 435 + (2 * 42) = 519 mm</li>
                <li>Final size (from standard sizes): 420 mm × 520 mm</li>
              </ol>
            </div>
          </div>
        </div>
        
        {/* Right column - Interactive calculator */}
        <div>
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Adjust Calculation Parameters</h2>
            <p className="mb-4 text-sm text-gray-600">
              Modify these parameters to see how they affect the calculated span.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allowable Deflection Limit (L/X)
                </label>
                <div className="flex items-center">
                  <span className="mr-2">L/</span>
                  <input
                    type="number"
                    className="input w-full"
                    min="100"
                    max="600"
                    value={allowableDeflection}
                    onChange={(e) => setAllowableDeflection(parseInt(e.target.value))}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs">Less strict (L/180)</span>
                  <span className="text-xs">More strict (L/480)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Factor
                </label>
                <input
                  type="range"
                  className="w-full"
                  min="1.5"
                  max="3.0"
                  step="0.1"
                  value={safetyFactor}
                  onChange={(e) => setSafetyFactor(parseFloat(e.target.value))}
                />
                <div className="flex justify-between">
                  <span className="text-xs">1.5 (Minimum)</span>
                  <span className="text-xs">{safetyFactor.toFixed(1)}</span>
                  <span className="text-xs">3.0 (Conservative)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Load Duration Factor
                </label>
                <select
                  className="select w-full"
                  value={loadDurationFactor}
                  onChange={(e) => setLoadDurationFactor(parseFloat(e.target.value))}
                >
                  <option value="1.0">Short-term (1.0)</option>
                  <option value="0.8">Medium-term (0.8)</option>
                  <option value="0.6">Long-term (0.6)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dead Load (kPa)
                </label>
                <input
                  type="number"
                  className="input w-full"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={deadLoad}
                  onChange={(e) => setDeadLoad(parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Live Load (kPa)
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-blue-600"
                      name="liveLoadType"
                      checked={liveLoad === 1.5}
                      onChange={() => setLiveLoad(1.5)}
                    />
                    <span className="ml-2">Residential (1.5 kPa)</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-blue-600"
                      name="liveLoadType"
                      checked={liveLoad === 3.0}
                      onChange={() => setLiveLoad(3.0)}
                    />
                    <span className="ml-2">Commercial (3.0 kPa)</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Span (m)
                </label>
                <input
                  type="number"
                  className="input w-full"
                  min="1.0"
                  max="12.0"
                  step="0.1"
                  value={maxSpan}
                  onChange={(e) => setMaxSpan(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Example Calculation Results</h2>
            <p className="mb-4 text-sm text-gray-600">
              Based on a 90mm × 240mm MASSLAM SL33 joist with 450mm spacing.
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium mb-2">Maximum Spans</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Based on Strength:</p>
                  <p className="text-2xl font-bold">{exampleResults.strengthSpan} m</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Based on Deflection:</p>
                  <p className="text-2xl font-bold">{exampleResults.deflectionSpan} m</p>
                </div>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg ${exampleResults.limitingFactor === 'Strength' ? 'bg-orange-50' : 'bg-green-50'}`}>
              <h3 className="font-medium mb-2">Limiting Factor: {exampleResults.limitingFactor}</h3>
              <p className="text-3xl font-bold">{exampleResults.limitingSpan} m</p>
              <p className="text-sm mt-2">
                {exampleResults.limitingFactor === 'Strength' 
                  ? "The span is limited by the timber's strength capacity." 
                  : "The span is limited by the allowable deflection."}
              </p>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Total Design Load</h3>
              <p className="text-xl font-bold">{(deadLoad + liveLoad).toFixed(1)} kPa</p>
              <p className="text-sm mt-1">Dead Load: {deadLoad.toFixed(1)} kPa + Live Load: {liveLoad.toFixed(1)} kPa</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 