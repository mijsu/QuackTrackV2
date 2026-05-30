import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const section = await db.section.findUnique({
      where: { id },
      include: {
        program: true,
        department: true,
        schedules: {
          include: {
            subject: true,
            faculty: { select: { id: true, name: true, uid: true } },
            scheduleVersion: true,
          },
        },
      },
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    return NextResponse.json(section)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch section' },
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

    const existing = await db.section.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.sectionName !== undefined) updateData.sectionName = body.sectionName
    if (body.yearLevel !== undefined) updateData.yearLevel = body.yearLevel
    if (body.semester !== undefined) updateData.semester = body.semester
    if (body.programId !== undefined) updateData.programId = body.programId
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId
    if (body.population !== undefined) updateData.population = body.population
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.classType !== undefined) updateData.classType = body.classType

    const section = await db.section.update({
      where: { id },
      data: updateData,
      include: {
        program: true,
        department: true,
      },
    })

    return NextResponse.json(section)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to update section' },
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

    const existing = await db.section.findUnique({
      where: { id },
      include: { _count: { select: { schedules: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    if (existing._count.schedules > 0) {
      return NextResponse.json(
        { error: 'Cannot delete section with existing schedules. Please remove or reassign them first.' },
        { status: 400 }
      )
    }

    await db.section.delete({ where: { id } })
    return NextResponse.json({ message: 'Section deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 }
    )
  }
}
