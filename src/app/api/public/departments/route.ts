import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/public/departments - Public endpoint for registration page
export async function GET() {
  try {
    const departments = await db.department.findMany({
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching public departments:', error);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}
