"use client";

import { BuildingDataProvider } from "../contexts/BuildingDataContext";
import { FireResistanceProvider } from "../contexts/FireResistanceContext";
import DataLoader from "./DataLoader";

/**
 * Provides all context providers to the application
 */
export default function AppProviders({ children }) {
  return (
    <BuildingDataProvider>
      <FireResistanceProvider>
        <DataLoader>
          {children}
        </DataLoader>
      </FireResistanceProvider>
    </BuildingDataProvider>
  );
} 