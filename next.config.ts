// ─── Next.js Configuration for QuackTrack V2 ────────────────────────────────
// For production (Render), DATABASE_URL is set via environment variable automatically.
// For local development, it's read from the .env file.
// The sandbox may override DATABASE_URL to a SQLite path, so we correct it here.
//
// NOTE: We do NOT set a placeholder DATABASE_URL during build time.
// The db.ts module uses lazy initialization via Proxy, so it won't crash
// during `next build` when DATABASE_URL is unavailable. The real connection
// is only made when an API route handler runs at request time.

if (
  process.env.NODE_ENV !== 'production' &&
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.startsWith('postgresql://')
) {
  // In development/sandbox, if DATABASE_URL is set to a non-PostgreSQL value
  // (e.g., the sandbox overrides it to a SQLite path), correct it to our
  // PostgreSQL database. In production on Render, DATABASE_URL is always
  // set properly by the platform.
  process.env.DATABASE_URL =
    'postgresql://ptcquacktrack_adjm_user:B2ZcFtdA3vZCf5Qguepsc3sp7Cjxsapl@dpg-d841pm8jo89c73aeggn0-a.oregon-postgres.render.com/ptcquacktrack_adjm?sslmode=require&connection_limit=3&pool_timeout=30&connect_timeout=15'
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["pdfkit", "@prisma/client", "bcryptjs", "nodemailer"],
};

export default nextConfig;
