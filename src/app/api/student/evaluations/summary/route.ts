import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch evaluation summary for a student
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

    // Get student info
    const student = await db.user.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get evaluations for this student
    const evaluations = await db.evaluation.findMany({
      where: { studentId },
      include: {
        subject: true,
        faculty: true
      }
    });

    const formattedEvaluations = evaluations.map(evaluation => ({
      id: evaluation.id,
      subjectId: evaluation.subjectId,
      subjectCode: evaluation.subject?.code || 'Unknown',
      subjectTitle: evaluation.subject?.title || 'Unknown',
      facultyId: evaluation.facultyId,
      facultyName: evaluation.faculty?.name || evaluation.subject?.instructorName || 'Unknown',
      totalScore: evaluation.totalScore,
      ratings: typeof evaluation.ratings === 'string' ? JSON.parse(evaluation.ratings || '[]') : (evaluation.ratings || []),
      submittedAt: evaluation.submittedAt
    }));

    return NextResponse.json({
      success: true,
      studentInfo: {
        id: student.id,
        fullName: student.fullName,
        studentId: student.studentId,
        email: student.email
      },
      evaluations: formattedEvaluations
    });
  } catch (error: any) {
    console.error('Get evaluation summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluation summary' },
      { status: 500 }
    );
  }
}
