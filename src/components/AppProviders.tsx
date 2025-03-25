'use client';

import { BuildingDataProvider } from "@/contexts/BuildingDataContext";
import { FireResistanceProvider } from "@/contexts/FireResistanceContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import DataLoader from "./DataLoader";

interface AppProvidersProps {
  children: React.ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
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