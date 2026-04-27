import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

// GET - Generate Excel report
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const facultyId = searchParams.get('facultyId');

    const whereClause: any = {};
    if (facultyId) whereClause.facultyId = facultyId;

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
          totalScore: 0,
          count: 0
        });
      }
      
      const stats = facultyStats.get(fid);
      stats.totalScore += evaluation.totalScore;
      stats.count += 1;
    }

    // Prepare data for Excel
    const excelData = Array.from(facultyStats.values()).map((stats, index) => {
      const avgScore = stats.count > 0 ? stats.totalScore / stats.count / 5 : 0;
      const avgPercentage = (avgScore / 20) * 100;
      
      return {
        '#': index + 1,
        'Faculty Name': stats.facultyName,
        'Department': stats.department,
        'Total Evaluations': stats.count,
        'Average Score (/20)': parseFloat(avgScore.toFixed(2)),
        'Rating (%)': parseFloat(avgPercentage.toFixed(0))
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 18 },
      { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Faculty Evaluation Report');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Faculty_Evaluation_Report.xlsx"`
      }
    });

  } catch (error: any) {
    console.error('Generate Excel report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel report', details: error.message },
      { status: 500 }
    );
  }
}
