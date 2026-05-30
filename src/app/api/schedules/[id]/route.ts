import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const schedule = await db.schedule.findUnique({
      where: { id },
      include: {
        subject: true,
        faculty: { select: { id: true, name: true, uid: true, email: true, specialization: true } },
        section: { include: { program: true, department: true } },
        scheduleVersion: true,
        conflicts1: { include: { schedule1: true, schedule2: true } },
        conflicts2: { include: { schedule1: true, schedule2: true } },
      },
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json(schedule)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
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

    const existing = await db.schedule.findUnique({
      where: { id },
      include: { scheduleVersion: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    if (existing.scheduleVersion?.status === 'published') {
      return NextResponse.json(
        { error: 'Cannot modify a schedule in a published version' },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.day !== undefined) updateData.day = body.day
    if (body.startTime !== undefined) updateData.startTime = body.startTime
    if (body.endTime !== undefined) updateData.endTime = body.endTime
    if (body.subjectId !== undefined) updateData.subjectId = body.subjectId
    if (body.facultyId !== undefined) updateData.facultyId = body.facultyId
    if (body.sectionId !== undefined) updateData.sectionId = body.sectionId
    if (body.scheduleVersionId !== undefined) updateData.scheduleVersionId = body.scheduleVersionId
    if (body.status !== undefined) updateData.status = body.status
    if (body.mergedWith !== undefined) updateData.mergedWith = body.mergedWith

    const schedule = await db.schedule.update({
      where: { id },
      data: updateData,
      include: {
        subject: true,
        faculty: { select: { id: true, name: true, uid: true } },
        section: { include: { program: true } },
        scheduleVersion: true,
      },
    })

    return NextResponse.json(schedule)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to update schedule' },
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

    const existing = await db.schedule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Delete related conflicts first
    await db.conflict.deleteMany({ where: { scheduleId1: id } })
    await db.conflict.deleteMany({ where: { scheduleId2: id } })
    await db.schedule.delete({ where: { id } })
    return NextResponse.json({ message: 'Schedule deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    )
  }
}
