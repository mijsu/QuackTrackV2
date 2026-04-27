import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// GET - Generate PDF report
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

    // Create PDF
    const doc = new jsPDF();

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CAMARINES NORTE STATE COLLEGE', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('College of Trades and Technology', 105, 28, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Faculty Evaluation Report', 105, 40, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 52);

    // Table data
    const tableData = Array.from(facultyStats.values()).map((stats, index) => {
      const avgScore = stats.count > 0 ? stats.totalScore / stats.count / 5 : 0;
      const avgPercentage = (avgScore / 20) * 100;
      
      return [
        index + 1,
        stats.facultyName,
        stats.department,
        stats.count,
        avgScore.toFixed(1),
        `${avgPercentage.toFixed(0)}%`
      ];
    });

    // Generate table
    autoTable(doc, {
      startY: 60,
      head: [['#', 'Faculty Name', 'Department', 'Evaluations', 'Avg Score (/20)', 'Rating']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [139, 26, 43] },
      styles: { fontSize: 9 }
    });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Faculty_Evaluation_Report.pdf"`
      }
    });

  } catch (error: any) {
    console.error('Generate PDF report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF report', details: error.message },
      { status: 500 }
    );
  }
}
