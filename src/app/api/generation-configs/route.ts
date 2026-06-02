import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isDefault = searchParams.get('isDefault')

    const where: Record<string, unknown> = {}
    if (isDefault) where.isDefault = isDefault === 'true'

    const configs = await db.generationConfig.findMany({
      where,
      include: {
        _count: {
          select: { generationSessions: true },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({
      data: configs,
      pagination: { page: 1, limit: configs.length, total: configs.length, totalPages: 1 },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch generation configs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, config, isDefault } = body

    if (!name || !config) {
      return NextResponse.json(
        { error: 'Name and config are required' },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.generationConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const generationConfig = await db.generationConfig.create({
      data: {
        name,
        description,
        config: typeof config === 'string' ? config : JSON.stringify(config),
        isDefault: isDefault ?? false,
      },
    })

    return NextResponse.json(generationConfig, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to create generation config' },
      { status: 500 }
    )
  }
}
