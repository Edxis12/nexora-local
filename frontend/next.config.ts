import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.1.75',
    'localhost',
    '127.0.0.1',
    '*.trycloudflare.com',
  ],

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