/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    typedRoutes: true
  }
};

module.exports = nextConfig;

