import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch evaluation report data
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
      }
    });

    // Group by faculty
    const facultyStats = new Map<string, any>();
    
    for (const evaluation of evaluations) {
      const fid = evaluation.facultyId;
      
      if (!facultyStats.has(fid)) {
        facultyStats.set(fid, {
          facultyId: fid,
          facultyName: evaluation.faculty?.name || evaluation.subject?.instructorName || 'Unknown',
          department: evaluation.faculty?.department || 'Unknown',
          evaluations: [],
          totalScore: 0,
          count: 0
        });
      }
      
      const stats = facultyStats.get(fid);
      stats.evaluations.push(evaluation);
      stats.totalScore += evaluation.totalScore;
      stats.count += 1;
    }

    // Calculate averages
    const reportData = Array.from(facultyStats.values()).map(stats => ({
      facultyId: stats.facultyId,
      facultyName: stats.facultyName,
      department: stats.department,
      totalEvaluations: stats.count,
      averageScore: stats.count > 0 ? (stats.totalScore / stats.count / 5).toFixed(2) : '0.00',
      averagePercentage: stats.count > 0 ? ((stats.totalScore / stats.count / 5 / 20) * 100).toFixed(0) : '0'
    }));

    return NextResponse.json({
      success: true,
      report: reportData
    });
  } catch (error: any) {
    console.error('Get report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
