import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const college = searchParams.get('college')

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (college) where.college = college

    const departments = await db.department.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            programs: true,
            subjects: true,
            sections: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      data: departments,
      pagination: { page: 1, limit: departments.length, total: departments.length, totalPages: 1 },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, college, classType } = body

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      )
    }

    const existing = await db.department.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json(
        { error: 'Department with this code already exists' },
        { status: 409 }
      )
    }

    const department = await db.department.create({
      data: { name, code, college, classType: classType || 'regular' },
    })

    return NextResponse.json(department, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    )
  }
}
