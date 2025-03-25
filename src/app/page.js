'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { calculateJoistSize } from '../utils/calculations/joist-calculator';
import TimberCalculator from '../components/TimberCalculator';

export default function Home() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <TimberCalculator />
    </div>
  );
} 