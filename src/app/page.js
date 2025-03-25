'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';
import { calculateJoistSize } from '../utils/calculations/joist-calculator';
import TimberCalculator from '../components/TimberCalculator';

export default function Home() {
  const [testResult, setTestResult] = useState(null);

  // Test the function
  useEffect(() => {
    try {
      const result = calculateJoistSize(9000, 600, 2.0, 2.0, []);
      console.log("Joist size calculation test result:", result);
      setTestResult(result);
    } catch (error) {
      console.error("Error testing joist calculation:", error);
    }
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>ATC by ASH</h1>
          <p className={styles.subtitle}>Advanced Timber Calculator</p>
          <p className={styles.description}>
            A parametric design tool for timber structures using MASSLAM sections
          </p>
          <div className={styles.buttonContainer}>
            <a 
              href="/timber-calculator" 
              className={styles.primaryButton}
            >
              Start Designing
            </a>
            <a 
              href="/masslam-sizes" 
              className={styles.secondaryButton}
            >
              View MASSLAM Sizes
            </a>
            <a 
              href="/calculation-methodology" 
              className={styles.secondaryButton}
            >
              Calculation Methodology
            </a>
          </div>
        </div>
        <div className={styles.heroImage}>
          <div className={styles.image} style={{
            width: '600px',
            height: '400px',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px'
          }}>
            Timber Structure Image
          </div>
        </div>
      </div>

      {testResult && (
        <div className={styles.testResult}>
          <h3>Test Result:</h3>
          <pre>{JSON.stringify(testResult, null, 2)}</pre>
        </div>
      )}

      <div className={styles.features}>
        <h2 className={styles.sectionTitle}>Features</h2>
        <div className={styles.featureGrid}>
          <div className={styles.feature}>
            <h3>Parametric Design</h3>
            <p>Quickly explore different structural configurations with real-time feedback.</p>
          </div>
          <div className={styles.feature}>
            <h3>Precision Calculations</h3>
            <p>Accurate sizing of joists, beams and columns according to AS1720.</p>
          </div>
          <div className={styles.feature}>
            <h3>MASSLAM Sections</h3>
            <p>Utilize the complete range of ASH's MASSLAM glulam products.</p>
          </div>
          <div className={styles.feature}>
            <h3>Carbon Calculations</h3>
            <p>Estimate the carbon stored in your timber structure design.</p>
          </div>
        </div>
      </div>

      <div className={styles.aboutSection}>
        <h2 className={styles.sectionTitle}>About MASSLAM</h2>
        <p className={styles.aboutText}>
          MASSLAM is a range of GL17 and GL21 glue laminated timber products manufactured by Australian Sustainable Hardwoods (ASH). Made from Victorian Hardwoods, MASSLAM products offer superior strength, stiffness, and fire resistance compared to traditional softwood alternatives.
        </p>
        <div className={styles.ctaContainer}>
          <a href="https://www.ash.com.au/masslam/" className={styles.ctaButton} target="_blank" rel="noopener noreferrer">
            Learn More About MASSLAM
          </a>
        </div>
      </div>
    </div>
  );
} 