/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true, // si usas app directory
  },
  // Configuración PWA
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig