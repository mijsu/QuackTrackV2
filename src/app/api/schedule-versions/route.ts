import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/schedule-versions - List all schedule versions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester');
    const academicYear = searchParams.get('academicYear');
    const isActive = searchParams.get('isActive');

    const versions = await db.scheduleVersion.findMany({
      where: {
        ...(semester && { semester }),
        ...(academicYear && { academicYear }),
        ...(isActive === 'true' && { isActive: true }),
      },
      orderBy: { generatedAt: 'desc' },
      include: {
        _count: { select: { snapshots: true } },
      },
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching schedule versions:', error);
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
  }
}

// POST /api/schedule-versions - Create a new schedule version
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { versionName, description, semester, academicYear, schedules, stats } = body;

    // Create version
    const version = await db.scheduleVersion.create({
      data: {
        versionName: versionName || `Version ${new Date().toISOString()}`,
        description,
        semester: semester || '1st Semester',
        academicYear: academicYear || '2024-2025',
        generatedBy: session.user.id,
        stats: JSON.stringify(stats || {}),
        scheduleCount: schedules?.length || 0,
      },
    });

    // Create snapshots for each schedule
    if (schedules && schedules.length > 0) {
      const snapshotData = schedules.map((s: any) => ({
        versionId: version.id,
        subjectId: s.subjectId,
        subjectCode: s.subjectCode || '',
        subjectName: s.subjectName || '',
        facultyId: s.facultyId,
        facultyName: s.facultyName || '',
        sectionId: s.sectionId,
        sectionName: s.sectionName || '',
        roomId: s.roomId || null,
        roomName: s.roomName || null,
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status || 'generated',
        score: s.score,
        scoreBreakdown: s.scoreBreakdown ? JSON.stringify(s.scoreBreakdown) : null,
      }));

      await db.scheduleSnapshot.createMany({ data: snapshotData });
    }

    return NextResponse.json(version);
  } catch (error) {
    console.error('Error creating schedule version:', error);
    return NextResponse.json({ error: 'Failed to create version' }, { status: 500 });
  }
}
