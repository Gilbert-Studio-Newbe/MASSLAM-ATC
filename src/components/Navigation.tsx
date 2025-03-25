"use client";

import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="apple-header shadow-lg"> 
      <div className="apple-container"> 
        <div className="apple-nav">
          <div className="relative flex items-center justify-between h-16">
            <div className="flex items-center px-2 lg:px-0">
              <div className="flex-shrink-0">
                <a 
                  href="/" 
                  className="text-2xl font-bold text-masslam"
                >
                  MASSL<span className="text-accent">A</span>M
                </a>
              </div>
              <div className="hidden lg:ml-6 lg:flex lg:space-x-8">
                <a 
                  href="/timber-calculator" 
                  className="px-3 py-2 text-sm font-medium text-masslam hover:text-accent"
                >
                  Member Calculator
                </a>
                <a 
                  href="/timber-calculator/debug" 
                  className="px-3 py-2 text-sm font-medium text-masslam hover:text-accent"
                >
                  Calculator Debug
                </a>
                <a 
                  href="/span-tables" 
                  className="px-3 py-2 text-sm font-medium text-masslam hover:text-accent"
                >
                  Span Tables
                </a>
                <a 
                  href="/carbon-calculator" 
                  className="px-3 py-2 text-sm font-medium text-masslam hover:text-accent"
                >
                  Carbon Calculator
                </a>
                <a 
                  href="/saved-projects" 
                  className="px-3 py-2 text-sm font-medium text-masslam hover:text-accent"
                >
                  Saved Projects
                </a>
                <a 
                  href="/timber-rates" 
                  className="px-3 py-2 text-sm font-medium text-masslam hover:text-accent"
                >
                  Timber Rates
                </a>
              </div>
            </div>
            <div className="flex lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-masslam hover:text-accent focus:outline-none"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
            <div className="hidden lg:ml-4 lg:flex lg:items-center">
              <div className="flex-shrink-0">
                <a 
                  href="/" 
                  className="relative inline-flex items-center gap-x-1.5 rounded-md bg-masslam px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                >
                  Home
                </a>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile menu, show/hide based on menu state */}
        {mobileMenuOpen && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a
                href="/timber-calculator"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
              >
                Member Calculator
              </a>
              <a
                href="/timber-calculator/debug"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
              >
                Calculator Debug
              </a>
              <a
                href="/span-tables"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
              >
                Span Tables
              </a>
              <a
                href="/carbon-calculator"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
              >
                Carbon Calculator
              </a>
              <a
                href="/saved-projects"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
              >
                Saved Projects
              </a>
              <a
                href="/masslam-sizes"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
              >
                MASSLAM Sizes
              </a>
              <a
                href="/timber-rates"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
              >
                Timber Rates
              </a>
              <a
                href="/calculation-methodology"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
              >
                Calculation Methodology
              </a>
              <a
                href="/fire-resistance"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
              >
                Fire Resistance
              </a>
              <a
                href="/3d-visualization"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
              >
                3D Visualization
              </a>
              <a
                href="/"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
              >
                Home
              </a>
            </div>
          </div>
        )}
      </div> 
    </header>
  );
} 