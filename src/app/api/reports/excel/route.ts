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

// GET /api/reports/excel
export async function GET(request: NextRequest) {
  let tempJsonPath: string | null = null;
  let tempExcelPath: string | null = null;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const facultyId = searchParams.get('facultyId');
    const day = searchParams.get('day');
    const roomId = searchParams.get('roomId');
    const semesterParam = searchParams.get('semester');

    // Role-based filtering
    const isFaculty = session.user.role === 'faculty';
    const filterFacultyId = isFaculty ? session.user.id : facultyId;

    // Fetch active semester from system settings (if no semester param provided)
    let activeSemester = semesterParam;
    if (!activeSemester) {
      const activeSemesterSetting = await db.systemSetting.findUnique({
        where: { key: 'semester' },
      });
      activeSemester = activeSemesterSetting?.value || '1st Semester';
    }

    // Fetch schedules with all related data
    const schedules = await db.schedule.findMany({
      where: {
        ...(sectionId && sectionId !== 'all' && { sectionId }),
        ...(filterFacultyId && filterFacultyId !== 'all' && { facultyId: filterFacultyId }),
        ...(day && day !== 'all' && { day }),
        ...(roomId && roomId !== 'all' && { roomId }),
        semester: activeSemester,
      },
      include: {
        subject: {
          include: {
            program: {
              include: {
                department: true,
              },
            },
          },
        },
        faculty: {
          include: {
            department: true,
          },
        },
        section: {
          include: {
            department: true,
            program: true,
          },
        },
        room: true,
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });

    // Transform schedules to a JSON-serializable format
    const schedulesJson = schedules.map((s) => ({
      id: s.id,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      semester: s.semester,
      academicYear: s.academicYear,
      facultyId: s.facultyId,
      subjectId: s.subjectId,
      sectionId: s.sectionId,
      roomId: s.roomId,
      subject: s.subject
        ? {
            subjectCode: s.subject.subjectCode,
            subjectName: s.subject.subjectName,
            units: s.subject.units,
            yearLevel: s.subject.yearLevel,
            semester: s.subject.semester,
            program: s.subject.program
              ? {
                  name: s.subject.program.name,
                  code: s.subject.program.code,
                  department: s.subject.program.department
                    ? {
                        name: s.subject.program.department.name,
                        college: s.subject.program.department.college,
                      }
                    : null,
                }
              : null,
          }
        : null,
      faculty: s.faculty
        ? {
            name: s.faculty.name,
            email: s.faculty.email,
            contractType: s.faculty.contractType,
            department: s.faculty.department
              ? {
                  name: s.faculty.department.name,
                  college: s.faculty.department.college,
                }
              : null,
          }
        : null,
      section: s.section
        ? {
            sectionName: s.section?.sectionName,
            yearLevel: s.section?.yearLevel,
            studentCount: s.section?.studentCount,
            program: s.section.program
              ? {
                  name: s.section.program.name,
                  code: s.section.program.code,
                }
              : null,
            department: s.section.department
              ? {
                  name: s.section.department.name,
                }
              : null,
          }
        : null,
      room: s.room
        ? {
            roomName: s.room.roomName,
            roomCode: s.room.roomCode,
            building: s.room.building,
            floor: s.room.floor,
            capacity: s.room.capacity,
          }
        : null,
    }));

    // Create temporary files
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    tempJsonPath = join(tmpdir(), `schedules_${timestamp}_${randomId}.json`);
    tempExcelPath = join(tmpdir(), `report_${timestamp}_${randomId}.xlsx`);

    // Write schedule data to temporary JSON file
    await writeFile(tempJsonPath, JSON.stringify(schedulesJson, null, 2));

    // Execute Python script to generate Excel
    const scriptPath = join(process.cwd(), 'scripts', 'generate_excel.py');
    
    try {
      const { stdout, stderr } = await execAsync(
        `python3 "${scriptPath}" --output "${tempExcelPath}" --data "${tempJsonPath}"`,
        { timeout: 30000 }
      );

      if (stderr && !stderr.includes('Excel report generated')) {
        console.error('Python stderr:', stderr);
      }
    } catch (execError: unknown) {
      console.error('Python script execution error:', execError);
      
      // Check if the file was still created despite the error
      try {
        await readFile(tempExcelPath);
      } catch {
        throw new Error('Failed to generate Excel file. Please ensure Python3 and openpyxl are installed.');
      }
    }

    // Read the generated Excel file
    const excelBuffer = await readFile(tempExcelPath);

    // Generate filename with current date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `QuackTrack_Schedule_Report_${dateStr}.xlsx`;

    // Return the Excel file as a download
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating Excel report:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel report. Please ensure Python3 and openpyxl are installed on the server.' },
      { status: 500 }
    );
  } finally {
    // Clean up temporary files
    if (tempJsonPath) {
      try {
        await unlink(tempJsonPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    if (tempExcelPath) {
      try {
        await unlink(tempExcelPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
