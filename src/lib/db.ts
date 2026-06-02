// ─── PostgreSQL connection for QuackTrack ───────────────────────────────────
// The production database lives on Render (PostgreSQL).
// DATABASE_URL must be set via environment variable (.env locally, Render env vars in production).
//
// IMPORTANT: This module uses lazy initialization so that it doesn't crash during
// `next build` when DATABASE_URL is not available. The Prisma client is only
// created when db is first accessed at runtime (e.g., in an API route handler).

import { PrismaClient } from '@prisma/client'

// ─── Global singleton for dev mode (prevent connection leaks on hot reload) ──
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please set it in your .env file (local) or Render environment variables (production).'
    )
  }

  if (!databaseUrl.startsWith('postgresql://')) {
    throw new Error(
      `DATABASE_URL must be a PostgreSQL connection string (got: ${databaseUrl.substring(0, 30)}...)`
    )
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

/**
 * Lazy-initialized Prisma client singleton.
 *
 * Uses a Proxy so the PrismaClient is only constructed on first property access,
 * NOT at module-import time. This is critical because `next build` evaluates
 * server modules without DATABASE_URL available — the real connection is only
 * needed when an API route actually runs at request time.
 */
export const db: PrismaClient = globalForPrisma.prisma ?? new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    // Lazily create the real PrismaClient on first access
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient()
    }
    return Reflect.get(globalForPrisma.prisma, prop, receiver)
  },
})
