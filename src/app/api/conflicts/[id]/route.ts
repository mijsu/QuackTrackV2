import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.conflict.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 })
    }

    const conflict = await db.conflict.update({
      where: { id },
      data: {
        isResolved: body.isResolved ?? true,
        resolvedAt: body.isResolved !== false ? new Date() : null,
      },
      include: {
        schedule1: {
          include: {
            subject: true,
            faculty: { select: { id: true, name: true } },
            section: true,
          },
        },
        schedule2: {
          include: {
            subject: true,
            faculty: { select: { id: true, name: true } },
            section: true,
          },
        },
      },
    })

    return NextResponse.json(conflict)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to resolve conflict' },
      { status: 500 }
    )
  }
}
