/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Используем уже оптимизированные на сервере файлы без _next/image,
    // чтобы не было 400 при динамически загружаемых файлах
    unoptimized: true
  },
  async headers() {
    return [
      {
        source: '/products/:path*',
        headers: [
          // Выключаем кэширование для продуктов
          { key: 'Cache-Control', value: 'private, no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ["sharp"],
    outputFileTracingExcludes: {
      "*": ["**/public/products/**"]
    }
  }
};

module.exports = nextConfig;

