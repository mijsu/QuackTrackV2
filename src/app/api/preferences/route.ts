import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const facultyId = searchParams.get('facultyId')
    const semester = searchParams.get('semester')
    const academicYear = searchParams.get('academicYear')

    const where: Record<string, unknown> = {}
    if (facultyId) where.facultyId = facultyId
    if (semester) where.semester = semester
    if (academicYear) where.academicYear = academicYear

    const preferences = await db.facultyPreference.findMany({
      where,
      include: {
        faculty: {
          select: { id: true, name: true, uid: true, email: true, specialization: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      data: preferences,
      pagination: { page: 1, limit: preferences.length, total: preferences.length, totalPages: 1 },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      facultyId,
      preferredDays,
      preferredTimeStart,
      preferredTimeEnd,
      unavailableDays,
      unavailableTimeSlots,
      preferredSubjects,
      maxUnitsOverride,
      notes,
      semester,
      academicYear,
    } = body

    if (!facultyId) {
      return NextResponse.json(
        { error: 'Faculty ID is required' },
        { status: 400 }
      )
    }

    // Check if preference exists for this faculty/semester/year
    const existing = await db.facultyPreference.findFirst({
      where: {
        facultyId,
        semester: semester || '1st',
        academicYear: academicYear || new Date().getFullYear().toString(),
      },
    })

    if (existing) {
      // Update existing preference
      const updated = await db.facultyPreference.update({
        where: { id: existing.id },
        data: {
          preferredDays,
          preferredTimeStart,
          preferredTimeEnd,
          unavailableDays,
          unavailableTimeSlots,
          preferredSubjects,
          maxUnitsOverride,
          notes,
        },
        include: {
          faculty: {
            select: { id: true, name: true, uid: true },
          },
        },
      })
      return NextResponse.json(updated)
    }

    // Create new preference
    const preference = await db.facultyPreference.create({
      data: {
        facultyId,
        preferredDays,
        preferredTimeStart,
        preferredTimeEnd,
        unavailableDays,
        unavailableTimeSlots,
        preferredSubjects,
        maxUnitsOverride,
        notes,
        semester: semester || '1st',
        academicYear: academicYear || new Date().getFullYear().toString(),
      },
      include: {
        faculty: {
          select: { id: true, name: true, uid: true },
        },
      },
    })

    return NextResponse.json(preference, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to create/update preference' },
      { status: 500 }
    )
  }
}
