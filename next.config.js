/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Disable all caching
  onDemandEntries: {
    maxInactiveAge: 0,
    pagesBufferLength: 0,
  },
}

module.exports = nextConfig
