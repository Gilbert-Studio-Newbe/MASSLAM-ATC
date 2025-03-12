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
    </div>
  );
};

export default ResultsDisplay; 