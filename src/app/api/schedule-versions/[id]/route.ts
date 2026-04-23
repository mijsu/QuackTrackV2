import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/schedule-versions/[id] - Get version with snapshots
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const version = await db.scheduleVersion.findUnique({
      where: { id: params.id },
      include: {
        snapshots: {
          orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Parse JSON fields
    const result = {
      ...version,
      stats: JSON.parse(version.stats || '{}'),
      snapshots: version.snapshots.map(s => ({
        ...s,
        scoreBreakdown: s.scoreBreakdown ? JSON.parse(s.scoreBreakdown) : null,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching schedule version:', error);
    return NextResponse.json({ error: 'Failed to fetch version' }, { status: 500 });
  }
}

// PUT - Update version (e.g., set as active, archive)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { isActive, isArchived, versionName, description } = body;

    // If setting as active, deactivate others
    if (isActive) {
      await db.scheduleVersion.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (versionName !== undefined) updateData.versionName = versionName;
    if (description !== undefined) updateData.description = description;

    const version = await db.scheduleVersion.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(version);
  } catch (error) {
    console.error('Error updating schedule version:', error);
    return NextResponse.json({ error: 'Failed to update version' }, { status: 500 });
  }
}

// DELETE - Delete a version
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete snapshots first (cascade should handle this, but explicit is safer)
    await db.scheduleSnapshot.deleteMany({
      where: { versionId: params.id },
    });

    await db.scheduleVersion.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule version:', error);
    return NextResponse.json({ error: 'Failed to delete version' }, { status: 500 });
  }
}
