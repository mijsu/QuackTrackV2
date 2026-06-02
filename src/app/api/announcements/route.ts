import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')
    const priority = searchParams.get('priority')

    const where: Record<string, unknown> = {}
    if (isActive) where.isActive = isActive === 'true'
    if (priority) where.priority = priority

    const announcements = await db.announcement.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, uid: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({
      data: announcements,
      pagination: { page: 1, limit: announcements.length, total: announcements.length, totalPages: 1 },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, priority, isActive, authorId, expiresAt } = body

    if (!title || !content || !authorId) {
      return NextResponse.json(
        { error: 'Title, content, and authorId are required' },
        { status: 400 }
      )
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        priority: priority || 'normal',
        isActive: isActive ?? true,
        authorId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        author: { select: { id: true, name: true, uid: true } },
      },
    })

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 }
    )
  }
}
