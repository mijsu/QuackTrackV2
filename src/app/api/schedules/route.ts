import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scheduleVersionId = searchParams.get('scheduleVersionId')
    const facultyId = searchParams.get('facultyId')
    const sectionId = searchParams.get('sectionId')
    const subjectId = searchParams.get('subjectId')
    const day = searchParams.get('day')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (scheduleVersionId) where.scheduleVersionId = scheduleVersionId
    if (facultyId) where.facultyId = facultyId
    if (sectionId) where.sectionId = sectionId
    if (subjectId) where.subjectId = subjectId
    if (day) where.day = day
    if (status) where.status = status

    const [schedules, total] = await Promise.all([
      db.schedule.findMany({
        where,
        include: {
          subject: true,
          faculty: { select: { id: true, name: true, uid: true, specialization: true, contractType: true, facultyType: true } },
          section: { include: { program: true } },
        },
        skip,
        take: limit,
        orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
      }),
      db.schedule.count({ where }),
    ])

    return NextResponse.json({
      data: schedules,
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
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      day,
      startTime,
      endTime,
      subjectId,
      facultyId,
      sectionId,
      scheduleVersionId,
      status,
    } = body

    if (!day || !startTime || !endTime || !subjectId || !facultyId || !sectionId || !scheduleVersionId) {
      return NextResponse.json(
        { error: 'Day, startTime, endTime, subjectId, facultyId, sectionId, and scheduleVersionId are required' },
        { status: 400 }
      )
    }

    // Validate day is a valid weekday
    const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    if (!validDays.includes(day)) {
      return NextResponse.json(
        { error: `Day must be one of: ${validDays.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate time format (HH:MM) and startTime < endTime
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: 'startTime and endTime must be in HH:MM format' },
        { status: 400 }
      )
    }
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: 'startTime must be before endTime' },
        { status: 400 }
      )
    }

    // Verify the schedule version exists and is not published
    const version = await db.scheduleVersion.findUnique({ where: { id: scheduleVersionId } })
    if (!version) {
      return NextResponse.json(
        { error: 'Schedule version not found' },
        { status: 404 }
      )
    }
    if (version.status === 'published') {
      return NextResponse.json(
        { error: 'Cannot add schedules to a published version. Revert to draft first.' },
        { status: 403 }
      )
    }

    // Verify referenced entities exist
    const [subject, faculty, section] = await Promise.all([
      db.subject.findUnique({ where: { id: subjectId } }),
      db.user.findUnique({ where: { id: facultyId } }),
      db.section.findUnique({ where: { id: sectionId } }),
    ])
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }
    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 })
    }
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    const schedule = await db.schedule.create({
      data: {
        day,
        startTime,
        endTime,
        subjectId,
        facultyId,
        sectionId,
        scheduleVersionId,
        status: status || 'initial',
      },
      include: {
        subject: true,
        faculty: { select: { id: true, name: true, uid: true, contractType: true, facultyType: true } },
        section: { include: { program: true } },
        scheduleVersion: true,
      },
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    )
  }
}
