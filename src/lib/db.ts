import { PrismaClient } from '@prisma/client'

// Database URL configuration
// The system environment may have DATABASE_URL set to the SQLite fallback.
// We need to check for PostgreSQL URLs first and use them if available.
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  // If it's already a PostgreSQL URL, use it directly
  if (url && (url.startsWith('postgresql://') || url.startsWith('postgres://'))) {
    // Add connection_limit to prevent memory issues with Render PostgreSQL
    let finalUrl = url;
    if (!finalUrl.includes('connection_limit')) {
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'connection_limit=3';
    }
    // In production, ensure SSL is enabled (Render PostgreSQL requires it)
    if (!finalUrl.includes('sslmode')) {
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'sslmode=require';
    }
    return finalUrl;
  }

  // If it's a file: URL (SQLite), use the production PostgreSQL database
  const POSTGRES_URL = 'postgresql://quacktrack_6u94_ocuw_user:2J7RM278uUzHOo57S1EeVMFksI7eBMG7@dpg-d7fo1vi8qa3s73dmdmb0-a.oregon-postgres.render.com/quacktrack_6u94_ocuw?sslmode=require&connection_limit=3';
  
  console.log('[DB] DATABASE_URL is not PostgreSQL, using production PostgreSQL database');
  return POSTGRES_URL;
}

// Lazy singleton
let _db: PrismaClient | null = null;

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_db) {
      const dbUrl = getDatabaseUrl();
      console.log('[DB] Connecting to:', dbUrl.substring(0, 30) + '...');
      
      _db = new PrismaClient({
        datasourceUrl: dbUrl,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });

      if (process.env.NODE_ENV !== 'production') {
        const g = globalThis as unknown as { prisma: PrismaClient | undefined };
        g.prisma = _db;
      }
    }
    const value = (Reflect.get(_db, prop) as unknown);
    if (typeof value === 'function') {
      return value.bind(_db);
    }
    return value;
  },
});

process.on('beforeExit', async () => {
  if (_db) await _db.$disconnect();
});
