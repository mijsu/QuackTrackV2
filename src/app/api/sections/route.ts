import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programId = searchParams.get('programId')
    const departmentId = searchParams.get('departmentId')
    const semester = searchParams.get('semester')
    const yearLevel = searchParams.get('yearLevel')
    const classType = searchParams.get('classType')
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (programId) where.programId = programId
    if (departmentId) where.departmentId = departmentId
    if (semester) where.semester = semester
    if (yearLevel) where.yearLevel = parseInt(yearLevel)
    if (classType) where.classType = classType
    if (isActive) where.isActive = isActive === 'true'

    if (search) {
      where.OR = [
        { sectionName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [sections, total] = await Promise.all([
      db.section.findMany({
        where,
        include: {
          program: true,
          department: true,
          _count: {
            select: { schedules: true },
          },
        },
        skip,
        take: limit,
        orderBy: [{ yearLevel: 'asc' }, { semester: 'asc' }, { sectionName: 'asc' }],
      }),
      db.section.count({ where }),
    ])

    return NextResponse.json({
      data: sections,
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
      { error: 'Failed to fetch sections' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sectionName, yearLevel, semester, programId, departmentId, classType, population, isActive } = body

    if (!sectionName || yearLevel === undefined || yearLevel === null || !programId || !departmentId) {
      return NextResponse.json(
        { error: 'Section name, year level, programId, and departmentId are required' },
        { status: 400 }
      )
    }

    const section = await db.section.create({
      data: {
        sectionName,
        yearLevel,
        semester: semester || '1st',
        programId,
        departmentId,
        classType: classType || 'regular',
        population: population ?? 40,
        isActive: isActive ?? true,
      },
      include: {
        program: true,
        department: true,
      },
    })

    return NextResponse.json(section, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 }
    )
  }
}
