import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/schedule-versions/[id]/restore - Restore schedules from a version
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const version = await db.scheduleVersion.findUnique({
      where: { id: params.id },
      include: { snapshots: true },
    });

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Clear existing schedules for THIS semester/year only
    await db.$transaction([
      db.scheduleResponse.deleteMany({
        where: { schedule: { semester: version.semester, academicYear: version.academicYear } },
      }),
      db.scheduleLog.deleteMany({
        where: { schedule: { semester: version.semester, academicYear: version.academicYear } },
      }),
      db.schedule.deleteMany({
        where: { semester: version.semester, academicYear: version.academicYear },
      }),
    ]);

    // Restore schedules from snapshots
    const scheduleData = version.snapshots.map(s => ({
      subjectId: s.subjectId,
      facultyId: s.facultyId,
      sectionId: s.sectionId,
      roomId: s.roomId,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      status: 'generated' as const,
      semester: version.semester,
      academicYear: version.academicYear,
    }));

    await db.schedule.createMany({ data: scheduleData });

    // Set this version as active
    await db.scheduleVersion.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    await db.scheduleVersion.update({
      where: { id: params.id },
      data: { isActive: true },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'restore_version',
        entity: 'schedule',
        entityId: params.id,
        details: JSON.stringify({
          versionName: version.versionName,
          scheduleCount: scheduleData.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      restoredCount: scheduleData.length,
      version: version.versionName,
    });
  } catch (error) {
    console.error('Error restoring schedule version:', error);
    return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
  }
}
