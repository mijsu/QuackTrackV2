import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch dashboard statistics
export async function GET() {
  try {
    // Get counts
    const totalStudents = await db.user.count({
      where: { role: 'student' }
    });

    const totalFaculty = await db.faculty.count();

    const totalSubjects = await db.subject.count();

    const totalEvaluations = await db.evaluation.count();

    // Get pending evaluations count
    const enrollments = await db.enrollment.findMany();
    let totalEnrollments = 0;
    for (const enrollment of enrollments) {
      // Handle both JSON string and array formats
      let subjectIds = enrollment.subjectIds;
      if (typeof subjectIds === 'string') {
        try {
          subjectIds = JSON.parse(subjectIds || '[]');
        } catch {
          subjectIds = [];
        }
      }
      if (Array.isArray(subjectIds)) {
        totalEnrollments += subjectIds.length;
      }
    }
    const pendingEvaluations = totalEnrollments - totalEvaluations;

    // Get recent evaluations
    const recentEvaluations = await db.evaluation.findMany({
      take: 5,
      orderBy: { submittedAt: 'desc' },
      include: {
        student: true,
        subject: true,
        faculty: true
      }
    });

    // Get settings
    const settings = await db.settings.findFirst();

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        totalFaculty,
        totalSubjects,
        totalEvaluations,
        completedEvaluations: totalEvaluations,
        pendingEvaluations,
        evaluationOpen: settings?.evaluationOpen ?? true
      },
      recentEvaluations: recentEvaluations.map(e => ({
        id: e.id,
        studentName: e.student?.fullName || 'Unknown',
        subjectCode: e.subject?.code || 'Unknown',
        facultyName: e.faculty?.name || e.subject?.instructorName || 'Unknown',
        totalScore: e.totalScore,
        submittedAt: e.submittedAt
      }))
    });
  } catch (error: any) {
    console.error('Get dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
