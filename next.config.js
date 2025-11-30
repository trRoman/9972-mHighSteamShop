/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: '/products/:path*',
        headers: [
          // disable caching for product images to reflect uploads immediately
          { key: 'Cache-Control', value: 'private, no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ["sharp"]
  }
};

module.exports = nextConfig;

