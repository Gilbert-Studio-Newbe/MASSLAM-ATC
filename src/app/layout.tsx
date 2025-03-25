import './globals.css';
import { Inter } from 'next/font/google';
import { BuildingDataProvider } from '../contexts/BuildingDataContext';
import { FireResistanceProvider } from '../contexts/FireResistanceContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import Navigation from '../components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'MASSLAM Timber Structure Calculator',
  description: 'Design a multi-level timber building with MASSLAM engineered timber',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <BuildingDataProvider>
          <NotificationProvider>
            <FireResistanceProvider>
              <Navigation />
              <main className="apple-container py-4 md:py-8">
                {children}
              </main>
              <footer className="apple-footer py-4 mt-8 border-t border-gray-200">
                <div className="apple-container text-center text-sm text-gray-600">
                  <p>ATC by ASH - Parametric Design Tool</p>
                </div>
              </footer>
            </FireResistanceProvider>
          </NotificationProvider>
        </BuildingDataProvider>
      </body>
    </html>
  );
}
