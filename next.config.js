/** @type {import("next").NextConfig} */
const nextConfig = {
  /* config options here */
  // Configure CSS handling
  sassOptions: {
    includePaths: ['./styles'],
  },
  // Ensure CSS is properly loaded
  webpack(config) {
    return config;
  },
};

module.exports = nextConfig;