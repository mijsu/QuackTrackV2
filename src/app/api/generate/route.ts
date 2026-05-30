import { NextRequest, NextResponse } from 'next/server'
import { generateSchedules } from '@/lib/scheduling'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { semester, academicYear, departmentId, configId, classType } = body

    if (!semester || !academicYear) {
      return NextResponse.json(
        { error: 'Semester and academicYear are required' },
        { status: 400 }
      )
    }

    const result = await generateSchedules({
      semester,
      academicYear,
      departmentId,
      configId,
      classType,
    })

    // Always return 200 — the generation request was processed. The 'status' field
    // in the result (completed/partial/failed) is a business outcome, not an HTTP
    // error. Returning non-2xx causes apiFetch to discard the response body,
    // hiding the actual error message from the user.
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Schedule generation failed' },
      { status: 500 }
    )
  }
}
