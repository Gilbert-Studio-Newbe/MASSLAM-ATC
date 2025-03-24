import React from 'react';
import styles from '../styles/TimberCalculator.module.css';
import { formatCurrency } from '../utils/costEstimator';

const ResultsDisplay = ({ results }) => {
  if (!results) return null;

  return (
    <div className={styles.resultsSection}>
      <h2 className={styles.sectionTitle}>Calculated Timber Sizes</h2>
      
      <div className={styles.formSection}>
        <h3>Joists</h3>
        <p>Size: {results.joists.width}mm × {results.joists.depth}mm</p>
        <p>Span: {results.joistSpan.toFixed(2)} m</p>
        <p>Quantity: {results.elementCounts.joists}</p>
      </div>
      
      <div className={styles.formSection}>
        <h3>Beams</h3>
        <p>Size: {results.beams.width}mm × {results.beams.depth}mm</p>
        <p>Span: {results.beams.span.toFixed(2)} m</p>
        <p>Quantity: {results.elementCounts.beams}</p>
      </div>
      
      <div className={styles.formSection}>
        <h3>Columns</h3>
        <p>Size: {results.columns.width}mm × {results.columns.depth}mm</p>
        <p>Height: {results.columns.height.toFixed(2)} m</p>
        <p>Quantity: {results.elementCounts.columns}</p>
      </div>
      
      <h2 className={styles.sectionTitle}>Material Estimates</h2>
      
      <div className={styles.formSection}>
        <h3>Timber Volume</h3>
        <p>Total Volume: {results.timberVolume.toFixed(2)} m³</p>
        <p>Total Weight: {results.timberWeight.toFixed(2)} kg</p>
        <p>Carbon Storage: {results.carbonStorage?.toFixed(2) || '0.00'} tonnes CO₂e</p>
        <p>Carbon Savings vs. Steel/Concrete: {results.carbonSavings?.toFixed(2) || '0.00'} tonnes CO₂e</p>
      </div>
      
      <h2 className={styles.sectionTitle}>Cost Estimates</h2>
      
      <div className={styles.formSection}>
        <h3>Cost Breakdown</h3>
        <table className={styles.resultsTable}>
          <thead>
            <tr>
              <th>Element</th>
              <th>Quantity</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Joists</td>
              <td>{results.elementCounts.joists}</td>
              <td>{formatCurrency(results.costs.joists)}</td>
            </tr>
            <tr>
              <td>Beams</td>
              <td>{results.elementCounts.beams}</td>
              <td>{formatCurrency(results.costs.beams)}</td>
            </tr>
            <tr>
              <td>Columns</td>
              <td>{results.elementCounts.columns}</td>
              <td>{formatCurrency(results.costs.columns)}</td>
            </tr>
            <tr>
              <td colSpan="2"><strong>Total Cost</strong></td>
              <td><strong>{formatCurrency(results.costs.total)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {results.validation && results.validation.messages && results.validation.messages.length > 0 && (
        <div className={styles.formSection}>
          <h3>Validation Notes</h3>
          <ul>
            {results.validation.messages.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="apple-results-body">
        {/* Member Sizes Section */}
        <div className="apple-card mb-8">
          <div className="apple-card-header">
            <h3 className="text-md font-semibold">Member Sizes</h3>
          </div>
          <div className="apple-card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Joists</h4>
                <div className="text-sm">
                  <p><span className="text-gray-500">Width:</span> <span ref={joistWidthRef} data-joist-width>{results.joistSize?.width || 'N/A'}mm</span></p>
                  <p><span className="text-gray-500">Depth:</span> <span ref={joistDepthRef} data-joist-depth>{results.joistSize?.depth || 'N/A'}mm</span></p>
                  {/* Add a debug section for joists */}
                  {results.joistSize && (
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                      <details>
                        <summary className="font-medium text-blue-600 cursor-pointer">Debug Info</summary>
                        <div className="mt-1 p-2 bg-gray-50 rounded">
                          <p><span className="font-medium">Span:</span> {results.joistSize.span}m</p>
                          <p><span className="font-medium">Spacing:</span> {results.joistSize.spacing}mm</p>
                          <p><span className="font-medium">Load:</span> {results.joistSize.load}kPa</p>
                          <p><span className="font-medium">Safety Factor:</span> {results.joistSize.safetyFactor || 1.5}</p>
                          <p><span className="font-medium">Deflection Limit:</span> L/{results.joistSize.deflectionLimit || 300}</p>
                          <p><span className="font-medium">Governing:</span> {results.joistSize.isDeflectionGoverning ? 'Deflection' : 'Bending'}</p>
                          <p><span className="font-medium">Required Depth:</span> {results.joistSize.fireAdjustedDepth}mm</p>
                          <p className="mt-1 text-gray-500">Note: 480mm depth is required when safety factor is 3.0 or load is 4.0kPa</p>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Continue with existing code for beams and columns... */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay; 