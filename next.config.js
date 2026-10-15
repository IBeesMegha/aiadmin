/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['fs', 'path', 'fs/promises', 'child_process'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};
      config.resolve.fallback.crypto = false;
      config.resolve.fallback.stream = false;
      config.resolve.fallback.buffer = false;
      config.resolve.fallback.util = false;
      config.resolve.fallback.assert = false;
      config.resolve.fallback.http = false;
      config.resolve.fallback.https = false;
      config.resolve.fallback.zlib = false;
      config.resolve.fallback.url = false;
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:crypto': 'crypto',
        'node:events': 'events',
        'node:fs': 'fs',
        'node:fs/promises': 'fs/promises',
        'node:os': 'os',
        'node:path': 'path',
        'node:child_process': 'child_process',
        'node:util': 'util',
        'node:stream': 'stream',
        'node:buffer': 'buffer',
        'node:url': 'url',
      };
      config.externals.push(({ request }, callback) => {
        if (request && ['fs', 'fs/promises', 'path', 'util', 'crypto', 'stream', 'buffer', 'url', 'os', 'http', 'https', 'zlib', 'assert'].includes(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      });
    }
    return config;
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
