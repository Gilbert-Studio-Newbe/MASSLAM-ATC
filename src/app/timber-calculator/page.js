'use client';

import { useEffect } from 'react';
import TimberCalculator from '../../components/TimberCalculator';
import { calculateJoistSize } from '../../utils/calculations/joist-calculator';

export default function TimberCalculatorPage() {
  useEffect(() => {
    // Test the calculateJoistSize function
    try {
      console.log('Testing calculateJoistSize function from timber-calculator page...');
      const result = calculateJoistSize(9000, 600, 2.0, 2.0, []);
      console.log('Test result:', result);
      
      // Auto-click the Calculate button after a short delay
      setTimeout(() => {
        const calculateButton = document.querySelector('.apple-button.apple-button-primary');
        if (calculateButton) {
          console.log('Auto-triggering calculation...');
          calculateButton.click();
        }
      }, 1000);
    } catch (error) {
      console.error('Error testing calculateJoistSize:', error);
    }
  }, []);

  return <TimberCalculator />;
} 