import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ["192.168.0.105", "192.168.1.248"],
  devIndicators: false,
};

export default nextConfig;
