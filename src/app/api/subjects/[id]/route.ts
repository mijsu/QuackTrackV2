import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const subject = await db.subject.findUnique({
      where: { id },
      include: {
        department: true,
        program: true,
        schedules: {
          include: {
            faculty: { select: { id: true, name: true, uid: true } },
            section: true,
          },
        },
      },
    })

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    return NextResponse.json(subject)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch subject' },
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

    const existing = await db.subject.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }



    const updateData: Record<string, unknown> = {}
    if (body.subjectCode !== undefined) updateData.subjectCode = body.subjectCode
    if (body.subjectName !== undefined) updateData.subjectName = body.subjectName
    if (body.description !== undefined) updateData.description = body.description
    if (body.units !== undefined) updateData.units = body.units
    if (body.programId !== undefined) updateData.programId = body.programId
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId
    if (body.subjectType !== undefined) updateData.subjectType = body.subjectType
    if (body.classType !== undefined) updateData.classType = body.classType
    if (body.yearLevel !== undefined) updateData.yearLevel = body.yearLevel
    if (body.semester !== undefined) updateData.semester = body.semester
    if (body.requiredSpecialization !== undefined) updateData.requiredSpecialization = body.requiredSpecialization
    if (body.requiredEquipment !== undefined) updateData.requiredEquipment = body.requiredEquipment
    if (body.defaultDurationHours !== undefined) updateData.defaultDurationHours = body.defaultDurationHours
    if (body.lectureHours !== undefined) updateData.lectureHours = body.lectureHours
    if (body.labHours !== undefined) updateData.labHours = body.labHours
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const subject = await db.subject.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        program: true,
      },
    })

    return NextResponse.json(subject)
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
      { error: 'Failed to update subject' },
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

    const existing = await db.subject.findUnique({
      where: { id },
      include: { _count: { select: { schedules: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    if (existing._count.schedules > 0) {
      return NextResponse.json(
        { error: 'Cannot delete subject with existing schedules. Please remove or reassign them first.' },
        { status: 400 }
      )
    }

    await db.subject.delete({ where: { id } })
    return NextResponse.json({ message: 'Subject deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to delete subject' },
      { status: 500 }
    )
  }
}
