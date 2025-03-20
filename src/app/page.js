'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';
import { calculateJoistSize } from '../utils/timberEngineering';

export default function Home() {
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    // Test the calculateJoistSize function
    try {
      console.log('Testing calculateJoistSize function...');
      const result = calculateJoistSize(5, 2, 'none');
      console.log('Test result:', result);
      setTestResult(result);
    } catch (error) {
      console.error('Error testing calculateJoistSize:', error);
      setTestResult({ error: error.message });
    }
  }, []);

  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>ATC by ASH</h1>
          <p className={styles.subtitle}>Advanced Timber Calculator</p>
          <p className={styles.description}>
            A parametric design tool for timber structures using MASSLAM sections
          </p>
          <div className={styles.buttonContainer}>
            <Link href="/timber-calculator" className={styles.primaryButton}>
              Start Designing
            </Link>
            <Link href="/masslam-sizes" className={styles.secondaryButton}>
              View MASSLAM Sizes
            </Link>
            <Link href="/calculation-methodology" className={styles.secondaryButton}>
              Calculation Methodology
            </Link>
          </div>
        </div>
        <div className={styles.heroImage}>
          <Image
            src="/images/timber-structure.jpg"
            alt="Timber structure"
            width={600}
            height={400}
            priority
            className={styles.image}
          />
        </div>
      </div>

      {testResult && (
        <div className={styles.testResult}>
          <h3>Test Result:</h3>
          <pre>{JSON.stringify(testResult, null, 2)}</pre>
        </div>
      )}

      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Features</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <h3>Parametric Design</h3>
            <p>
              Quickly iterate through different structural configurations and see results in real-time.
            </p>
          </div>
          <div className={styles.featureCard}>
            <h3>MASSLAM Integration</h3>
            <p>
              Designed specifically for ASH's MASSLAM engineered timber products.
            </p>
          </div>
          <div className={styles.featureCard}>
            <h3>Cost Estimation</h3>
            <p>
              Get preliminary cost estimates for your timber structure design.
            </p>
          </div>
          <div className={styles.featureCard}>
            <h3>Carbon Calculation</h3>
            <p>
              Understand the environmental impact and carbon storage of your design.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.about}>
        <h2 className={styles.sectionTitle}>About MASSLAM</h2>
        <p>
          MASSLAM is a range of engineered timber products manufactured by ASH (Australian Sustainable Hardwoods).
          Made from sustainably sourced Victorian hardwood, MASSLAM offers exceptional strength, durability, and fire resistance.
        </p>
        <p>
          Learn more about <a href="https://ash.com.au/masslam/" target="_blank" rel="noopener noreferrer">MASSLAM</a>.
        </p>
      </section>
    </main>
  );
} 