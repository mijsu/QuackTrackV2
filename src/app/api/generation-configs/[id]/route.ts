import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const config = await db.generationConfig.findUnique({
      where: { id },
      include: {
        _count: {
          select: { generationSessions: true },
        },
      },
    })

    if (!config) {
      return NextResponse.json({ error: 'Generation config not found' }, { status: 404 })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch generation config' },
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

    const existing = await db.generationConfig.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Generation config not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await db.generationConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault
    if (body.config !== undefined) {
      updateData.config = typeof body.config !== 'string' ? JSON.stringify(body.config) : body.config
    }

    const config = await db.generationConfig.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to update generation config' },
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

    const existing = await db.generationConfig.findUnique({
      where: { id },
      include: { _count: { select: { generationSessions: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Generation config not found' }, { status: 404 })
    }

    if (existing._count.generationSessions > 0) {
      return NextResponse.json(
        { error: 'Cannot delete generation config with existing sessions. Please delete them first.' },
        { status: 400 }
      )
    }

    await db.generationConfig.delete({ where: { id } })
    return NextResponse.json({ message: 'Generation config deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to delete generation config' },
      { status: 500 }
    )
  }
}
