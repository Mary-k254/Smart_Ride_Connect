import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow better-sqlite3 to work in server components
  serverExternalPackages: ["better-sqlite3"],
  // Turbopack config (required for Next.js 16+)
  turbopack: {},
  // Webpack config for leaflet
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
