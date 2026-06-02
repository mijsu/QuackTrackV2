import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await db.user.findUnique({
      where: { id },
      include: {
        department: true,
        preferences: true,
        schedules: {
          include: {
            subject: true,
            section: true,
            scheduleVersion: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if user exists
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.email !== undefined) updateData.email = body.email
    if (body.personalEmail !== undefined) updateData.personalEmail = body.personalEmail
    if (body.role !== undefined) updateData.role = body.role
    if (body.facultyType !== undefined) updateData.facultyType = body.facultyType
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId
    if (body.contractType !== undefined) updateData.contractType = body.contractType
    if (body.maxUnits !== undefined) updateData.maxUnits = body.maxUnits
    if (body.specialization !== undefined) updateData.specialization = body.specialization
    if (body.status !== undefined) updateData.status = body.status
    if (body.image !== undefined) updateData.image = body.image
    if (body.phone !== undefined) updateData.phone = body.phone
    // Password changes must go through the dedicated /api/auth/change-password endpoint
    // which verifies the current password before allowing updates

    // Check for UID/email conflicts if they're being updated
    if (body.uid || body.email) {
      const conflict = await db.user.findFirst({
        where: {
          OR: [
            ...(body.uid ? [{ uid: body.uid }] : []),
            ...(body.email ? [{ email: body.email }] : []),
          ],
          NOT: { id },
        },
      })
      if (conflict) {
        return NextResponse.json(
          { error: 'User with this UID or email already exists' },
          { status: 409 }
        )
      }
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
      },
    })

    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete related records atomically in a transaction to avoid inconsistent state
    // Use a generous timeout since Render's free-tier DB can be slow on cold starts
    await db.$transaction(async (tx) => {
      // 1. Schedule responses where user is faculty
      await tx.scheduleResponse.deleteMany({ where: { facultyId: id } })
      // 2. Schedule logs
      await tx.scheduleLog.deleteMany({ where: { userId: id } })
      // 3. Faculty preferences
      await tx.facultyPreference.deleteMany({ where: { facultyId: id } })
      // 4. Notifications
      await tx.notification.deleteMany({ where: { userId: id } })
      // 5. Conflicts referencing user's schedules
      const userScheduleIds = await tx.schedule.findMany({
        where: { facultyId: id },
        select: { id: true },
      })
      const scheduleIds = userScheduleIds.map(s => s.id)
      if (scheduleIds.length > 0) {
        await tx.conflict.deleteMany({ where: { scheduleId1: { in: scheduleIds } } })
        await tx.conflict.deleteMany({ where: { scheduleId2: { in: scheduleIds } } })
      }
      // 6. Schedules where user is faculty
      await tx.schedule.deleteMany({ where: { facultyId: id } })
      // 7. Announcements - set authorId to null instead of deleting
      await tx.announcement.updateMany({ where: { authorId: id }, data: { authorId: null } })
      // 8. Audit logs - set userId to null instead of deleting
      await tx.auditLog.updateMany({ where: { userId: id }, data: { userId: null } })

      await tx.user.delete({ where: { id } })
    }, { timeout: 120000 })
    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
