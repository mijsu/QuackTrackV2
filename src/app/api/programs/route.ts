import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')
    const classType = searchParams.get('classType')
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')

    const where: Record<string, unknown> = {}
    if (departmentId) where.departmentId = departmentId
    if (classType) where.classType = classType
    if (isActive) where.isActive = isActive === 'true'

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ]
    }

    const programs = await db.program.findMany({
      where,
      include: {
        department: true,
        _count: {
          select: {
            subjects: true,
            sections: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      data: programs,
      pagination: { page: 1, limit: programs.length, total: programs.length, totalPages: 1 },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch programs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, description, departmentId, classType, isActive } = body

    if (!name || !code || !departmentId) {
      return NextResponse.json(
        { error: 'Name, code, and departmentId are required' },
        { status: 400 }
      )
    }

    const existing = await db.program.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json(
        { error: 'Program with this code already exists' },
        { status: 409 }
      )
    }

    const program = await db.program.create({
      data: {
        name,
        code,
        description,
        departmentId,
        classType: classType || 'regular',
        isActive: isActive ?? true,
      },
      include: { department: true },
    })

    return NextResponse.json(program, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to create program' },
      { status: 500 }
    )
  }
}
