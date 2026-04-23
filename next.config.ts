import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    '.space.z.ai',
    '21.0.4.160',
    '21.0.9.6',
  ],
};

export default nextConfig;
