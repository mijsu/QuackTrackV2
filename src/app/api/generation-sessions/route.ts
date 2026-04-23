import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/generation-sessions - List all generation sessions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    const sessions = await db.generationSession.findMany({
      where: status ? { status } : undefined,
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching generation sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST /api/generation-sessions - Create a new generation session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { totalTasks } = body;

    const genSession = await db.generationSession.create({
      data: {
        status: 'pending',
        totalTasks: totalTasks || 0,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(genSession);
  } catch (error) {
    console.error('Error creating generation session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
