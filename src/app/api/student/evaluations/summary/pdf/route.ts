import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// GET - Generate PDF summary for a student
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
    doc.text('Faculty Evaluation Summary', 105, 40, { align: 'center' });

    // Student Info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Student Name: ${student.fullName}`, 20, 55);
    doc.text(`Student ID: ${student.studentId || 'N/A'}`, 20, 62);
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 20, 69);

    // Table data
    const tableData = evaluations.map((evaluation, index) => {
      const score = evaluation.totalScore / 5;
      const percentage = (score / 20) * 100;
      
      return [
        index + 1,
        evaluation.subject?.code || 'N/A',
        evaluation.subject?.title || 'N/A',
        evaluation.faculty?.name || evaluation.subject?.instructorName || 'N/A',
        score.toFixed(1),
        `${percentage.toFixed(0)}%`
      ];
    });

    // Generate table
    autoTable(doc, {
      startY: 80,
      head: [['#', 'Subject Code', 'Subject Title', 'Instructor', 'Score (/20)', 'Rating']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [139, 26, 43] },
      styles: { fontSize: 9 }
    });

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    if (evaluations.length > 0) {
      const avgScore = evaluations.reduce((sum, e) => sum + e.totalScore, 0) / evaluations.length / 5;
      const avgPercentage = (avgScore / 20) * 100;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Faculty Evaluated: ${evaluations.length}`, 20, finalY);
      doc.text(`Average Score: ${avgScore.toFixed(1)} / 20`, 20, finalY + 7);
      doc.text(`Average Rating: ${avgPercentage.toFixed(0)}%`, 20, finalY + 14);
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Evaluation_Summary_${student.studentId || student.fullName}.pdf"`
      }
    });

  } catch (error: any) {
    console.error('Generate PDF error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}
