// ─── PostgreSQL connection for QuackTrack ───────────────────────────────────
// The production database lives on Render (PostgreSQL).
// The system environment may set DATABASE_URL to a SQLite path.
//
// We rely on next.config.ts to force process.env.DATABASE_URL to PostgreSQL
// BEFORE any server code runs. This file then uses a static import which is
// safe because the env is already corrected at that point.

// Belt-and-suspenders: set it again here too (harmless if already set)
process.env.DATABASE_URL =
  process.env.DATABASE_URL?.startsWith('postgresql://')
    ? process.env.DATABASE_URL
    : 'postgresql://ptcquacktrack_adjm_user:B2ZcFtdA3vZCf5Qguepsc3sp7Cjxsapl@dpg-d841pm8jo89c73aeggn0-a.oregon-postgres.render.com/ptcquacktrack_adjm?sslmode=require&connection_limit=3&pool_timeout=30&connect_timeout=15'

const POSTGRES_URL = process.env.DATABASE_URL

import { PrismaClient } from '@prisma/client'

// ─── Global singleton for dev mode (prevent connection leaks on hot reload) ──
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: POSTGRES_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
