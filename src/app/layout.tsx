import './globals.css';
import Navigation from '@/components/Navigation';
import type { Metadata } from 'next';
import AppProviders from '@/components/AppProviders';

export const metadata: Metadata = {
  title: 'ATC by ASH - Parametric Design Tool',
  description: 'Design multi-level timber buildings with parametric tools',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProviders>
          <Navigation />
          <main className="container mx-auto py-4 md:py-8">
            {children}
          </main>
          <footer className="border-t border-[#EEEEEE] mt-20">
            <div className="container mx-auto py-8 text-[#666666] text-sm">
              © {new Date().getFullYear()} ASH. All rights reserved.
            </div>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
