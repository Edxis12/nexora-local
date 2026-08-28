import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Orígenes permitidos en desarrollo (IPs locales y túneles de Cloudflare)
  allowedDevOrigins: [
    "192.168.1.76",
    "192.168.1.76:3000",
    "192.168.1.75",
    "192.168.1.75:3000",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "*.trycloudflare.com",
  ],

  // 2. Permitir carga de imágenes desde Cloudinary
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  // 3. Proxies internos hacia el backend (Express en puerto 4000)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:4000/api/:path*",
      },
      {
        source: "/socket.io/:path*",
        destination: "http://127.0.0.1:4000/socket.io/:path*",
      },
    ];
  },
};

export default nextConfig;