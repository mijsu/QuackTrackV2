import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/users/[id] - Fetch a single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const isAdmin = session.user.role === 'admin';

    // Users can view their own profile, admins can view others
    if (!isAdmin && id !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id },
      include: {
        department: true,
        preferences: true,
        _count: { select: { schedules: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...user,
      specialization: JSON.parse(user.specialization || '[]'),
      preferences: user.preferences ? {
        ...user.preferences,
        preferredDays: JSON.parse(user.preferences.preferredDays || '[]'),
        preferredSubjects: JSON.parse(user.preferences.preferredSubjects || '[]'),
      } : null,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, personalEmail, password, role, departmentId, contractType, maxUnits, specialization, image, phone, facultyType } = body;

    const isAdmin = session.user.role === 'admin';

    // Users can update their own profile, admins can update anyone
    if (!isAdmin && id !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if institutional email is being changed and already exists
    if (email && email !== existingUser.email) {
      const emailExists = await db.user.findUnique({ where: { email } });
      if (emailExists) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
    }

    // Check if personal email is being changed and already exists
    if (personalEmail !== undefined && personalEmail !== existingUser.personalEmail) {
      if (personalEmail) {
        const personalEmailExists = await db.user.findFirst({ 
          where: { 
            personalEmail,
            NOT: { id }
          } 
        });
        if (personalEmailExists) {
          return NextResponse.json({ error: 'Personal email already exists' }, { status: 400 });
        }
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    // Non-admins can only update certain fields
    if (isAdmin) {
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (personalEmail !== undefined) updateData.personalEmail = personalEmail || null;
      if (role !== undefined) updateData.role = role;
      if (departmentId !== undefined) updateData.departmentId = departmentId || null;
      if (contractType !== undefined) updateData.contractType = contractType;
      if (maxUnits !== undefined) updateData.maxUnits = maxUnits;
      if (specialization !== undefined) updateData.specialization = JSON.stringify(specialization);
      if (facultyType !== undefined) updateData.facultyType = facultyType;
      if (password) updateData.password = await bcrypt.hash(password, 10);
    } else {
      // Regular users can only update their own basic info
      if (name !== undefined) updateData.name = name;
    }
    
    // Anyone can update these for themselves
    if (image !== undefined) updateData.image = image;
    if (phone !== undefined) updateData.phone = phone;

    // Update user
    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: { department: true },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entity: 'user',
        canUndo: true,
        entityId: id,
        details: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({
      ...user,
      specialization: JSON.parse(user.specialization || '[]'),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete a user (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete users
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if user exists
    const user = await db.user.findUnique({ 
      where: { id },
      include: {
        _count: { select: { schedules: true } }
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await db.user.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return NextResponse.json({ 
          error: 'Cannot delete the last admin account. Please promote another user to admin first.' 
        }, { status: 400 });
      }
    }

    // Delete related records in the correct order to avoid foreign key constraint violations
    
    // 1. Delete schedule logs where user modified schedules
    await db.scheduleLog.deleteMany({ where: { modifiedBy: id } });
    
    // 2. Get all schedule IDs for this user (to delete related schedule logs)
    const userScheduleIds = await db.schedule.findMany({
      where: { facultyId: id },
      select: { id: true }
    });
    const scheduleIds = userScheduleIds.map(s => s.id);
    
    // 3. Delete schedule logs for schedules owned by this user
    if (scheduleIds.length > 0) {
      await db.scheduleLog.deleteMany({
        where: { scheduleId: { in: scheduleIds } }
      });
    }
    
    // 4. Delete schedules where user is the faculty
    await db.schedule.deleteMany({ where: { facultyId: id } });
    
    // 5. Delete notifications
    await db.notification.deleteMany({ where: { userId: id } });
    
    // 6. Delete faculty preferences
    await db.facultyPreference.deleteMany({ where: { facultyId: id } });
    
    // 7. Delete audit logs referencing this user (set userId to null instead of deleting)
    await db.auditLog.updateMany({
      where: { userId: id },
      data: { userId: null }
    });

    // 8. Finally delete the user
    await db.user.delete({ where: { id } });

    // Create audit log for this deletion
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entity: 'user',
        canUndo: true,
        entityId: id,
        details: JSON.stringify({ 
          email: user.email, 
          name: user.name,
          role: user.role,
          deletedSchedules: user._count.schedules
        }),
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: `User deleted successfully. ${user._count.schedules} schedule(s) were also removed.` 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user. Please try again.' }, { status: 500 });
  }
}
