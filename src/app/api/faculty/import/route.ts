import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/faculty/import
 *
 * Bulk import faculty from CSV data.
 *
 * Expected columns (case-insensitive):
 *   name, email, department, contract (Full-time/Part-time), specialization
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

    // Fetch all departments for matching
    const allDepartments = await db.department.findMany();
    const deptMap = new Map(
      allDepartments.map((d) => [d.name.toLowerCase(), d.id])
    );

    // Hash the default password once for reuse
    const defaultPassword = 'changeme123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 1;

      try {
        // Map CSV columns (case-insensitive matching)
        const name = row['Name'] || row['name'] || '';
        const email = row['Email'] || row['email'] || '';
        const departmentName = row['Department'] || row['department'] || '';
        const contractType = row['ContractType'] || row['Contract'] || row['contractType'] || row['contract'] || 'full-time';
        const specialization = row['Specialization'] || row['specialization'] || '';
        const maxUnits = row['MaxUnits'] || row['maxUnits'] || '24';

        // Validate required fields
        if (!name.trim()) {
          errorCount++;
          errors.push({ row: rowNum, message: 'Name is required' });
          continue;
        }

        if (!email.trim()) {
          errorCount++;
          errors.push({ row: rowNum, message: 'Email is required' });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          errorCount++;
          errors.push({ row: rowNum, message: `Invalid email format: ${email}` });
          continue;
        }

        // Check if email already exists
        const existingUser = await db.user.findUnique({ where: { email: email.trim() } });
        if (existingUser) {
          errorCount++;
          errors.push({ row: rowNum, message: `Email already exists: ${email}` });
          continue;
        }

        // Resolve department
        let departmentId: string | null = null;
        if (departmentName.trim()) {
          departmentId = deptMap.get(departmentName.trim().toLowerCase()) || null;
          if (!departmentId) {
            errors.push({
              row: rowNum,
              message: `Department not found: "${departmentName}" — will be created without department`,
            });
          }
        }

        // Normalize contract type
        const normalizedContract = contractType.toLowerCase().trim();
        const validContract = normalizedContract === 'part-time' ? 'part-time' : 'full-time';

        // Parse specialization
        const specs = specialization
          .split(/[;,|]/)
          .map((s) => s.trim())
          .filter(Boolean);

        // Parse max units
        const parsedMaxUnits = parseInt(maxUnits, 10);
        const validMaxUnits = isNaN(parsedMaxUnits) || parsedMaxUnits < 1 ? 24 : parsedMaxUnits;

        // Create the faculty user
        const createdUser = await db.user.create({
          data: {
            uid: uuidv4(),
            name: name.trim(),
            email: email.trim(),
            password: hashedPassword,
            role: 'faculty',
            departmentId,
            contractType: validContract,
            maxUnits: validMaxUnits,
            specialization: JSON.stringify(specs),
          },
        });

        // Create default preferences
        await db.facultyPreference.create({
          data: {
            facultyId: createdUser.id,
            preferredDays: JSON.stringify([
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
            ]),
            preferredTimeStart: '08:00',
            preferredTimeEnd: '17:00',
            preferredSubjects: JSON.stringify([]),
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
        entity: 'user',
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
      message: `Imported ${successCount} faculty member${successCount !== 1 ? 's' : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
    });
  } catch (error) {
    console.error('Faculty import error:', error);
    return NextResponse.json(
      { error: 'Failed to import faculty' },
      { status: 500 }
    );
  }
}
