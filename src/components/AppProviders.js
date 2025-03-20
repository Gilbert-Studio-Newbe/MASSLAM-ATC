"use client";

import { BuildingDataProvider } from "../contexts/BuildingDataContext";
import DataLoader from "./DataLoader";

/**
 * Provides all context providers to the application
 */
export default function AppProviders({ children }) {
  return (
    <BuildingDataProvider>
      <DataLoader>
        {children}
      </DataLoader>
    </BuildingDataProvider>
  );
} 