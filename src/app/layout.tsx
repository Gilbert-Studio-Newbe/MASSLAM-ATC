import "./globals.css";
import { ReactNode } from 'react';

export const metadata = { 
  title: "MASSLAM ATC by ASH", 
  description: "Parametric design tool for timber structures using MASSLAM sections" 
};

export default function RootLayout({ children }: { children: ReactNode }) { 
  return ( 
    <html lang="en"> 
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      </head>
      <body> 
        <div className="min-h-screen bg-gray-100"> 
          <header className="bg-white shadow"> 
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center"> 
              <div className="flex items-center"> 
                <h1 className="text-2xl font-bold text-gray-900"> 
                  MASSLAM ATC by ASH 
                </h1> 
              </div> 
              <nav> 
                <ul className="flex space-x-4"> 
                  <li> 
                    <a href="/" className="text-gray-600 hover:text-gray-900">Member Calculator</a> 
                  </li>
                  <li> 
                    <a href="/saved-projects" className="text-gray-600 hover:text-gray-900">Saved Projects</a> 
                  </li>
                  <li> 
                    <a href="/masslam-sizes" className="text-gray-600 hover:text-gray-900">MASSLAM Sizes</a> 
                  </li>
                  <li> 
                    <a href="/calculation-methodology" className="text-gray-600 hover:text-gray-900">Calculation Methodology</a> 
                  </li>
                  <li> 
                    <a href="#" className="text-gray-600 hover:text-gray-900">Documentation</a> 
                  </li> 
                  <li> 
                    <a href="#" className="text-gray-600 hover:text-gray-900">About</a> 
                  </li> 
                </ul> 
              </nav> 
            </div> 
          </header> 
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8"> 
            {children} 
          </main> 
          <footer className="bg-white shadow-inner mt-10"> 
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8"> 
              <p className="text-center text-gray-600"> 
                MASSLAM ATC by ASH - Parametric Design Tool 
              </p> 
            </div> 
          </footer> 
        </div> 
      </body> 
    </html> 
  ); 
}
