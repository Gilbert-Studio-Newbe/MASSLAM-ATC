import "./globals.css";
import { ReactNode } from 'react';
import Link from 'next/link';

export const metadata = { 
  title: "ATC by ASH", 
  description: "Parametric design tool for timber structures using MASSLAM sections" 
};

export default function RootLayout({ children }: { children: ReactNode }) { 
  return ( 
    <html lang="en"> 
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      </head>
      <body> 
        <div className="min-h-screen" style={{ backgroundColor: 'var(--apple-bg)' }}> 
          <header className="apple-header"> 
            <div className="apple-container apple-nav"> 
              <div className="flex items-center"> 
                <h1 className="text-2xl font-semibold" style={{ color: 'var(--apple-text)' }}> 
                  ATC by ASH 
                </h1> 
              </div> 
              <nav> 
                <ul className="apple-nav-list"> 
                  <li> 
                    <Link href="/" className="apple-nav-link">Member Calculator</Link> 
                  </li>
                  <li> 
                    <Link href="/saved-projects" className="apple-nav-link">Saved Projects</Link> 
                  </li>
                  <li> 
                    <Link href="/masslam-sizes" className="apple-nav-link">MASSLAM Sizes</Link> 
                  </li>
                  <li> 
                    <Link href="/calculation-methodology" className="apple-nav-link">Calculation Methodology</Link> 
                  </li>
                  <li> 
                    <Link href="#" className="apple-nav-link">Documentation</Link> 
                  </li> 
                  <li> 
                    <Link href="#" className="apple-nav-link">About</Link> 
                  </li> 
                </ul> 
              </nav> 
            </div> 
          </header> 
          <main className="apple-container py-8"> 
            {children} 
          </main> 
          <footer className="apple-footer"> 
            <div className="apple-container"> 
              <p> 
                ATC by ASH - Parametric Design Tool 
              </p> 
            </div> 
          </footer> 
        </div> 
      </body> 
    </html> 
  ); 
}
