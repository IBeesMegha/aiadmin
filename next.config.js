/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable static optimization for admin pages that need database
  experimental: {
    // This helps with build performance
  },
  // Skip static generation for dynamic pages
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // Allow external images from any domain (for crawled website images)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
