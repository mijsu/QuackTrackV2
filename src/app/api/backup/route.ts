import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/backup - Create database backup (export data as JSON)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can create backups
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    // Export all data as JSON
    const [
      users,
      departments,
      subjects,
      rooms,
      sections,
      schedules,
      conflicts,
      notifications,
      facultyPreferences,
      systemSettings,
      auditLogs,
    ] = await Promise.all([
      db.user.findMany({
        select: {
          id: true,
          uid: true,
          name: true,
          email: true,
          role: true,
          departmentId: true,
          contractType: true,
          maxUnits: true,
          specialization: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.department.findMany(),
      db.subject.findMany(),
      db.room.findMany(),
      db.section.findMany(),
      db.schedule.findMany({
        include: {
          subject: { select: { subjectCode: true } },
          faculty: { select: { name: true } },
          room: { select: { roomName: true } },
          section: { select: { sectionName: true } },
        },
      }),
      db.conflict.findMany(),
      db.notification.findMany(),
      db.facultyPreference.findMany(),
      db.systemSetting.findMany(),
      db.auditLog.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const backupTimestamp = new Date().toISOString();
    
    const backup = {
      timestamp: backupTimestamp,
      version: '2.0.0',
      data: {
        users,
        departments,
        subjects,
        rooms,
        sections,
        schedules,
        conflicts,
        notifications,
        facultyPreferences,
        systemSettings,
        auditLogs,
      },
      counts: {
        users: users.length,
        departments: departments.length,
        subjects: subjects.length,
        rooms: rooms.length,
        sections: sections.length,
        schedules: schedules.length,
        conflicts: conflicts.length,
      },
    };

    // Update last_backup setting
    await db.systemSetting.upsert({
      where: { key: 'last_backup' },
      create: { key: 'last_backup', value: backupTimestamp },
      update: { value: backupTimestamp },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'backup_database',
        entity: 'system',
        details: JSON.stringify({ timestamp: backup.timestamp }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      backup,
      lastBackup: backupTimestamp,
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}
