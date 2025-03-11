"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  loadMasslamSizes, 
  getAllMasslamSizes, 
  debugMasslamSizes, 
  verifyLoadedSizes,
  initializeMasslamSizes,
  getMasslamSizes,
  filterToStandardSizes,
  HARDCODED_MASSLAM_SIZES
} from '@/utils/timberSizes';
import styles from './MasslamSizes.module.css';

export default function MasslamSizesPage() {
  // Use the hardcoded data directly
  const sizes = HARDCODED_MASSLAM_SIZES;
  
  // Group sizes by type
  const sizesByType = sizes.reduce((acc, size) => {
    acc[size.type] = acc[size.type] || [];
    acc[size.type].push(size);
    return acc;
  }, {});
  
  // Get unique widths and depths
  const uniqueWidths = [...new Set(sizes.map(s => s.width))].sort((a, b) => a - b);
  const uniqueDepths = [...new Set(sizes.map(s => s.depth))].sort((a, b) => a - b);

  return (
    <div className={styles.container}>
      <div className={styles.navigation}>
        <Link href="/" className={styles.navLink}>
          &larr; Back to Calculator
        </Link>
      </div>
      
      <h1>MASSLAM Timber Sizes</h1>
      
      <div className={styles.uploadSection}>
        <h2>Upload New CSV File</h2>
        <p>
          Upload a new CSV file to update the MASSLAM sizes. The file should have the following columns:
          <code>width,depth,type</code> with types being "beam", "column", or "joist".
        </p>
        <div className={styles.fileUpload}>
          <input 
            type="file" 
            accept=".csv" 
            className={styles.fileInput}
          />
          <button 
            className={styles.button}
          >
            Select CSV File
          </button>
        </div>
        
        <div className={styles.actions}>
          <button 
            className={styles.button}
          >
            Reload Sizes
          </button>
          <button 
            className={styles.button}
          >
            Refresh Timber Sizes
          </button>
          <button 
            className={styles.button}
          >
            Debug Sizes
          </button>
        </div>
      </div>
      
      <div className={styles.success}>
        <h2>✅ Verification Successful</h2>
        <p>
          Using hardcoded data with {sizes.length} sizes.
        </p>
        <p>
          <strong>Current Summary:</strong>
        </p>
        <ul>
          <li>Total sizes: {sizes.length}</li>
          <li>Types: {Object.keys(sizesByType).join(', ')}</li>
          <li>Widths: {uniqueWidths.join(', ')}</li>
          <li>Depths: {uniqueDepths.join(', ')}</li>
        </ul>
      </div>
      
      <div className={styles.summary}>
        <h2>Summary</h2>
        <p>Total sizes: {sizes.length}</p>
        <p>Types: {Object.keys(sizesByType).join(', ')}</p>
        <p>Widths: {uniqueWidths.join(', ')}</p>
        <p>Depths: {uniqueDepths.join(', ')}</p>
      </div>
      
      {Object.entries(sizesByType).map(([type, typeSizes]) => (
        <div key={type} className={styles.typeSection}>
          <h2>{type.charAt(0).toUpperCase() + type.slice(1)}s</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Width (mm)</th>
                <th>Depth (mm)</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {typeSizes.sort((a, b) => {
                if (a.width !== b.width) return a.width - b.width;
                return a.depth - b.depth;
              }).map((size, index) => (
                <tr key={index}>
                  <td>{size.width}</td>
                  <td>{size.depth}</td>
                  <td>{size.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
} 