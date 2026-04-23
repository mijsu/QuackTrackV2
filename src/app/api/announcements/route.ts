import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Helper to authenticate admin
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (session.user.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session, error: null };
}

// GET /api/announcements — Fetch all announcements (authenticated users)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetAudience = searchParams.get('targetAudience');

    // Build where clause: show announcements for the user's audience
    const where: Record<string, unknown> = {};
    if (targetAudience) {
      where.targetAudience = targetAudience;
    }

    const announcements = await db.announcement.findMany({
      where,
      orderBy: [
        { pinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Transform dates to strings for client compatibility
    const result = announcements.map((a) => ({
      ...a,
      date: a.createdAt.toISOString(),
      expiryDate: a.expiryDate ? a.expiryDate.toISOString() : null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

// POST /api/announcements — Create a new announcement (admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const session = auth.session!;

    const body = await request.json();
    const {
      title,
      message,
      type = 'info',
      priority = 'medium',
      targetAudience = 'all',
      pinned = false,
      expiryDate = null,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    const validTypes = ['info', 'warning', 'success', 'urgent'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: info, warning, success, urgent' },
        { status: 400 }
      );
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be one of: low, medium, high' },
        { status: 400 }
      );
    }

    const validAudiences = ['all', 'faculty', 'admin'];
    if (!validAudiences.includes(targetAudience)) {
      return NextResponse.json(
        { error: 'Invalid targetAudience. Must be one of: all, faculty, admin' },
        { status: 400 }
      );
    }

    const announcement = await db.announcement.create({
      data: {
        title: title.trim().slice(0, 120),
        message: message.trim().slice(0, 1000),
        type,
        priority,
        targetAudience,
        author: session.user.name || 'System Administrator',
        authorId: session.user.id,
        pinned: !!pinned,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entity: 'announcement',
        entityId: announcement.id,
        details: JSON.stringify({ title: announcement.title }),
      },
    });

    return NextResponse.json(
      {
        ...announcement,
        date: announcement.createdAt.toISOString(),
        expiryDate: announcement.expiryDate ? announcement.expiryDate.toISOString() : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 }
    );
  }
}

// PUT /api/announcements — Update an announcement (admin only)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const session = auth.session!;

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    // Check if announcement exists
    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Validate fields if provided
    if (updates.type !== undefined) {
      const validTypes = ['info', 'warning', 'success', 'urgent'];
      if (!validTypes.includes(updates.type)) {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
      }
    }
    if (updates.priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high'];
      if (!validPriorities.includes(updates.priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
      }
    }
    if (updates.targetAudience !== undefined) {
      const validAudiences = ['all', 'faculty', 'admin'];
      if (!validAudiences.includes(updates.targetAudience)) {
        return NextResponse.json({ error: 'Invalid targetAudience' }, { status: 400 });
      }
    }

    // Build update data — only include provided fields
    const updateData: Record<string, unknown> = {};
    if (updates.title !== undefined) updateData.title = String(updates.title).trim().slice(0, 120);
    if (updates.message !== undefined) updateData.message = String(updates.message).trim().slice(0, 1000);
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.targetAudience !== undefined) updateData.targetAudience = updates.targetAudience;
    if (updates.pinned !== undefined) updateData.pinned = !!updates.pinned;
    if (updates.expiryDate !== undefined) {
      updateData.expiryDate = updates.expiryDate ? new Date(updates.expiryDate) : null;
    }

    const announcement = await db.announcement.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entity: 'announcement',
        entityId: announcement.id,
        details: JSON.stringify({ title: announcement.title, updatedFields: Object.keys(updateData) }),
      },
    });

    return NextResponse.json({
      ...announcement,
      date: announcement.createdAt.toISOString(),
      expiryDate: announcement.expiryDate ? announcement.expiryDate.toISOString() : null,
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to update announcement' },
      { status: 500 }
    );
  }
}

// DELETE /api/announcements?id=xxx — Delete an announcement (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const session = auth.session!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const deleted = await db.announcement.delete({ where: { id } });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entity: 'announcement',
        entityId: deleted.id,
        details: JSON.stringify({ title: deleted.title }),
      },
    });

    return NextResponse.json({
      ...deleted,
      date: deleted.createdAt.toISOString(),
      expiryDate: deleted.expiryDate ? deleted.expiryDate.toISOString() : null,
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'Failed to delete announcement' },
      { status: 500 }
    );
  }
}
