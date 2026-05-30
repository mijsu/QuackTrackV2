// ─── Force PostgreSQL URL for development ──────────────────────────────────
// In production (Render), DATABASE_URL should be set as an environment variable.
// This only sets it if not already defined (e.g., in .env for local development).
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://ptcquacktrack_adjm_user:B2ZcFtdA3vZCf5Qguepsc3sp7Cjxsapl@dpg-d841pm8jo89c73aeggn0-a.oregon-postgres.render.com/ptcquacktrack_adjm?sslmode=require&connection_limit=3&pool_timeout=30&connect_timeout=15'
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    // Allow preview panel cross-origin requests
    "space-z.ai",
  ],
  serverExternalPackages: ["pdfkit", "@prisma/client"],
};

export default nextConfig;
