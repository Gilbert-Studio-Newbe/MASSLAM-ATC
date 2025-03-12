'use client';

import { useEffect } from 'react';
import TimberCalculator from '../../components/TimberCalculator';
import { calculateJoistSize } from '../../utils/timberEngineering';

export default function TimberCalculatorPage() {
  useEffect(() => {
    // Test the calculateJoistSize function
    try {
      console.log('Testing calculateJoistSize function from timber-calculator page...');
      const result = calculateJoistSize(5, 2, 'none');
      console.log('Test result:', result);
    } catch (error) {
      console.error('Error testing calculateJoistSize:', error);
    }
  }, []);

  return <TimberCalculator />;
} 