import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch subjects for a student
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Find enrollment for student
    const enrollment = await db.enrollment.findFirst({
      where: { studentId }
    });

    if (!enrollment) {
      return NextResponse.json({
        success: true,
        subjects: []
      });
    }

    // Handle both JSON string and array formats
    const subjectIds = typeof enrollment.subjectIds === 'string' 
      ? JSON.parse(enrollment.subjectIds || '[]')
      : (enrollment.subjectIds || []);

    // Get subjects
    const subjects = await db.subject.findMany({
      where: { id: { in: subjectIds } },
      include: { instructor: true }
    });

    // Get evaluations for this student
    const evaluations = await db.evaluation.findMany({
      where: { studentId }
    });
    const evaluatedSubjectIds = new Set(evaluations.map(e => e.subjectId));

    const formattedSubjects = subjects.map(subject => ({
      id: subject.id,
      code: subject.code,
      title: subject.title,
      instructorId: subject.instructorId,
      instructorName: subject.instructorName || subject.instructor?.name || 'Unknown',
      evaluationStatus: evaluatedSubjectIds.has(subject.id) ? 'completed' : 'pending'
    }));

    return NextResponse.json({
      success: true,
      subjects: formattedSubjects
    });
  } catch (error: any) {
    console.error('Get student subjects error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}
