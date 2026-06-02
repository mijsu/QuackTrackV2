import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')
    const programId = searchParams.get('programId')
    const semester = searchParams.get('semester')
    const yearLevel = searchParams.get('yearLevel')
    const subjectType = searchParams.get('subjectType')
    const classType = searchParams.get('classType')
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (departmentId) where.departmentId = departmentId
    if (programId) where.programId = programId
    if (semester) where.semester = semester
    if (yearLevel) where.yearLevel = parseInt(yearLevel)
    if (subjectType) where.subjectType = subjectType
    if (classType) where.classType = classType
    if (isActive) where.isActive = isActive === 'true'

    if (search) {
      where.OR = [
        { subjectName: { contains: search, mode: 'insensitive' } },
        { subjectCode: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [subjects, total] = await Promise.all([
      db.subject.findMany({
        where,
        include: {
          department: true,
          program: true,
          _count: {
            select: { schedules: true },
          },
        },
        skip,
        take: limit,
        orderBy: [{ yearLevel: 'asc' }, { semester: 'asc' }, { subjectCode: 'asc' }],
      }),
      db.subject.count({ where }),
    ])

    return NextResponse.json({
      data: subjects,
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
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      subjectCode,
      subjectName,
      description,
      units,
      programId,
      departmentId,
      subjectType,
      classType,
      yearLevel,
      semester,
      requiredSpecialization,
      requiredEquipment,
      defaultDurationHours,
      isActive,
    } = body

    if (!subjectCode || !subjectName || units === undefined || units === null || !programId || !departmentId) {
      return NextResponse.json(
        { error: 'Subject code, name, units, programId, and departmentId are required' },
        { status: 400 }
      )
    }

    const subject = await db.subject.create({
      data: {
        subjectCode,
        subjectName,
        description,
        units,
        programId,
        departmentId,
        subjectType: subjectType || 'lecture',
        classType: classType || 'regular',
        yearLevel: yearLevel ?? 1,
        semester: semester || '1st',
        requiredSpecialization,
        requiredEquipment,
        defaultDurationHours: defaultDurationHours ?? 1.5,
        lectureHours: body.lectureHours ?? 0,
        labHours: body.labHours ?? 0,
        isActive: isActive ?? true,
      },
      include: {
        department: true,
        program: true,
      },
    })

    return NextResponse.json(subject, { status: 201 })
  } catch (error) {
    console.error(error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    if (errorMsg.includes('subjectCode') || errorMsg.includes('unique constraint')) {
      return NextResponse.json(
        { error: 'Subject code must be unique' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    )
  }
}
