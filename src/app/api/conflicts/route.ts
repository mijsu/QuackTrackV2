import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectConflicts } from '@/lib/scheduling'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scheduleVersionId = searchParams.get('scheduleVersionId')
    const type = searchParams.get('type')
    const severity = searchParams.get('severity')
    const isResolved = searchParams.get('isResolved')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (severity) where.severity = severity
    if (isResolved) where.isResolved = isResolved === 'true'

    if (scheduleVersionId) {
      where.OR = [
        { schedule1: { scheduleVersionId } },
        { schedule2: { scheduleVersionId } },
      ]
    }

    const [conflicts, total] = await Promise.all([
      db.conflict.findMany({
        where,
        include: {
          schedule1: {
            include: {
              subject: true,
              faculty: { select: { id: true, name: true, uid: true } },
              section: true,
            },
          },
          schedule2: {
            include: {
              subject: true,
              faculty: { select: { id: true, name: true, uid: true } },
              section: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.conflict.count({ where }),
    ])

    return NextResponse.json({
      data: conflicts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch conflicts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scheduleVersionId } = body

    if (!scheduleVersionId) {
      return NextResponse.json(
        { error: 'scheduleVersionId is required' },
        { status: 400 }
      )
    }

    const version = await db.scheduleVersion.findUnique({
      where: { id: scheduleVersionId },
    })

    if (!version) {
      return NextResponse.json(
        { error: 'Schedule version not found' },
        { status: 404 }
      )
    }

    const conflicts = await detectConflicts(scheduleVersionId)

    return NextResponse.json({
      message: 'Conflict detection completed',
      conflictsFound: conflicts.length,
      data: conflicts,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Conflict detection failed' },
      { status: 500 }
    )
  }
}
