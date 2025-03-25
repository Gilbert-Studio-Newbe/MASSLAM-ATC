'use client';

import { useEffect } from 'react';
import TimberCalculator from '@/components/TimberCalculator';

export default function CalculatorPage() {
  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-[40px]">
        <h1 className="page-title text-display">Member Calculator</h1>
        <p className="text-descriptive text-[#666666] max-w-2xl">
          Design and optimize timber members for your building structure. Input your requirements and get instant sizing and cost estimates.
        </p>
      </div>
      <TimberCalculator />
    </div>
  );
} 