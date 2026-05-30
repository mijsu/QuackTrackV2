import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const department = await db.department.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, uid: true, name: true, email: true, role: true, status: true },
        },
        programs: true,
        subjects: true,
        sections: true,
      },
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    return NextResponse.json(department)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch department' },
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

    const existing = await db.department.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Check code uniqueness if being updated
    if (body.code && body.code !== existing.code) {
      const conflict = await db.department.findUnique({ where: { code: body.code } })
      if (conflict) {
        return NextResponse.json(
          { error: 'Department with this code already exists' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.code !== undefined) updateData.code = body.code
    if (body.college !== undefined) updateData.college = body.college
    if (body.classType !== undefined) updateData.classType = body.classType

    const department = await db.department.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(department)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to update department' },
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

    const existing = await db.department.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, programs: true, subjects: true, sections: true } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    if (
      existing._count.users > 0 ||
      existing._count.programs > 0 ||
      existing._count.subjects > 0 ||
      existing._count.sections > 0
    ) {
      return NextResponse.json(
        { error: 'Cannot delete department with existing records. Please reassign or delete them first.' },
        { status: 400 }
      )
    }

    await db.department.delete({ where: { id } })
    return NextResponse.json({ message: 'Department deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    )
  }
}
