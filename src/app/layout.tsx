import "../../styles/globals.css";
import "../../styles/apple-inspired.css";
import { ReactNode } from 'react';
import Link from 'next/link';

export const metadata = { 
  title: "ATC by ASH", 
  description: "Parametric design tool for timber structures using MASSLAM sections"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
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
            <div className="apple-container"> 
              <div className="apple-nav">
                <div className="flex items-center justify-between w-full"> 
                  <h1 className="text-2xl font-semibold" style={{ color: 'var(--apple-text)' }}> 
                    ATC by ASH 
                  </h1>
                  <button className="mobile-menu-button" aria-label="Toggle menu">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="12" x2="21" y2="12"></line>
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                      <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                  </button>
                </div> 
                <nav className="mobile-nav w-full"> 
                  <ul className="apple-nav-list w-full"> 
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
                      <Link href="/timber-rates" className="apple-nav-link">Timber Rates</Link> 
                    </li>
                    <li> 
                      <Link href="/calculation-methodology" className="apple-nav-link">Calculation Methodology</Link> 
                    </li>
                    <li> 
                      <Link href="/fire-resistance" className="apple-nav-link">Fire Resistance</Link> 
                    </li> 
                    <li> 
                      <Link href="#" className="apple-nav-link">About</Link> 
                    </li> 
                  </ul> 
                </nav> 
              </div>
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
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('DOMContentLoaded', function() {
            const menuButton = document.querySelector('.mobile-menu-button');
            const mobileNav = document.querySelector('.mobile-nav');
            
            if (menuButton && mobileNav) {
              menuButton.addEventListener('click', function() {
                mobileNav.classList.toggle('active');
              });
            }
          });
        `}} />
      </body> 
    </html> 
  ); 
}
