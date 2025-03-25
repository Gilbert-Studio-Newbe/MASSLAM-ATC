"use client";

import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="border-b border-[#EEEEEE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-[18px] font-semibold text-black px-5 py-4"
              style={{ fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              ATC by ASH
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center">
            <nav className="flex space-x-5">
              <Link 
                href="/calculator"
                className={`px-5 py-3 text-[14px] font-medium transition-colors ${
                  pathname === '/calculator' ? 'text-black' : 'text-[#333333] hover:text-black'
                }`}
              >
                Calculator
              </Link>
              <Link 
                href="/masslam-sizes"
                className={`px-5 py-3 text-[14px] font-medium transition-colors ${
                  pathname === '/masslam-sizes' ? 'text-black' : 'text-[#333333] hover:text-black'
                }`}
              >
                Masslam Sizes
              </Link>
              <Link 
                href="/about"
                className={`px-5 py-3 text-[14px] font-medium transition-colors ${
                  pathname === '/about' ? 'text-black' : 'text-[#333333] hover:text-black'
                }`}
              >
                About
              </Link>
            </nav>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-[#333333] hover:text-black focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#EEEEEE]">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/calculator"
                className="block px-5 py-3 text-[14px] font-medium text-[#333333] hover:text-black"
                style={{ fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}
              >
                Calculator
              </Link>
              <Link
                href="/masslam-sizes"
                className="block px-5 py-3 text-[14px] font-medium text-[#333333] hover:text-black"
                style={{ fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}
              >
                Masslam Sizes
              </Link>
              <Link
                href="/about"
                className="block px-5 py-3 text-[14px] font-medium text-[#333333] hover:text-black"
                style={{ fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}
              >
                About
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
} 