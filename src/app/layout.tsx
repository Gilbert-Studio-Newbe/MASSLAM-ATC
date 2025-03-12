import "./tailwind-base.css";
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
        <link rel="stylesheet" href="/styles/main.css" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
        <style dangerouslySetInnerHTML={{ __html: `
          /* Critical CSS to ensure basic styling works even if external CSS fails */
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f7;
            color: #1d1d1f;
            margin: 0;
            padding: 0;
          }
          .apple-container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
          }
          @media (min-width: 768px) {
            .apple-container {
              padding: 0 2rem;
            }
          }
          .apple-header {
            background-color: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            position: sticky;
            top: 0;
            z-index: 100;
            padding: 1rem 0;
            border-bottom: 1px solid #d2d2d7;
          }
          .apple-nav {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
          }
          .apple-nav-list {
            display: flex;
            flex-direction: row;
            align-items: center;
            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;
          }
          .apple-nav-link {
            color: #1d1d1f;
            text-decoration: none;
            margin: 0 0.75rem;
            padding: 0.5rem 0;
            display: block;
          }
          .mobile-menu-button {
            display: none;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.5rem;
          }
          @media (max-width: 768px) {
            .mobile-menu-button {
              display: block;
            }
            .mobile-nav {
              display: none;
              width: 100%;
              padding-top: 1rem;
            }
            .mobile-nav.active {
              display: block;
              animation: slideDown 0.3s ease-out;
            }
            .apple-nav-list {
              flex-direction: column;
              align-items: flex-start;
            }
            .apple-nav-link {
              width: 100%;
              padding: 0.75rem 0;
              border-bottom: 1px solid #f2f2f2;
            }
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          }
        ` }} />
      </head>
      <body> 
        <div className="min-h-screen" style={{ backgroundColor: 'var(--apple-bg)' }}> 
          <header className="apple-header"> 
            <div className="apple-container"> 
              <div className="apple-nav">
                <div className="flex items-center justify-between w-full"> 
                  <h1 className="text-xl md:text-2xl font-semibold" style={{ color: 'var(--apple-text)' }}> 
                    ATC by ASH 
                  </h1>
                  <button className="mobile-menu-button" aria-label="Toggle menu" id="mobile-menu-toggle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="12" x2="21" y2="12"></line>
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                      <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                  </button>
                </div> 
                <nav className="mobile-nav w-full" id="mobile-nav"> 
                  <ul className="apple-nav-list w-full"> 
                    <li className="w-full md:w-auto"> 
                      <Link href="/" className="apple-nav-link">Member Calculator</Link> 
                    </li>
                    <li className="w-full md:w-auto"> 
                      <Link href="/carbon-calculator" className="apple-nav-link">Carbon Calculator</Link> 
                    </li>
                    <li className="w-full md:w-auto"> 
                      <Link href="/saved-projects" className="apple-nav-link">Saved Projects</Link> 
                    </li>
                    <li className="w-full md:w-auto"> 
                      <Link href="/masslam-sizes" className="apple-nav-link">MASSLAM Sizes</Link> 
                    </li>
                    <li className="w-full md:w-auto"> 
                      <Link href="/timber-rates" className="apple-nav-link">Timber Rates</Link> 
                    </li>
                    <li className="w-full md:w-auto"> 
                      <Link href="/calculation-methodology" className="apple-nav-link">Calculation Methodology</Link> 
                    </li>
                    <li className="w-full md:w-auto"> 
                      <Link href="/fire-resistance" className="apple-nav-link">Fire Resistance</Link> 
                    </li> 
                    <li className="w-full md:w-auto"> 
                      <Link href="#" className="apple-nav-link">About</Link> 
                    </li> 
                  </ul> 
                </nav> 
              </div>
            </div> 
          </header> 
          <main className="apple-container py-4 md:py-8"> 
            {children}
          </main>
          <footer className="apple-footer py-4 mt-8 border-t border-gray-200"> 
            <div className="apple-container text-center text-sm text-gray-600"> 
              <p> 
                ATC by ASH - Parametric Design Tool 
              </p> 
            </div> 
          </footer> 
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('DOMContentLoaded', function() {
            const menuButton = document.getElementById('mobile-menu-toggle');
            const mobileNav = document.getElementById('mobile-nav');
            
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
