import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

interface ScheduleWithRelations {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  status: string;
  semester: string | null;
  academicYear: string | null;
  subject: {
    id: string;
    subjectCode: string;
    subjectName: string;
    units: number;
  };
  faculty: {
    id: string;
    name: string;
    email: string;
  };
  section: {
    id: string;
    sectionName: string;
    yearLevel: number;
  };
  room: {
    id: string;
    roomName: string;
    building: string;
    capacity: number;
  };
}

// GET /api/reports/pdf
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'full';
    const facultyId = searchParams.get('facultyId');
    const sectionId = searchParams.get('sectionId');
    const roomId = searchParams.get('roomId');
    const day = searchParams.get('day');

    // Role-based filtering
    const isFaculty = session.user.role === 'faculty';
    const effectiveFacultyId = isFaculty ? session.user.id : facultyId;

    // Get active semester
    const activeSemesterSetting = await db.systemSetting.findUnique({
      where: { key: 'semester' },
    });
    const activeSemester = activeSemesterSetting?.value || '1st Semester';

    // Fetch schedules with filters
    const schedules = await db.schedule.findMany({
      where: {
        ...(effectiveFacultyId && { facultyId: effectiveFacultyId }),
        ...(sectionId && { sectionId }),
        ...(roomId && { roomId }),
        ...(day && { day }),
        semester: activeSemester,
      },
      include: {
        subject: {
          select: {
            id: true,
            subjectCode: true,
            subjectName: true,
            units: true,
          },
        },
        faculty: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        section: {
          select: {
            id: true,
            sectionName: true,
            yearLevel: true,
          },
        },
        room: {
          select: {
            id: true,
            roomName: true,
            building: true,
            capacity: true,
          },
        },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });

    // Calculate statistics
    const statistics = {
      totalSchedules: schedules.length,
      approved: schedules.filter(s => s.status === 'approved').length,
      generated: schedules.filter(s => s.status === 'generated').length,
      modified: schedules.filter(s => s.status === 'modified').length,
      conflicts: schedules.filter(s => s.status === 'conflict').length,
      uniqueFaculty: new Set(schedules.map(s => s.facultyId)).size,
      uniqueRooms: new Set(schedules.map(s => s.roomId)).size,
      uniqueSections: new Set(schedules.map(s => s.sectionId)).size,
    };

    // Prepare data for PDF generation
    const reportData = {
      reportType: type,
      schedules: schedules.filter(s => s.subject && s.faculty && s.section && s.room).map(s => ({
        id: s.id,
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        semester: s.semester,
        academicYear: s.academicYear,
        subject: {
          id: s.subject.id,
          subjectCode: s.subject.subjectCode,
          subjectName: s.subject.subjectName,
          units: s.subject.units,
        },
        faculty: {
          id: s.faculty.id,
          name: s.faculty.name,
          email: s.faculty.email,
        },
        section: {
          id: s.section.id,
          sectionName: s.section.sectionName,
          yearLevel: s.section.yearLevel,
        },
        room: {
          id: s.room.id,
          roomName: s.room.roomName,
          building: s.room.building,
          capacity: s.room.capacity,
        },
      })),
      statistics,
      filters: {
        faculty: effectiveFacultyId || 'all',
        section: sectionId || 'all',
        room: roomId || 'all',
        day: day || 'all',
      },
      generatedAt: new Date().toISOString(),
      generatedBy: session.user.name || 'Unknown',
    };

    // Create temporary file paths
    const timestamp = Date.now();
    const outputPdfPath = join(tmpdir(), `quacktrack-report-${timestamp}.pdf`);
    const jsonInputPath = join(tmpdir(), `quacktrack-data-${timestamp}.json`);

    // Write JSON data to temporary file
    await writeFile(jsonInputPath, JSON.stringify(reportData), 'utf-8');

    // Path to Python script and virtual environment
    const scriptPath = join(process.cwd(), 'scripts', 'generate_report.py');
    const venvPython = join(process.cwd(), '.venv', 'bin', 'python3');

    // Execute Python script
    try {
      const { stdout, stderr } = await execAsync(
        `"${venvPython}" "${scriptPath}" "${outputPdfPath}" '${JSON.stringify(reportData).replace(/'/g, "'\\''")}'`,
        {
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );

      if (stderr && !stderr.includes('generated successfully')) {
        console.error('Python stderr:', stderr);
      }
    } catch (execError) {
      console.error('Error executing Python script:', execError);
      
      // Clean up temp files
      try {
        await unlink(jsonInputPath);
      } catch {
        // Ignore cleanup errors
      }
      
      return NextResponse.json(
        { error: 'Failed to generate PDF report' },
        { status: 500 }
      );
    }

    // Read generated PDF
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await readFile(outputPdfPath);
    } catch (readError) {
      console.error('Error reading PDF file:', readError);
      return NextResponse.json(
        { error: 'Failed to read generated PDF' },
        { status: 500 }
      );
    }

    // Clean up temporary files
    try {
      await unlink(outputPdfPath);
      await unlink(jsonInputPath);
    } catch {
      // Ignore cleanup errors
    }

    // Generate filename based on type and filters
    const dateStr = new Date().toISOString().split('T')[0];
    let filename = `quacktrack-schedule-report-${dateStr}.pdf`;
    
    if (type === 'faculty' && effectiveFacultyId) {
      const faculty = schedules[0]?.faculty;
      if (faculty) {
        filename = `quacktrack-faculty-${faculty.name.replace(/\s+/g, '-')}-${dateStr}.pdf`;
      }
    } else if (type === 'room' && roomId) {
      const room = schedules[0]?.room;
      if (room) {
        filename = `quacktrack-room-${room.roomName.replace(/\s+/g, '-')}-${dateStr}.pdf`;
      }
    } else if (type === 'day' && day) {
      filename = `quacktrack-${day.toLowerCase()}-schedule-${dateStr}.pdf`;
    }

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF report' },
      { status: 500 }
    );
  }
}
