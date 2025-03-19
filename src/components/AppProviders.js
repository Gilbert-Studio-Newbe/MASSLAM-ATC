"use client";

import { BuildingDataProvider } from "../contexts/BuildingDataContext";

/**
 * Provides all context providers to the application
 */
export default function AppProviders({ children }) {
  return (
    <BuildingDataProvider>
      {children}
    </BuildingDataProvider>
  );
} 