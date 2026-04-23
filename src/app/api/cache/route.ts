import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Simple in-memory cache for server-side
// In production, you might want to use Redis or similar
const cache = new Map<string, { data: unknown; expiry: number }>();

// Clear the entire cache
export function clearServerCache() {
  cache.clear();
  console.log('[Cache] Server cache cleared');
}

// POST /api/cache - Clear server-side cache
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can clear cache
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    // Clear server-side in-memory cache
    clearServerCache();

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'clear_cache',
        entity: 'system',
        details: JSON.stringify({ timestamp: new Date().toISOString() }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Server cache cleared successfully. Please also clear browser cache (localStorage/sessionStorage) on the client side.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
  }
}

// GET /api/cache - Get cache status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      cacheSize: cache.size,
      entries: Array.from(cache.keys()),
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    return NextResponse.json({ error: 'Failed to get cache status' }, { status: 500 });
  }
}

// Export cache for use in other modules
export { cache };
