/** @type {import("next").NextConfig} */
const nextConfig = {
  /* config options here */
  // Ensure CSS modules are properly processed
  webpack(config) {
    return config;
  },
};

module.exports = nextConfig;