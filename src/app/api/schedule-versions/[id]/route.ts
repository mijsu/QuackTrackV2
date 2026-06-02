import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const version = await db.scheduleVersion.findUnique({
      where: { id },
      include: {
        schedules: {
          include: {
            subject: true,
            faculty: { select: { id: true, name: true, uid: true, specialization: true } },
            section: { include: { program: true, department: true } },
          },
          orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
        },
        publisher: { select: { id: true, name: true, uid: true } },
        generationSession: true,
        scheduleResponses: {
          include: {
            faculty: { select: { id: true, name: true, uid: true } },
          },
        },
      },
    })

    if (!version) {
      return NextResponse.json({ error: 'Schedule version not found' }, { status: 404 })
    }

    return NextResponse.json(version)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch schedule version' },
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

    const existing = await db.scheduleVersion.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Schedule version not found' }, { status: 404 })
    }

    // Prevent modification of published versions (except reverting to draft)
    if (existing.status === 'published' && body.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot modify a published schedule version. Revert to draft first.' },
        { status: 403 }
      )
    }

    // Handle publish action
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.semester !== undefined) updateData.semester = body.semester
    if (body.academicYear !== undefined) updateData.academicYear = body.academicYear
    if (body.status !== undefined) updateData.status = body.status
    if (body.publishedBy !== undefined) updateData.publishedBy = body.publishedBy
    // Handle publish action
    if (body.status === 'published' && existing.status !== 'published') {
      updateData.publishedAt = new Date()
    }

    const version = await db.scheduleVersion.update({
      where: { id },
      data: updateData,
      include: {
        publisher: { select: { id: true, name: true, uid: true } },
        generationSession: true,
      },
    })

    return NextResponse.json(version)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to update schedule version' },
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

    const existing = await db.scheduleVersion.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Schedule version not found' }, { status: 404 })
    }

    // Delete related records atomically in a transaction to avoid inconsistent state.
    // Use a generous timeout since Render's free-tier DB can be slow on cold starts.
    await db.$transaction(async (tx) => {
      // 1. Delete conflicts referencing schedules in this version
      const scheduleIds = await tx.schedule.findMany({
        where: { scheduleVersionId: id },
        select: { id: true }
      })
      const ids = scheduleIds.map(s => s.id)
      if (ids.length > 0) {
        await tx.conflict.deleteMany({ where: { scheduleId1: { in: ids } } })
        await tx.conflict.deleteMany({ where: { scheduleId2: { in: ids } } })
      }
      // 2. Delete schedule responses
      await tx.scheduleResponse.deleteMany({ where: { scheduleVersionId: id } })
      // 3. Delete schedules
      await tx.schedule.deleteMany({ where: { scheduleVersionId: id } })
      // 4. Delete the schedule version itself
      await tx.scheduleVersion.delete({ where: { id } })
    }, { timeout: 120000 }) // 2-minute timeout for slow DB

    return NextResponse.json({ message: 'Schedule version deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to delete schedule version' },
      { status: 500 }
    )
  }
}
