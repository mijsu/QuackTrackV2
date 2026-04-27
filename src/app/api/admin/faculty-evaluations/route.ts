import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch all evaluations with details
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const facultyId = searchParams.get('facultyId');
    const subjectId = searchParams.get('subjectId');

    const whereClause: any = {};
    if (facultyId) whereClause.facultyId = facultyId;
    if (subjectId) whereClause.subjectId = subjectId;

    const evaluations = await db.evaluation.findMany({
      where: whereClause,
      include: {
        student: true,
        subject: true,
        faculty: true
      },
      orderBy: { submittedAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      evaluations: evaluations.map(e => ({
        id: e.id,
        studentId: e.studentId,
        studentName: e.student?.fullName || 'Unknown',
        studentUsername: e.student?.username || 'Unknown',
        subjectId: e.subjectId,
        subjectCode: e.subject?.code || 'Unknown',
        subjectTitle: e.subject?.title || 'Unknown',
        facultyId: e.facultyId,
        facultyName: e.faculty?.name || e.subject?.instructorName || 'Unknown',
        totalScore: e.totalScore,
        ratings: typeof e.ratings === 'string' ? JSON.parse(e.ratings || '[]') : (e.ratings || []),
        semester: e.semester,
        schoolYear: e.schoolYear,
        submittedAt: e.submittedAt
      }))
    });
  } catch (error: any) {
    console.error('Get evaluations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluations' },
      { status: 500 }
    );
  }
}
