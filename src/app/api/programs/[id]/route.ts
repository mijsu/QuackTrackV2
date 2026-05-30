import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const program = await db.program.findUnique({
      where: { id },
      include: {
        department: true,
        subjects: true,
        sections: true,
      },
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    return NextResponse.json(program)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch program' },
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

    const existing = await db.program.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    if (body.code && body.code !== existing.code) {
      const conflict = await db.program.findUnique({ where: { code: body.code } })
      if (conflict) {
        return NextResponse.json(
          { error: 'Program with this code already exists' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.code !== undefined) updateData.code = body.code
    if (body.description !== undefined) updateData.description = body.description
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.classType !== undefined) updateData.classType = body.classType

    const program = await db.program.update({
      where: { id },
      data: updateData,
      include: { department: true },
    })

    return NextResponse.json(program)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to update program' },
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

    const existing = await db.program.findUnique({
      where: { id },
      include: { _count: { select: { subjects: true, sections: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    if (existing._count.subjects > 0 || existing._count.sections > 0) {
      return NextResponse.json(
        { error: 'Cannot delete program with existing subjects or sections. Please remove or reassign them first.' },
        { status: 400 }
      )
    }

    await db.program.delete({ where: { id } })
    return NextResponse.json({ message: 'Program deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to delete program' },
      { status: 500 }
    )
  }
}
