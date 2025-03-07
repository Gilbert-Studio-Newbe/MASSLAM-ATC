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
  filterToStandardSizes
} from '@/utils/timberSizes';
import styles from './MasslamSizes.module.css';

export default function MasslamSizesPage() {
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    console.log('MasslamSizesPage: Component mounted');
    
    // Initialize the MASSLAM sizes module
    console.log('Initializing MASSLAM sizes module from MasslamSizesPage');
    initializeMasslamSizes();
    
    // Log the current state of MASSLAM sizes
    console.log('Initial MASSLAM sizes:', getMasslamSizes());
    
    loadSizesFromCSV();
  }, []);

  const loadSizesFromCSV = async () => {
    try {
      setLoading(true);
      
      console.log('Loading MASSLAM sizes from MasslamSizesPage');
      const loadedSizes = await loadMasslamSizes();
      console.log(`Loaded ${loadedSizes.length} sizes from CSV`);
      
      // Filter to standard sizes
      console.log('Filtering to standard sizes');
      const standardSizes = filterToStandardSizes();
      console.log(`Filtered to ${standardSizes.length} standard sizes`);
      
      // Get all sizes using the getter function
      const allSizes = getAllMasslamSizes();
      setSizes(allSizes);
      
      // Verify the loaded sizes
      const verified = verifyLoadedSizes();
      setVerificationResult(verified);
      console.log('Verification result:', verified);
      
      // Debug the loaded sizes
      debugMasslamSizes();
      
      // Fetch the raw CSV content for debugging
      const response = await fetch('/data/masslam_sizes.csv');
      const csvText = await response.text();
      console.log('Raw CSV content length:', csvText.length);
      console.log('CSV data lines:', csvText.trim().split('\n').length - 1); // Exclude header
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading MASSLAM sizes:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadStatus({ status: 'uploading', message: 'Uploading CSV file...' });
      
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);
      
      // Send the file to the server
      const response = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload CSV file');
      }
      
      const data = await response.json();
      
      // Reset the module and reload the sizes
      initializeMasslamSizes();
      await loadSizesFromCSV();
      
      setUploadStatus({ 
        status: 'success', 
        message: `CSV file uploaded successfully. ${data.message || ''}` 
      });
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading CSV file:', err);
      setUploadStatus({ 
        status: 'error', 
        message: `Error uploading CSV file: ${err.message}` 
      });
    }
  };

  // Group sizes by type
  const sizesByType = sizes.reduce((acc, size) => {
    acc[size.type] = acc[size.type] || [];
    acc[size.type].push(size);
    return acc;
  }, {});

  return (
    <div className={styles.container}>
      <div className={styles.navigation}>
        <Link href="/" className={styles.navLink}>
          &larr; Back to Calculator
        </Link>
      </div>
      
      <h1>MASSLAM Timber Sizes</h1>
      
      {loading && <p className={styles.loading}>Loading sizes...</p>}
      
      {error && (
        <div className={styles.error}>
          <h2>Error Loading Sizes</h2>
          <p>{error}</p>
        </div>
      )}
      
      {/* File Upload Section */}
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
            onChange={handleFileUpload} 
            ref={fileInputRef}
            className={styles.fileInput}
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className={styles.button}
          >
            Select CSV File
          </button>
        </div>
        
        {uploadStatus && (
          <div className={`${styles.uploadStatus} ${styles[uploadStatus.status]}`}>
            <p>{uploadStatus.message}</p>
          </div>
        )}
        
        <div className={styles.actions}>
          <button 
            onClick={() => {
              initializeMasslamSizes();
              loadSizesFromCSV();
            }} 
            className={styles.button}
          >
            Reload Sizes
          </button>
          <button 
            onClick={() => debugMasslamSizes()} 
            className={styles.button}
          >
            Debug Sizes
          </button>
        </div>
      </div>
      
      {verificationResult === false && (
        <div className={styles.warning}>
          <h2>⚠️ Verification Warning</h2>
          <p>
            The loaded sizes do not match the expected validation criteria.
            This may indicate an issue with the CSV file or the loading process.
          </p>
          <p>
            <strong>Current CSV Summary:</strong>
          </p>
          <ul>
            <li>Total sizes: {sizes.length}</li>
            <li>Types: {Object.keys(sizesByType).join(', ')}</li>
            <li>Widths: {[...new Set(sizes.map(s => s.width))].sort((a, b) => a - b).join(', ')}</li>
            <li>Depths: {[...new Set(sizes.map(s => s.depth))].sort((a, b) => a - b).join(', ')}</li>
          </ul>
          <div className={styles.actions}>
            <button 
              onClick={() => {
                initializeMasslamSizes();
                loadSizesFromCSV();
              }} 
              className={styles.button}
            >
              Reload Sizes
            </button>
            <button 
              onClick={() => debugMasslamSizes()} 
              className={styles.button}
            >
              Debug Sizes
            </button>
          </div>
        </div>
      )}
      
      {verificationResult === true && (
        <div className={styles.success}>
          <h2>✅ Verification Successful</h2>
          <p>
            The loaded sizes meet all validation criteria.
          </p>
          <p>
            <strong>Current CSV Summary:</strong>
          </p>
          <ul>
            <li>Total sizes: {sizes.length}</li>
            <li>Types: {Object.keys(sizesByType).join(', ')}</li>
            <li>Widths: {[...new Set(sizes.map(s => s.width))].sort((a, b) => a - b).join(', ')}</li>
            <li>Depths: {[...new Set(sizes.map(s => s.depth))].sort((a, b) => a - b).join(', ')}</li>
          </ul>
        </div>
      )}
      
      <div className={styles.summary}>
        <h2>Summary</h2>
        <p>Total sizes: {sizes.length}</p>
        <p>Types: {Object.keys(sizesByType).join(', ')}</p>
        <p>Widths: {[...new Set(sizes.map(s => s.width))].sort((a, b) => a - b).join(', ')}</p>
        <p>Depths: {[...new Set(sizes.map(s => s.depth))].sort((a, b) => a - b).join(', ')}</p>
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