'use client';

import { useEffect } from 'react';
import { useBuildingData } from '@/contexts/BuildingDataContext';

interface DataLoaderProps {
  children: React.ReactNode;
}

export default function DataLoader({ children }: DataLoaderProps) {
  const { buildingData } = useBuildingData();

  useEffect(() => {
    // Initialize any required data here
    console.log('DataLoader: Initializing application data');
  }, []);

  return <>{children}</>;
} 