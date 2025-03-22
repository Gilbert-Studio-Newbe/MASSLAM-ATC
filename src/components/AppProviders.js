"use client";

import { BuildingDataProvider } from "../contexts/BuildingDataContext";
import { FireResistanceProvider } from "../contexts/FireResistanceContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import DataLoader from "./DataLoader";

/**
 * Provides all context providers to the application
 */
export default function AppProviders({ children }) {
  return (
    <NotificationProvider>
      <BuildingDataProvider>
        <FireResistanceProvider>
          <DataLoader>
            {children}
          </DataLoader>
        </FireResistanceProvider>
      </BuildingDataProvider>
    </NotificationProvider>
  );
} 