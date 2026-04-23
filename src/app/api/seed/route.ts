import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// ============================================================================
// Comprehensive Seed Data Endpoint
// ============================================================================
// POST /api/seed — Creates demo data for Pateros Technological College
// Idempotent: checks for existing data before creating.
// Requires admin authentication via getServerSession + authOptions.
// Uses Prisma $transaction for atomic operations.
// ============================================================================

interface SeedCounts {
  departments: number;
  programs: number;
  rooms: number;
  subjects: number;
  faculty: number;
  sections: number;
  schedules: number;
  settings: number;
}

interface TotalCounts {
  departments: number;
  programs: number;
  rooms: number;
  subjects: number;
  faculty: number;
  sections: number;
  schedules: number;
  settings: number;
}

export async function POST() {
  try {
    // ── Admin auth check ──────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    console.log('[SEED] Starting comprehensive seed data creation...');

    const counts: SeedCounts = {
      departments: 0,
      programs: 0,
      rooms: 0,
      subjects: 0,
      faculty: 0,
      sections: 0,
      schedules: 0,
      settings: 0,
    };

    // =========================================================================
    // 1. DEPARTMENTS
    // =========================================================================
    const departmentData = [
      { name: 'Computer Studies', code: 'CS', college: 'College of Computing' },
      { name: 'Business Administration', code: 'BA', college: 'College of Business' },
      { name: 'Education', code: 'ED', college: 'College of Education' },
      { name: 'Engineering', code: 'EN', college: 'College of Engineering' },
      { name: 'Arts & Sciences', code: 'AS', college: 'College of Arts & Sciences' },
      { name: 'Hospitality Management', code: 'HM', college: 'College of Hospitality' },
    ];

    const departments: Record<string, string> = {};
    for (const dept of departmentData) {
      const existing = await db.department.findFirst({ where: { name: dept.name } });
      if (existing) {
        departments[dept.name] = existing.id;
      } else {
        const created = await db.department.create({ data: dept });
        departments[dept.name] = created.id;
        counts.departments++;
      }
    }

    // =========================================================================
    // 2. PROGRAMS
    // =========================================================================
    const programData = [
      { name: 'Bachelor of Science in Information Technology', code: 'BSIT', departmentId: departments['Computer Studies']!, description: 'IT program focused on software development, networking, and systems administration' },
      { name: 'Bachelor of Science in Computer Science', code: 'BSCS', departmentId: departments['Computer Studies']!, description: 'CS program focused on algorithms, data structures, and computational theory' },
      { name: 'Bachelor of Science in Business Administration', code: 'BSBA', departmentId: departments['Business Administration']!, description: 'Business administration with majors in marketing and management' },
      { name: 'Bachelor of Secondary Education', code: 'BSED', departmentId: departments['Education']!, description: 'Secondary education with various specializations' },
      { name: 'Bachelor of Science in Electrical Engineering', code: 'BSEE', departmentId: departments['Engineering']!, description: 'Electrical engineering with focus on power systems and electronics' },
      { name: 'Bachelor of Arts in English', code: 'AB English', departmentId: departments['Arts & Sciences']!, description: 'English language and literature studies' },
      { name: 'Bachelor of Science in Hospitality Management', code: 'BSHM', departmentId: departments['Hospitality Management']!, description: 'Hospitality management for hotel and restaurant industries' },
      { name: 'Bachelor of Science in Civil Engineering', code: 'BSCE', departmentId: departments['Engineering']!, description: 'Civil engineering with focus on structural and construction management' },
    ];

    const programs: Record<string, string> = {};
    for (const prog of programData) {
      const existing = await db.program.findFirst({ where: { code: prog.code } });
      if (existing) {
        programs[prog.code] = existing.id;
      } else {
        const created = await db.program.create({ data: prog });
        programs[prog.code] = created.id;
        counts.programs++;
      }
    }

    // =========================================================================
    // 3. ROOMS
    // =========================================================================
    const roomData = [
      { roomName: 'Room 101', roomCode: 'MB-101', capacity: 40, building: 'Main Building', floor: 1, equipment: '["Projector", "Whiteboard", "Air Conditioning"]' },
      { roomName: 'Room 102', roomCode: 'MB-102', capacity: 35, building: 'Main Building', floor: 1, equipment: '["Projector", "Whiteboard"]' },
      { roomName: 'Room 201', roomCode: 'MB-201', capacity: 45, building: 'Main Building', floor: 2, equipment: '["Projector", "Whiteboard", "Air Conditioning", "Sound System"]' },
      { roomName: 'Room 202', roomCode: 'MB-202', capacity: 30, building: 'Main Building', floor: 2, equipment: '["Whiteboard"]' },
      { roomName: 'Computer Lab 1', roomCode: 'IT-L1', capacity: 50, building: 'IT Building', floor: 1, equipment: '["Computers", "Projector", "Air Conditioning", "Whiteboard"]' },
      { roomName: 'Computer Lab 2', roomCode: 'IT-L2', capacity: 45, building: 'IT Building', floor: 2, equipment: '["Computers", "Projector", "Air Conditioning"]' },
      { roomName: 'Computer Lab 3', roomCode: 'IT-L3', capacity: 40, building: 'IT Building', floor: 2, equipment: '["Computers", "Projector"]' },
      { roomName: 'Science Lab 1', roomCode: 'SC-L1', capacity: 35, building: 'Science Building', floor: 1, equipment: '["Lab Equipment", "Fume Hood", "Projector"]' },
      { roomName: 'Science Lab 2', roomCode: 'SC-L2', capacity: 30, building: 'Science Building', floor: 2, equipment: '["Lab Equipment", "Projector"]' },
      { roomName: 'Lecture Hall', roomCode: 'MB-AUD', capacity: 120, building: 'Main Building', floor: 1, equipment: '["Projector", "Microphone", "Sound System", "Air Conditioning"]' },
    ];

    const rooms: Record<string, string> = {};
    for (const room of roomData) {
      const existing = await db.room.findFirst({ where: { roomCode: room.roomCode } });
      if (existing) {
        rooms[room.roomCode] = existing.id;
      } else {
        const created = await db.room.create({ data: room });
        rooms[room.roomCode] = created.id;
        counts.rooms++;
      }
    }

    // =========================================================================
    // 4. SUBJECTS
    // =========================================================================
    const subjectData = [
      { subjectCode: 'IT 101', subjectName: 'Introduction to Computing', units: 3, programId: programs['BSIT']!, departmentId: departments['Computer Studies']!, yearLevel: 1, semester: '1st Semester', description: 'Fundamentals of computing and information technology' },
      { subjectCode: 'IT 102', subjectName: 'Computer Programming 1', units: 3, programId: programs['BSIT']!, departmentId: departments['Computer Studies']!, yearLevel: 1, semester: '1st Semester', description: 'Introduction to programming using Python', requiredEquipment: '["Computers"]' },
      { subjectCode: 'IT 201', subjectName: 'Database Management Systems', units: 3, programId: programs['BSIT']!, departmentId: departments['Computer Studies']!, yearLevel: 2, semester: '1st Semester', description: 'Relational database design and SQL', requiredEquipment: '["Computers"]' },
      { subjectCode: 'IT 202', subjectName: 'Web Development', units: 3, programId: programs['BSIT']!, departmentId: departments['Computer Studies']!, yearLevel: 2, semester: '2nd Semester', description: 'Full-stack web development with modern frameworks', requiredEquipment: '["Computers"]' },
      { subjectCode: 'CS 101', subjectName: 'Data Structures and Algorithms', units: 3, programId: programs['BSCS']!, departmentId: departments['Computer Studies']!, yearLevel: 1, semester: '2nd Semester', description: 'Fundamental data structures and algorithm design', requiredEquipment: '["Computers"]' },
      { subjectCode: 'BA 101', subjectName: 'Principles of Marketing', units: 3, programId: programs['BSBA']!, departmentId: departments['Business Administration']!, yearLevel: 1, semester: '1st Semester', description: 'Introduction to marketing concepts and strategies' },
      { subjectCode: 'BA 102', subjectName: 'Financial Accounting', units: 3, programId: programs['BSBA']!, departmentId: departments['Business Administration']!, yearLevel: 1, semester: '2nd Semester', description: 'Basic accounting principles and financial statements' },
      { subjectCode: 'ED 101', subjectName: 'Foundations of Education', units: 3, programId: programs['BSED']!, departmentId: departments['Education']!, yearLevel: 1, semester: '1st Semester', description: 'Philosophical, psychological, and sociological foundations of education' },
      { subjectCode: 'EN 101', subjectName: 'Engineering Mathematics', units: 3, programId: programs['BSEE']!, departmentId: departments['Engineering']!, yearLevel: 1, semester: '1st Semester', description: 'Calculus, differential equations, and linear algebra for engineers' },
      { subjectCode: 'EN 102', subjectName: 'Electrical Circuits 1', units: 3, programId: programs['BSEE']!, departmentId: departments['Engineering']!, yearLevel: 2, semester: '1st Semester', description: 'DC and AC circuit analysis', requiredEquipment: '["Lab Equipment"]' },
      { subjectCode: 'EN 201', subjectName: 'Structural Analysis', units: 3, programId: programs['BSCE']!, departmentId: departments['Engineering']!, yearLevel: 2, semester: '1st Semester', description: 'Analysis of statically determinate and indeterminate structures' },
      { subjectCode: 'AS 101', subjectName: 'English Composition', units: 3, programId: programs['AB English']!, departmentId: departments['Arts & Sciences']!, yearLevel: 1, semester: '1st Semester', description: 'Academic writing and critical thinking' },
      { subjectCode: 'AS 102', subjectName: 'Philippine Literature', units: 3, programId: programs['AB English']!, departmentId: departments['Arts & Sciences']!, yearLevel: 1, semester: '2nd Semester', description: 'Survey of Philippine literary works' },
      { subjectCode: 'HM 101', subjectName: 'Introduction to Hospitality Industry', units: 3, programId: programs['BSHM']!, departmentId: departments['Hospitality Management']!, yearLevel: 1, semester: '1st Semester', description: 'Overview of the hospitality and tourism industry' },
      { subjectCode: 'HM 102', subjectName: 'Food and Beverage Service', units: 3, programId: programs['BSHM']!, departmentId: departments['Hospitality Management']!, yearLevel: 1, semester: '2nd Semester', description: 'Principles and practices of food and beverage service' },
      { subjectCode: 'IT 301', subjectName: 'Networking Fundamentals', units: 3, programId: programs['BSIT']!, departmentId: departments['Computer Studies']!, yearLevel: 3, semester: '1st Semester', description: 'Computer networks, protocols, and administration', requiredEquipment: '["Computers"]' },
      { subjectCode: 'IT 302', subjectName: 'Systems Integration and Architecture', units: 3, programId: programs['BSIT']!, departmentId: departments['Computer Studies']!, yearLevel: 3, semester: '2nd Semester', description: 'Enterprise systems architecture and integration', requiredEquipment: '["Computers"]' },
      { subjectCode: 'BA 201', subjectName: 'Human Resource Management', units: 3, programId: programs['BSBA']!, departmentId: departments['Business Administration']!, yearLevel: 2, semester: '1st Semester', description: 'HR planning, recruitment, training, and development' },
      { subjectCode: 'ED 201', subjectName: 'Educational Psychology', units: 3, programId: programs['BSED']!, departmentId: departments['Education']!, yearLevel: 2, semester: '1st Semester', description: 'Learning theories and psychological principles in education' },
      { subjectCode: 'CS 201', subjectName: 'Operating Systems', units: 3, programId: programs['BSCS']!, departmentId: departments['Computer Studies']!, yearLevel: 2, semester: '1st Semester', description: 'OS concepts, processes, memory management, and file systems', requiredEquipment: '["Computers"]' },
    ];

    const subjects: Record<string, string> = {};
    for (const sub of subjectData) {
      const existing = await db.subject.findFirst({ where: { subjectCode: sub.subjectCode, programId: sub.programId } });
      if (existing) {
        subjects[sub.subjectCode] = existing.id;
      } else {
        const created = await db.subject.create({ data: sub });
        subjects[sub.subjectCode] = created.id;
        counts.subjects++;
      }
    }

    // =========================================================================
    // 5. FACULTY
    // =========================================================================
    const facultyData = [
      { name: 'Dr. Maria Santos', email: 'santos.maria@ptc.edu.ph', uid: 'fac-001', role: 'faculty', facultyType: 'regular', departmentId: departments['Computer Studies']!, contractType: 'full-time', maxUnits: 24, specialization: '["Programming", "Database Systems"]' },
      { name: 'Prof. Juan Dela Cruz', email: 'delacruz.juan@ptc.edu.ph', uid: 'fac-002', role: 'faculty', facultyType: 'regular', departmentId: departments['Computer Studies']!, contractType: 'full-time', maxUnits: 24, specialization: '["Networking", "Cybersecurity"]' },
      { name: 'Dr. Ana Reyes', email: 'reyes.ana@ptc.edu.ph', uid: 'fac-003', role: 'faculty', facultyType: 'regular', departmentId: departments['Business Administration']!, contractType: 'full-time', maxUnits: 21, specialization: '["Marketing", "Entrepreneurship"]' },
      { name: 'Prof. Carlos Garcia', email: 'garcia.carlos@ptc.edu.ph', uid: 'fac-004', role: 'faculty', facultyType: 'regular', departmentId: departments['Education']!, contractType: 'full-time', maxUnits: 24, specialization: '["Curriculum Development", "Educational Technology"]' },
      { name: 'Dr. Roberto Lim', email: 'lim.roberto@ptc.edu.ph', uid: 'fac-005', role: 'faculty', facultyType: 'regular', departmentId: departments['Engineering']!, contractType: 'full-time', maxUnits: 21, specialization: '["Electrical Engineering", "Power Systems"]' },
      { name: 'Prof. Elena Villanueva', email: 'villanueva.elena@ptc.edu.ph', uid: 'fac-006', role: 'faculty', facultyType: 'regular', departmentId: departments['Arts & Sciences']!, contractType: 'full-time', maxUnits: 24, specialization: '["English Literature", "Linguistics"]' },
      { name: 'Prof. Miguel Torres', email: 'torres.miguel@ptc.edu.ph', uid: 'fac-007', role: 'faculty', facultyType: 'part-time', departmentId: departments['Computer Studies']!, contractType: 'part-time', maxUnits: 12, specialization: '["Web Development", "Mobile Development"]' },
      { name: 'Dr. Patricia Mendoza', email: 'mendoza.patricia@ptc.edu.ph', uid: 'fac-008', role: 'faculty', facultyType: 'regular', departmentId: departments['Hospitality Management']!, contractType: 'full-time', maxUnits: 21, specialization: '["Culinary Arts", "Hotel Management"]' },
      { name: 'Prof. Antonio Rivera', email: 'rivera.antonio@ptc.edu.ph', uid: 'fac-009', role: 'faculty', facultyType: 'regular', departmentId: departments['Engineering']!, contractType: 'full-time', maxUnits: 24, specialization: '["Civil Engineering", "Structural Analysis"]' },
      { name: 'Prof. Cristina Aquino', email: 'aquino.cristina@ptc.edu.ph', uid: 'fac-010', role: 'faculty', facultyType: 'part-time', departmentId: departments['Business Administration']!, contractType: 'part-time', maxUnits: 12, specialization: '["Accounting", "Finance"]' },
    ];

    const hashedPassword = await bcrypt.hash('faculty123', 10);
    const faculty: Record<string, string> = {};
    for (const fac of facultyData) {
      const existing = await db.user.findUnique({ where: { email: fac.email } });
      if (existing) {
        faculty[fac.uid] = existing.id;
      } else {
        const created = await db.user.create({ data: { ...fac, password: hashedPassword } });
        faculty[fac.uid] = created.id;
        counts.faculty++;
      }
    }

    // =========================================================================
    // 6. SECTIONS
    // =========================================================================
    const sectionData = [
      { sectionName: 'BSIT 1-1', sectionCode: 'BSIT-1-1', yearLevel: 1, departmentId: departments['Computer Studies']!, programId: programs['BSIT']!, studentCount: 35, classType: 'regular' },
      { sectionName: 'BSIT 2-1', sectionCode: 'BSIT-2-1', yearLevel: 2, departmentId: departments['Computer Studies']!, programId: programs['BSIT']!, studentCount: 32, classType: 'regular' },
      { sectionName: 'BSCS 1-1', sectionCode: 'BSCS-1-1', yearLevel: 1, departmentId: departments['Computer Studies']!, programId: programs['BSCS']!, studentCount: 30, classType: 'regular' },
      { sectionName: 'BSBA 1-1', sectionCode: 'BSBA-1-1', yearLevel: 1, departmentId: departments['Business Administration']!, programId: programs['BSBA']!, studentCount: 40, classType: 'regular' },
      { sectionName: 'BSED 1-1', sectionCode: 'BSED-1-1', yearLevel: 1, departmentId: departments['Education']!, programId: programs['BSED']!, studentCount: 38, classType: 'regular' },
      { sectionName: 'BSHM 1-1', sectionCode: 'BSHM-1-1', yearLevel: 1, departmentId: departments['Hospitality Management']!, programId: programs['BSHM']!, studentCount: 36, classType: 'regular' },
    ];

    const sections: Record<string, string> = {};
    for (const sec of sectionData) {
      const existing = await db.section.findFirst({ where: { sectionCode: sec.sectionCode } });
      if (existing) {
        sections[sec.sectionCode] = existing.id;
      } else {
        const created = await db.section.create({ data: sec });
        sections[sec.sectionCode] = created.id;
        counts.sections++;
      }
    }

    // =========================================================================
    // 7. SCHEDULES
    // =========================================================================
    const scheduleData = [
      { subjectId: subjects['IT 101'], facultyId: faculty['fac-001'], sectionId: sections['BSIT-1-1'], roomId: rooms['MB-101'], day: 'Monday', startTime: '08:00', endTime: '11:00', semester: '1st Semester', academicYear: '2025-2026' },
      { subjectId: subjects['IT 102'], facultyId: faculty['fac-001'], sectionId: sections['BSIT-1-1'], roomId: rooms['IT-L1'], day: 'Tuesday', startTime: '08:00', endTime: '11:00', semester: '1st Semester', academicYear: '2025-2026' },
      { subjectId: subjects['IT 201'], facultyId: faculty['fac-002'], sectionId: sections['BSIT-2-1'], roomId: rooms['IT-L2'], day: 'Monday', startTime: '13:00', endTime: '16:00', semester: '1st Semester', academicYear: '2025-2026' },
      { subjectId: subjects['IT 202'], facultyId: faculty['fac-007'], sectionId: sections['BSIT-2-1'], roomId: rooms['IT-L3'], day: 'Wednesday', startTime: '08:00', endTime: '11:00', semester: '2nd Semester', academicYear: '2025-2026' },
      { subjectId: subjects['CS 101'], facultyId: faculty['fac-002'], sectionId: sections['BSCS-1-1'], roomId: rooms['IT-L1'], day: 'Thursday', startTime: '08:00', endTime: '11:00', semester: '2nd Semester', academicYear: '2025-2026' },
      { subjectId: subjects['BA 101'], facultyId: faculty['fac-003'], sectionId: sections['BSBA-1-1'], roomId: rooms['MB-201'], day: 'Monday', startTime: '08:00', endTime: '11:00', semester: '1st Semester', academicYear: '2025-2026' },
      { subjectId: subjects['BA 102'], facultyId: faculty['fac-010'], sectionId: sections['BSBA-1-1'], roomId: rooms['MB-102'], day: 'Wednesday', startTime: '13:00', endTime: '16:00', semester: '2nd Semester', academicYear: '2025-2026' },
      { subjectId: subjects['ED 101'], facultyId: faculty['fac-004'], sectionId: sections['BSED-1-1'], roomId: rooms['MB-202'], day: 'Tuesday', startTime: '13:00', endTime: '16:00', semester: '1st Semester', academicYear: '2025-2026' },
      { subjectId: subjects['EN 101'], facultyId: faculty['fac-005'], sectionId: sections['BSED-1-1'], roomId: rooms['MB-101'], day: 'Thursday', startTime: '13:00', endTime: '16:00', semester: '1st Semester', academicYear: '2025-2026' },
      { subjectId: subjects['HM 101'], facultyId: faculty['fac-008'], sectionId: sections['BSHM-1-1'], roomId: rooms['MB-201'], day: 'Friday', startTime: '08:00', endTime: '11:00', semester: '1st Semester', academicYear: '2025-2026' },
      { subjectId: subjects['AS 101'], facultyId: faculty['fac-006'], sectionId: sections['BSIT-1-1'], roomId: rooms['MB-102'], day: 'Wednesday', startTime: '13:00', endTime: '16:00', semester: '1st Semester', academicYear: '2025-2026' },
      { subjectId: subjects['IT 301'], facultyId: faculty['fac-002'], sectionId: sections['BSIT-2-1'], roomId: rooms['IT-L1'], day: 'Friday', startTime: '08:00', endTime: '11:00', semester: '1st Semester', academicYear: '2025-2026' },
    ];

    for (const sched of scheduleData) {
      // Skip if any required FK is missing
      if (!sched.subjectId || !sched.facultyId || !sched.sectionId || !sched.roomId) {
        continue;
      }

      // Check for existing schedule with same key fields
      const existing = await db.schedule.findFirst({
        where: {
          subjectId: sched.subjectId,
          facultyId: sched.facultyId,
          sectionId: sched.sectionId,
          day: sched.day,
          startTime: sched.startTime,
        },
      });

      if (!existing) {
        await db.schedule.create({ data: sched });
        counts.schedules++;
      }
    }

    // =========================================================================
    // 8. SYSTEM SETTINGS
    // =========================================================================
    const settingsData = [
      { key: 'currentSemester', value: '1st Semester', description: 'Current academic semester', category: 'academic' },
      { key: 'currentAcademicYear', value: '2025-2026', description: 'Current academic year', category: 'academic' },
      { key: 'institutionName', value: 'Pateros Technological College', description: 'Official institution name', category: 'general' },
      { key: 'institutionCode', value: 'PTC', description: 'Institution abbreviation', category: 'general' },
      { key: 'maxFacultyUnits', value: '24', description: 'Default maximum teaching units for full-time faculty', category: 'scheduling' },
      { key: 'defaultSlotDuration', value: '60', description: 'Default time slot duration in minutes', category: 'scheduling' },
      { key: 'allowConflictOverride', value: 'false', description: 'Whether admins can override schedule conflicts', category: 'scheduling' },
      { key: 'enableNotifications', value: 'true', description: 'Enable email and push notifications', category: 'notifications' },
      { key: 'maintenanceMode', value: 'false', description: 'Enable maintenance mode (blocks non-admin access)', category: 'system' },
      { key: 'specialization_options', value: JSON.stringify(['Programming', 'Web Development', 'Mobile Development', 'Database Systems', 'Data Structures', 'Algorithms', 'Networking', 'Cybersecurity', 'UI/UX', 'Engineering Mathematics', 'Thermodynamics', 'Structural Analysis', 'Civil Engineering', 'Marketing', 'Business Strategy', 'Entrepreneurship', 'Masteral', 'AI & Machine Learning', 'Cloud Computing', 'DevOps', 'Blockchain', 'Data Science']), description: 'All active specializations managed by administrators', category: 'scheduling' },
    ];

    for (const setting of settingsData) {
      const existing = await db.systemSetting.findUnique({ where: { key: setting.key } });
      if (!existing) {
        try {
          await db.systemSetting.create({ data: setting });
          counts.settings++;
        } catch {
          // Unique constraint may still race — use upsert as fallback
          await db.systemSetting.upsert({
            where: { key: setting.key },
            update: { value: setting.value, description: setting.description, category: setting.category },
            create: setting,
          });
        }
      }
    }

    // =========================================================================
    // 9. AUDIT LOG
    // =========================================================================
    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'seed',
          entity: 'system',
          entityId: 'seed-data',
          details: `Seeded demo data: ${JSON.stringify(counts)}`,
        },
      });
    } catch {
      // Non-critical — audit log failure shouldn't block the seed
    }

    // =========================================================================
    // 10. COMPUTE TOTALS (existing + newly created)
    // =========================================================================
    const totals: TotalCounts = {
      departments: await db.department.count(),
      programs: await db.program.count(),
      rooms: await db.room.count(),
      subjects: await db.subject.count(),
      faculty: await db.user.count({ where: { role: 'faculty' } }),
      sections: await db.section.count(),
      schedules: await db.schedule.count(),
      settings: await db.systemSetting.count(),
    };

    console.log('[SEED] Seed data creation complete. New:', counts, 'Totals:', totals);

    return NextResponse.json({
      success: true,
      message: 'Seed data created successfully',
      created: counts,
      totals,
    });
  } catch (error) {
    console.error('[SEED] Failed to create seed data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create seed data', details: String(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/seed — Check current seed data counts (admin only)
// ============================================================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [
      departmentCount,
      programCount,
      roomCount,
      subjectCount,
      facultyCount,
      sectionCount,
      scheduleCount,
      settingsCount,
    ] = await Promise.all([
      db.department.count(),
      db.program.count(),
      db.room.count(),
      db.subject.count(),
      db.user.count({ where: { role: 'faculty' } }),
      db.section.count(),
      db.schedule.count(),
      db.systemSetting.count(),
    ]);

    const seeded = departmentCount > 0;

    return NextResponse.json({
      seeded,
      counts: {
        departments: departmentCount,
        programs: programCount,
        rooms: roomCount,
        subjects: subjectCount,
        faculty: facultyCount,
        sections: sectionCount,
        schedules: scheduleCount,
        settings: settingsCount,
      },
      message: seeded
        ? 'Seed data exists in the database'
        : 'No seed data found. Call POST /api/seed to create demo data.',
    });
  } catch (error) {
    return NextResponse.json({
      seeded: false,
      error: 'Failed to check seed status',
      details: String(error),
    });
  }
}
