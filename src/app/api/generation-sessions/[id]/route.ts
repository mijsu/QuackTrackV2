import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await db.generationSession.findUnique({
      where: { id },
      include: {
        _count: {
          select: { scheduleVersions: true },
        },
        config: true,
        scheduleVersions: {
          include: {
            _count: {
              select: { schedules: true },
            },
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Generation session not found' }, { status: 404 })
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch generation session' },
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

    const existing = await db.generationSession.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Generation session not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.status !== undefined) updateData.status = body.status
    if (body.totalSchedules !== undefined) updateData.totalSchedules = body.totalSchedules
    if (body.conflictCount !== undefined) updateData.conflictCount = body.conflictCount
    if (body.score !== undefined) updateData.score = body.score
    if (body.startedAt) updateData.startedAt = new Date(body.startedAt)
    if (body.completedAt) updateData.completedAt = new Date(body.completedAt)

    const session = await db.generationSession.update({
      where: { id },
      data: updateData,
      include: {
        config: true,
      },
    })

    return NextResponse.json(session)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to update generation session' },
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

    const existing = await db.generationSession.findUnique({
      where: { id },
      include: { _count: { select: { scheduleVersions: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Generation session not found' }, { status: 404 })
    }

    if (existing._count.scheduleVersions > 0) {
      return NextResponse.json(
        { error: 'Cannot delete generation session with existing schedule versions. Please delete them first.' },
        { status: 400 }
      )
    }

    await db.generationSession.delete({ where: { id } })
    return NextResponse.json({ message: 'Generation session deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to delete generation session' },
      { status: 500 }
    )
  }
}
