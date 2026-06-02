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

    const [sessions, total] = await Promise.all([
      db.generationSession.findMany({
        where,
        include: {
          config: true,
          _count: {
            select: { scheduleVersions: true },
          },
          scheduleVersions: {
            select: { id: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.generationSession.count({ where }),
    ])

    return NextResponse.json({
      data: sessions,
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
      { error: 'Failed to fetch generation sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, status, configId, semester, academicYear } = body

    if (!name || !academicYear) {
      return NextResponse.json(
        { error: 'Name and academicYear are required' },
        { status: 400 }
      )
    }

    const session = await db.generationSession.create({
      data: {
        name,
        status: status || 'pending',
        configId,
        semester: semester || '1st',
        academicYear,
      },
      include: {
        config: true,
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to create generation session' },
      { status: 500 }
    )
  }
}
