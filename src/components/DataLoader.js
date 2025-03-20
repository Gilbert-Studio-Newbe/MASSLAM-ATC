'use client';

import { useEffect, useState } from 'react';
import { loadMasslamSizes } from '../utils/timberSizes';
import { loadTimberProperties } from '../utils/timberEngineering';
import { loadML38MechanicalProperties } from '../utils/masslamProperties';

export default function DataLoader({ children }) {
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    // Only load data on the client side
    const loadAll = async () => {
      try {
        // Load data in parallel
        await Promise.all([
          loadMasslamSizes(),
          loadTimberProperties(),
          loadML38MechanicalProperties()
        ]);
        
        console.log('All data loaded successfully');
        setDataLoaded(true);
      } catch (error) {
        console.error('Error loading data:', error);
        // Still set to true so the app can proceed with default values
        setDataLoaded(true);
      }
    };

    loadAll();
  }, []);

  return children;
} 