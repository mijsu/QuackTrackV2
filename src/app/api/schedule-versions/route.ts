import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const semester = searchParams.get('semester')
    const academicYear = searchParams.get('academicYear')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (semester) where.semester = semester
    if (academicYear) where.academicYear = academicYear

    const [versions, total] = await Promise.all([
      db.scheduleVersion.findMany({
        where,
        include: {
          _count: {
            select: { schedules: true },
          },
          publisher: { select: { id: true, name: true, uid: true } },
          generationSession: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.scheduleVersion.count({ where }),
    ])

    return NextResponse.json({
      data: versions,
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
      { error: 'Failed to fetch schedule versions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, semester, academicYear, status, generationSessionId } = body

    if (!name || !academicYear) {
      return NextResponse.json(
        { error: 'Name and academicYear are required' },
        { status: 400 }
      )
    }

    const version = await db.scheduleVersion.create({
      data: {
        name,
        description,
        semester: semester || '1st',
        academicYear,
        status: status || 'draft',
        generationSessionId,
      },
      include: {
        generationSession: true,
      },
    })

    return NextResponse.json(version, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to create schedule version' },
      { status: 500 }
    )
  }
}
