import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/programs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const programs = await db.program.findMany({
      where: {
        ...(departmentId ? { departmentId } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        department: true,
        _count: {
          select: {
            subjects: true,
            sections: true,
          },
        },
      },
      orderBy: [
        { department: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(programs);
  } catch (error) {
    console.error('Error fetching programs:', error);
    return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 });
  }
}

// POST /api/programs - Admin only
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, description, departmentId } = body;

    if (!name || !departmentId) {
      return NextResponse.json({ error: 'Program name and department are required' }, { status: 400 });
    }

    // Check if program with same name exists in the department
    const existing = await db.program.findFirst({
      where: {
        name,
        departmentId,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Program with this name already exists in the department' }, { status: 400 });
    }

    // Check if code is unique if provided
    if (code) {
      const existingCode = await db.program.findUnique({
        where: { code },
      });
      if (existingCode) {
        return NextResponse.json({ error: 'Program code already exists' }, { status: 400 });
      }
    }

    const program = await db.program.create({
      data: {
        name,
        code,
        description,
        departmentId,
      },
      include: {
        department: true,
        _count: {
          select: {
            subjects: true,
            sections: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entity: 'program',
        entityId: program.id,
        details: JSON.stringify({ name, code, departmentId }),
        canUndo: true,
      },
    });

    return NextResponse.json(program);
  } catch (error) {
    console.error('Error creating program:', error);
    return NextResponse.json({ error: 'Failed to create program' }, { status: 500 });
  }
}
