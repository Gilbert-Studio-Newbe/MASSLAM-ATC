// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'sm': '640px',    // Mobile landscape/small tablet
      'md': '768px',    // Tablet
      'lg': '1024px',   // Desktop
      'xl': '1280px',   // Large desktop
      '2xl': '1536px',  // Extra large screens
    },
    extend: {
      colors: {
        // Primary colors
        primary: {
          DEFAULT: '#3D7EDC',
          hover: '#2D6DC7',
        },
        // Text colors
        text: {
          primary: '#000000',
          secondary: '#333333',
          tertiary: '#666666',
        },
        // Background colors
        background: {
          primary: '#FFFFFF',
          secondary: '#F5F5F5',
          blue: '#F5F9FF',
        },
        // Border colors
        border: {
          DEFAULT: '#CCCCCC',
          light: '#EEEEEE',
        },
        // Success colors
        success: {
          DEFAULT: '#34A853',
        },
      },
      fontFamily: {
        sans: ['SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Body text sizes
        'body-sm': ['12px', '16px'],
        'body': ['14px', '20px'],
        'body-lg': ['16px', '24px'],
        // Header sizes
        'header-sm': ['16px', '24px'],
        'header': ['18px', '28px'],
        'header-lg': ['24px', '32px'],
        'header-xl': ['28px', '36px'],
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      spacing: {
        // Base spacing units
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
      },
      maxWidth: {
        'container': '1200px',
        'container-sm': '640px',
        'container-md': '768px',
        'container-lg': '1024px',
      },
      borderRadius: {
        DEFAULT: '4px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}