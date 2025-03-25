import './globals.css';
import { Inter } from 'next/font/google';
import AppProviders from '../components/AppProviders';
import Navigation from '../components/Navigation';
import type { ReactNode } from 'react';

export const metadata = { 
  title: 'MASSLAM ATC', 
  description: 'Automated Timber Calculator', 
}; 

const inter = Inter({ subsets: ['latin'] }); 

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
        <style dangerouslySetInnerHTML={{ __html: `
          /* Critical CSS to ensure basic styling works even if external CSS fails */
          :root {
            --apple-bg: #f0f2f5;
            --apple-text: #333;
            --apple-accent: #0071e3;
            --apple-nav-bg: #fff;
            --apple-nav-border: #d2d2d7;
            --apple-input-border: #d2d2d7;
            --apple-shadow: rgba(0, 0, 0, 0.1);
          }
        ` }} />
      </head>
      <body className={inter.className}>
        <AppProviders>
          <div className="fixed top-0 w-full z-50">
            <Navigation />
          </div>
          <div className="mt-16">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}
