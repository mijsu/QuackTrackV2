import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const preference = await db.facultyPreference.findUnique({
      where: { id },
      include: {
        faculty: {
          select: { id: true, name: true, uid: true, email: true, specialization: true },
        },
      },
    })

    if (!preference) {
      return NextResponse.json({ error: 'Preference not found' }, { status: 404 })
    }

    return NextResponse.json(preference)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch preference' },
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

    const existing = await db.facultyPreference.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Preference not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.preferredDays !== undefined) updateData.preferredDays = body.preferredDays
    if (body.preferredTimeStart !== undefined) updateData.preferredTimeStart = body.preferredTimeStart
    if (body.preferredTimeEnd !== undefined) updateData.preferredTimeEnd = body.preferredTimeEnd
    if (body.unavailableDays !== undefined) updateData.unavailableDays = body.unavailableDays
    if (body.unavailableTimeSlots !== undefined) updateData.unavailableTimeSlots = body.unavailableTimeSlots
    if (body.preferredSubjects !== undefined) updateData.preferredSubjects = body.preferredSubjects
    if (body.maxUnitsOverride !== undefined) updateData.maxUnitsOverride = body.maxUnitsOverride
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.semester !== undefined) updateData.semester = body.semester
    if (body.academicYear !== undefined) updateData.academicYear = body.academicYear

    const preference = await db.facultyPreference.update({
      where: { id },
      data: updateData,
      include: {
        faculty: {
          select: { id: true, name: true, uid: true },
        },
      },
    })

    return NextResponse.json(preference)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to update preference' },
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

    const existing = await db.facultyPreference.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Preference not found' }, { status: 404 })
    }

    await db.facultyPreference.delete({ where: { id } })
    return NextResponse.json({ message: 'Preference deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to delete preference' },
      { status: 500 }
    )
  }
}
