// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/utils/**/*.{js,ts,jsx,tsx}",
    "./styles/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        // Define custom colors to match the original design
        primary: {
          50: '#f0f9f0',
          100: '#dcf0dc',
          200: '#bfe3bf',
          300: '#94d194',
          400: '#6aba6a',
          500: '#4a9d4a',
          600: '#3c803c',
          700: '#2e6733',
          800: '#25512a',
          900: '#1c4322',
        },
        masslam: {
          100: '#fff3e0',
          200: '#ffe0b2',
          300: '#ffcc80',
          400: '#ffb74d',
          500: '#ffa726',
          600: '#fb8c00',
          700: '#f57c00',
          800: '#ef6c00',
          900: '#e65100',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'inner-md': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
      },
      // Add custom sizes for specific components
      width: {
        '120': '30rem',
      },
      height: {
        '120': '30rem',
      },
    },
  },
  plugins: [],
}