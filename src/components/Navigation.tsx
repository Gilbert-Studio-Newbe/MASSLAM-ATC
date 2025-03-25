"use client";

import { useState } from 'react';
import Link from 'next/link';
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
                <Link 
                  href="/" 
                  className="text-2xl font-bold text-masslam"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/";
                  }}
                >
                  MASSL<span className="text-accent">A</span>M
                </Link>
              </div>
              <div className="hidden lg:ml-6 lg:flex lg:space-x-8">
                <Link 
                  href="/timber-calculator" 
                  className="px-3 py-2 text-sm font-medium text-masslam hover:text-accent"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/timber-calculator";
                  }}
                >
                  Member Calculator
                </Link>
                <Link 
                  href="/timber-calculator/debug" 
                  className="px-3 py-2 text-sm font-medium text-masslam hover:text-accent"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/timber-calculator/debug";
                  }}
                >
                  Calculator Debug
                </Link>
                <Link 
                  href="/span-tables" 
                  className="px-3 py-2 text-sm font-medium text-masslam hover:text-accent"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/span-tables";
                  }}
                >
                  Span Tables
                </Link>
                <Link 
                  href="/carbon-calculator" 
                  className="px-3 py-2 text-sm font-medium text-masslam hover:text-accent"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/carbon-calculator";
                  }}
                >
                  Carbon Calculator
                </Link>
                <Link 
                  href="/saved-projects" 
                  className="px-3 py-2 text-sm font-medium text-masslam hover:text-accent"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/saved-projects";
                  }}
                >
                  Saved Projects
                </Link>
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
                <Link 
                  href="/" 
                  className="relative inline-flex items-center gap-x-1.5 rounded-md bg-masslam px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/";
                  }}
                >
                  Home
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile menu, show/hide based on menu state */}
        {mobileMenuOpen && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/timber-calculator"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/timber-calculator";
                }}
              >
                Member Calculator
              </Link>
              <Link
                href="/timber-calculator/debug"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/timber-calculator/debug";
                }}
              >
                Calculator Debug
              </Link>
              <Link
                href="/span-tables"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/span-tables";
                }}
              >
                Span Tables
              </Link>
              <Link
                href="/carbon-calculator"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/carbon-calculator";
                }}
              >
                Carbon Calculator
              </Link>
              <Link
                href="/saved-projects"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/saved-projects";
                }}
              >
                Saved Projects
              </Link>
              <Link
                href="/masslam-sizes"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/masslam-sizes";
                }}
              >
                MASSLAM Sizes
              </Link>
              <Link
                href="/timber-rates"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/timber-rates";
                }}
              >
                Timber Rates
              </Link>
              <Link
                href="/calculation-methodology"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/calculation-methodology";
                }}
              >
                Calculation Methodology
              </Link>
              <Link
                href="/fire-resistance"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/fire-resistance";
                }}
              >
                Fire Resistance
              </Link>
              <Link
                href="/3d-visualization"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/3d-visualization";
                }}
              >
                3D Visualization
              </Link>
              <Link
                href="/"
                className="block px-3 py-2 rounded-md text-base font-medium text-masslam hover:text-accent"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/";
                }}
              >
                Home
              </Link>
            </div>
          </div>
        )}
      </div> 
    </header>
  );
} 