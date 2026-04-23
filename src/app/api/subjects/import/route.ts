import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/subjects/import
 *
 * Bulk import subjects from CSV data.
 *
 * Expected columns (case-insensitive):
 *   SubjectCode (required), SubjectName (required), YearLevel, Semester,
 *   Units, Duration, Department, Program, Specialization, Type
 *
 * Body: { records: Record<string, string>[] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const records: Record<string, string>[] = body.records;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }

    if (records.length > 200) {
      return NextResponse.json(
        { error: 'Too many records. Maximum 200 records per import.' },
        { status: 400 }
      );
    }

    // Fetch all departments and programs for name resolution
    const allDepartments = await db.department.findMany();
    const allPrograms = await db.program.findMany({
      include: { department: true },
    });

    const deptMap = new Map(
      allDepartments.map((d) => [d.name.toLowerCase(), d.id])
    );
    const programMap = new Map(
      allPrograms.map((p) => [p.name.toLowerCase(), { id: p.id, departmentId: p.departmentId }])
    );

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 1;

      try {
        // Map CSV columns (case-insensitive matching)
        const subjectCode = row['SubjectCode'] || row['subjectCode'] || '';
        const subjectName = row['SubjectName'] || row['subjectName'] || '';
        const rawYearLevel = row['YearLevel'] || row['yearLevel'] || '1';
        const rawSemester = row['Semester'] || row['semester'] || '1st';
        const rawUnits = row['Units'] || row['units'] || '3';
        const rawDuration = row['Duration'] || row['duration'] || '3';
        const departmentName = row['Department'] || row['department'] || '';
        const programName = row['Program'] || row['program'] || '';
        const specialization = row['Specialization'] || row['specialization'] || '';
        const type = row['Type'] || row['type'] || 'lecture';

        // Validate required fields
        if (!subjectCode.trim()) {
          errorCount++;
          errors.push({ row: rowNum, message: 'SubjectCode is required' });
          continue;
        }

        if (!subjectName.trim()) {
          errorCount++;
          errors.push({ row: rowNum, message: 'SubjectName is required' });
          continue;
        }

        // Parse year level
        const parsedYearLevel = parseInt(rawYearLevel, 10);
        const yearLevel = isNaN(parsedYearLevel) || parsedYearLevel < 1 || parsedYearLevel > 4
          ? 1
          : parsedYearLevel;

        // Normalize semester
        const semLower = rawSemester.toLowerCase().trim();
        let semester: string;
        if (
          semLower === '1' ||
          semLower === '1st' ||
          semLower === '1st semester' ||
          semLower === 'first semester' ||
          semLower === 'first'
        ) {
          semester = '1st Semester';
        } else if (
          semLower === '2' ||
          semLower === '2nd' ||
          semLower === '2nd semester' ||
          semLower === 'second semester' ||
          semLower === 'second'
        ) {
          semester = '2nd Semester';
        } else if (semLower === 'summer') {
          semester = 'Summer';
        } else {
          semester = rawSemester.trim();
        }

        // Parse units
        const parsedUnits = parseInt(rawUnits, 10);
        const units = isNaN(parsedUnits) || parsedUnits < 1 ? 3 : parsedUnits;

        // Parse duration
        const parsedDuration = parseInt(rawDuration, 10);
        const defaultDurationHours = isNaN(parsedDuration) || parsedDuration < 1 ? 3 : parsedDuration;

        // Parse specialization
        const specs = specialization
          .split(/[;,|]/)
          .map((s) => s.trim())
          .filter(Boolean);

        // Resolve program and department
        let programId: string | null = null;
        let departmentId: string | null = null;

        if (programName.trim()) {
          const match = programMap.get(programName.trim().toLowerCase());
          if (match) {
            programId = match.id;
            departmentId = match.departmentId;
          } else {
            errors.push({
              row: rowNum,
              message: `Program not found: "${programName}" — skipping record`,
            });
          }
        }

        // Fallback: resolve department directly if no program matched
        if (!departmentId && departmentName.trim()) {
          departmentId = deptMap.get(departmentName.trim().toLowerCase()) || null;
          if (!departmentId) {
            errors.push({
              row: rowNum,
              message: `Department not found: "${departmentName}" — using default`,
            });
          }
        }

        if (!programId) {
          errorCount++;
          errors.push({
            row: rowNum,
            message: `No valid program found for "${programName}" — skipping record. A valid program name is required.`,
          });
          continue;
        }

        if (!departmentId) {
          // Try to get departmentId from the program
          const program = allPrograms.find((p) => p.id === programId);
          departmentId = program?.departmentId || null;
        }

        if (!departmentId) {
          errorCount++;
          errors.push({
            row: rowNum,
            message: `Cannot determine department for record — skipping`,
          });
          continue;
        }

        // Check if subject code already exists within the program
        const existingSubject = await db.subject.findFirst({
          where: {
            subjectCode: subjectCode.trim(),
            programId,
          },
        });
        if (existingSubject) {
          errorCount++;
          errors.push({
            row: rowNum,
            message: `Subject code "${subjectCode}" already exists in the target program`,
          });
          continue;
        }

        // Determine required equipment based on type
        const typeLower = type.toLowerCase().trim();
        let requiredEquipment = '[]';
        if (typeLower === 'laboratory' || typeLower === 'lab') {
          requiredEquipment = JSON.stringify(['Laboratory Equipment']);
        } else if (typeLower === 'computer') {
          requiredEquipment = JSON.stringify(['Computers', 'Software']);
        }

        // Create the subject
        await db.subject.create({
          data: {
            subjectCode: subjectCode.trim(),
            subjectName: subjectName.trim(),
            units,
            programId,
            departmentId,
            yearLevel,
            semester,
            requiredSpecialization: JSON.stringify(specs),
            requiredEquipment,
            defaultDurationHours,
            isActive: true,
          },
        });

        successCount++;
      } catch (err) {
        errorCount++;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ row: rowNum, message: msg });
      }
    }

    // Create audit log for the import
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'import',
        entity: 'subject',
        details: JSON.stringify({
          source: 'csv',
          total: records.length,
          success: successCount,
          errors: errorCount,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      imported: successCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${successCount} subject${successCount !== 1 ? 's' : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
    });
  } catch (error) {
    console.error('Subjects import error:', error);
    return NextResponse.json(
      { error: 'Failed to import subjects' },
      { status: 500 }
    );
  }
}
