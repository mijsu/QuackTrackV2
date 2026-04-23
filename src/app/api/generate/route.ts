import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  generateSchedulesFast,
  type Faculty, 
  type Room, 
  type Section, 
  type Subject,
  type ScheduleAssignment,
  type CurriculumEntry,
  type UnassignedItem,
  type ConstraintViolation,
  type ExistingSchedule,
} from '@/lib/fast-scheduler';
import type { GenerationResult } from '@/lib/scheduling-algorithm';
import { v4 as uuidv4 } from 'uuid';
import { sendNotificationToUser } from '@/lib/notification-client';
import { getConflictResolution, type ConflictType } from '@/types';

function parseJSON<T>(str: string | null, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function parseJSONArray(str: string | null): string[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Timeout wrapper for long-running operations
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
    
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// Maximum time for generation (50 seconds - Render free tier has 60s limit)
// This leaves 10 seconds buffer for cleanup and response
const MAX_GENERATION_TIME_MS = 50 * 1000;

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  
  try {
    // Authentication and authorization check
    console.log('[GENERATE] Checking session...');
    const session = await getServerSession(authOptions);
    console.log('[GENERATE] Session result:', session ? { id: session.user?.id, role: session.user?.role } : null);
    
    if (!session?.user?.id) {
      console.log('[GENERATE] Unauthorized - no session or user id');
      return NextResponse.json({ error: 'Unauthorized', details: 'No valid session found. Please log in again.' }, { status: 401 });
    }
    
    // Only admin can generate schedules
    if (session.user.role !== 'admin') {
      console.log('[GENERATE] Access denied - role:', session.user.role);
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    console.log('[GENERATE] Auth check passed, parsing request body...');
    const body = await request.json();
    const { departmentId, clearExisting = true, curriculum, detectedConflicts, classType: requestedClassType } = body;

    console.log('=== QuackTrack SCHEDULE GENERATION v2.1 (Executive-Aware) ===');
    console.log(`Department: ${departmentId || 'All'}`);
    console.log(`Class Type: ${requestedClassType || 'All (Regular + Executive)'}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Detected conflicts passed: ${detectedConflicts?.length || 0}`);
    const startTime = Date.now();

    // =========================================================================
    // CHECK AUTO_GENERATE_ENABLED SETTING
    // =========================================================================
    
    const autoGenerateSetting = await db.systemSetting.findUnique({
      where: { key: 'auto_generate_enabled' },
    });
    
    if (autoGenerateSetting?.value !== 'true') {
      console.log('[GENERATE] Auto generation is disabled');
      return NextResponse.json({ 
        error: 'Auto Schedule Generation is disabled',
        hint: 'Enable auto_generate_enabled in System Settings > Schedule tab to generate schedules',
        disabled: true,
      }, { status: 400 });
    }

    // =========================================================================
    // FETCH ACTIVE SEMESTER FROM SYSTEM SETTINGS
    // =========================================================================
    
    const activeSemesterSetting = await db.systemSetting.findUnique({
      where: { key: 'semester' },
    });
    const activeSemester = activeSemesterSetting?.value || '1st Semester';
    console.log(`Active Semester: ${activeSemester}`);

    const activeAcademicYearSetting = await db.systemSetting.findUnique({
      where: { key: 'academic_year' },
    });
    const activeAcademicYear = activeAcademicYearSetting?.value || '2024-2025';
    console.log(`Active Academic Year: ${activeAcademicYear}`);

    // =========================================================================
    // FETCH DATA
    // =========================================================================
    
    // Fetch sections WITH curriculum info
    const sectionsRaw = await db.section.findMany({
      where: { ...(departmentId && { departmentId }), isActive: true },
      include: { department: true, curriculum: { include: { items: true } } },
    });
    
    // =========================================================================
    // EXECUTIVE SEMESTER SETTINGS (separate from regular)
    // MUST be fetched BEFORE subjects query (used in executive subject filter)
    // =========================================================================
    const execSemesterSetting = await db.systemSetting.findUnique({
      where: { key: 'executive_semester' },
    });
    const executiveSemester = execSemesterSetting?.value || activeSemester;
    
    const execAcademicYearSetting = await db.systemSetting.findUnique({
      where: { key: 'executive_academic_year' },
    });
    const executiveAcademicYear = execAcademicYearSetting?.value || activeAcademicYear;

    // Fetch subjects - FILTER BY ACTIVE SEMESTER
    const subjectsRaw = await db.subject.findMany({
      where: { 
        ...(departmentId ? { departmentId } : {}),
        isActive: true,
        semester: activeSemester, // Only subjects for active semester
      },
    });
    
    // Fetch executive subjects separately - may use a DIFFERENT semester
    const execSubjectsRaw = executiveSemester !== activeSemester
      ? await db.subject.findMany({
          where: {
            ...(departmentId ? { departmentId } : {}),
            isActive: true,
            subjectType: 'executive',
            semester: executiveSemester,
          },
        })
      : []; // If executive semester is the same as regular, executive subjects are already in subjectsRaw
    
    // Fetch rooms
    const roomsRaw = await db.room.findMany({
      where: { isActive: true },
    });
    
    // Fetch ALL faculty (regardless of department) with preferences
    const facultyRaw = await db.user.findMany({
      where: { 
        role: 'faculty',
      },
      include: { preferences: true },
    });

    console.log(`\n=== DATA LOADED ===`);
    console.log(`Active Semester: ${activeSemester}`);
    console.log(`Active Academic Year: ${activeAcademicYear}`);
    console.log(`Executive Semester: ${executiveSemester}`);
    console.log(`Executive Academic Year: ${executiveAcademicYear}`);
    console.log(`Sections: ${sectionsRaw.length} (${sectionsRaw.filter(s => s.curriculumId).length} with curriculum assigned)`);
    console.log(`  - Regular: ${sectionsRaw.filter(s => s.classType !== 'executive').length}`);
    console.log(`  - Executive: ${sectionsRaw.filter(s => s.classType === 'executive').length}`);
    // Merge executive subjects from the separate fetch (deduplicated by id)
    const allSubjectsRaw = executiveSemester !== activeSemester
      ? [...subjectsRaw, ...execSubjectsRaw.filter(es => !subjectsRaw.some(rs => rs.id === es.id))]
      : subjectsRaw;
    
    console.log(`Subjects (filtered by semester): ${subjectsRaw.length}`);
    console.log(`Executive subjects (semester=${executiveSemester}): ${execSubjectsRaw.length}`);
    console.log(`  - Regular: ${allSubjectsRaw.filter(s => s.subjectType !== 'executive').length}`);
    console.log(`  - Executive: ${allSubjectsRaw.filter(s => s.subjectType === 'executive').length}`);
    console.log(`Rooms: ${roomsRaw.length}`);
    console.log(`Faculty: ${facultyRaw.length}`);
    console.log(`  - With Masteral specialization: ${facultyRaw.filter(f => parseJSONArray(f.specialization).some(s => s.toLowerCase() === 'masteral')).length} (can teach both executive AND regular)`);
    console.log(`  - Without Masteral: ${facultyRaw.filter(f => !parseJSONArray(f.specialization).some(s => s.toLowerCase() === 'masteral')).length} (regular classes only)`);

    // Log curriculum assignment summary
    const sectionsWithCurriculum = sectionsRaw.filter(s => s.curriculumId);
    const sectionsWithoutCurriculum = sectionsRaw.filter(s => !s.curriculumId);
    if (sectionsWithCurriculum.length > 0) {
      console.log(`\n=== CURRICULUM ASSIGNMENTS ===`);
      for (const s of sectionsWithCurriculum) {
        console.log(`  ${s.sectionName} → ${s.curriculum?.name || 'Unknown'} (${s.curriculum?.items?.length || 0} subjects)`);
      }
    }
    if (sectionsWithoutCurriculum.length > 0) {
      console.log(`\nSections without curriculum (will use all matching subjects): ${sectionsWithoutCurriculum.map(s => s.sectionName).join(', ')}`);
    }
    
    // Log faculty details for debugging
    console.log(`\n=== FACULTY ANALYSIS ===`);
    for (const f of facultyRaw) {
      const spec = parseJSONArray(f.specialization);
      const prefs = f.preferences;
      const prefDays = prefs ? parseJSONArray(prefs.preferredDays) : [];
      const unavailDays = prefs?.unavailableDays ? parseJSONArray(prefs.unavailableDays) : [];
      
      console.log(`- ${f.name} (${f.email})`);
      console.log(`  Max Units: ${f.maxUnits || 24}`);
      console.log(`  Specializations: ${spec.length > 0 ? spec.join(', ') : 'None (can teach any)'}`);
      console.log(`  Preferred Days: ${prefDays.length > 0 ? prefDays.join(', ') : 'All'}`);
      console.log(`  Unavailable Days: ${unavailDays.length > 0 ? unavailDays.join(', ') : 'None'}`);
    }

    // =========================================================================
    // PRE-GENERATION WARNINGS (declared early for use in validation)
    // =========================================================================
    
    const preGenerationWarnings: Array<{
      type: string;
      message: string;
      severity: 'warning' | 'info';
      faculty?: string[];
      subject?: string;
      details?: Record<string, unknown>;
    }> = [];

    // =========================================================================
    // VALIDATION
    // =========================================================================
    
    const errors: string[] = [];
    const executiveSections = sectionsRaw.filter(s => s.classType === 'executive');
    const regularSections = sectionsRaw.filter(s => s.classType !== 'executive');
    // Faculty with "Masteral" in their specialization can teach executive classes
    // They are ALSO included in the regular faculty pool so they can teach both
    // executive and regular classes. When generating regular schedules after
    // executive schedules exist, their executive time slots and unit loads
    // are pre-loaded into the algorithm context to prevent double-booking.
    const masteralFaculty = facultyRaw.filter(f => {
      const specs = parseJSONArray(f.specialization);
      return specs.some(s => s.toLowerCase() === 'masteral');
    });
    // Non-masteral faculty for regular classes (Masteral faculty are added separately
    // when generating regular with existing executive commitments)
    const nonMasteralFaculty = facultyRaw.filter(f => {
      const specs = parseJSONArray(f.specialization);
      return !specs.some(s => s.toLowerCase() === 'masteral');
    });
    const executiveSubjects = allSubjectsRaw.filter(s => s.subjectType === 'executive');
    const regularSubjects = allSubjectsRaw.filter(s => s.subjectType !== 'executive');

    // Check if we should generate for a specific class type
    const generateRegular = !requestedClassType || requestedClassType === 'regular';
    const generateExecutive = !requestedClassType || requestedClassType === 'executive';

    if (facultyRaw.length === 0) {
      errors.push('No faculty members found. Please add faculty before generating schedules.');
    }
    if (sectionsRaw.length === 0) {
      errors.push('No sections found. Please add sections before generating schedules.');
    }
    if (subjectsRaw.length === 0) {
      errors.push('No subjects found. Please add subjects before generating schedules.');
    }
    if (roomsRaw.length === 0) {
      // Rooms are optional — log a note instead of erroring
      console.log('[GENERATE] No rooms found — schedules will be generated without room assignments.');
    }
    
    // Executive-specific validations
    if (generateExecutive && executiveSections.length > 0 && masteralFaculty.length === 0) {
      errors.push('Executive sections exist but no faculty with "Masteral" specialization found. Please add "Masteral" to the specialization of at least one faculty member.');
    }
    if (generateExecutive && executiveSections.length > 0 && executiveSubjects.length === 0) {
      preGenerationWarnings.push({
        type: 'executive_no_subjects' as string,
        message: `${executiveSections.length} executive section(s) found but no executive subjects. Executive sections may not receive any schedules. Create subjects with type "Executive" to fix this.`,
        severity: 'warning',
      });
    }
    if (generateExecutive && executiveSections.length > 0 && masteralFaculty.length > 0) {
      preGenerationWarnings.push({
        type: 'executive_generation' as string,
        message: `Executive class generation: ${executiveSections.length} sections, ${executiveSubjects.length} subjects, ${masteralFaculty.length} faculty with Masteral specialization (${masteralFaculty.map(f => f.name).join(', ')}). These faculty will be assigned to executive sections and can also teach regular classes (respecting their executive time commitments).`,
        severity: 'info',
        faculty: masteralFaculty.map(f => f.name),
      });
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: errors,
        canProceed: false,
      }, { status: 400 });
    }

    // =========================================================================
    // PRE-GENERATION CONFLICT CHECK
    // =========================================================================
    
    // 1. Check for multiple faculty preferring the same subject
    const subjectPreferenceMap: Map<string, Array<{ faculty: typeof facultyRaw[0]; timeStart: string; timeEnd: string; days: string[] }>> = new Map();
    
    for (const f of facultyRaw) {
      const prefSubjects = f.preferences ? parseJSONArray(f.preferences.preferredSubjects) : [];
      const prefTimeStart = f.preferences?.preferredTimeStart || '08:00';
      const prefTimeEnd = f.preferences?.preferredTimeEnd || '17:00';
      const prefDays = f.preferences ? parseJSONArray(f.preferences.preferredDays) : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      for (const subjectId of prefSubjects) {
        if (!subjectPreferenceMap.has(subjectId)) {
          subjectPreferenceMap.set(subjectId, []);
        }
        subjectPreferenceMap.get(subjectId)!.push({
          faculty: f,
          timeStart: prefTimeStart,
          timeEnd: prefTimeEnd,
          days: prefDays,
        });
      }
    }

    // Helper function to check time overlap
    const timeToMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + (m || 0);
    };
    
    const timesOverlap = (s1: string, e1: string, s2: string, e2: string) => {
      const start1 = timeToMinutes(s1);
      const end1 = timeToMinutes(e1);
      const start2 = timeToMinutes(s2);
      const end2 = timeToMinutes(e2);
      return start1 < end2 && end1 > start2;
    };

    // Detect subject preference conflicts - when multiple faculty prefer the same subject
    for (const [subjectId, facultyPrefs] of subjectPreferenceMap) {
      if (facultyPrefs.length >= 2) {
        const subject = subjectsRaw.find(s => s.id === subjectId);
        const facultyNames = facultyPrefs.map(fp => fp.faculty.name);
        
        // Check if there's time AND day overlap between preferences
        let hasOverlapConflict = false;
        const overlappingDetails: string[] = [];
        
        for (let i = 0; i < facultyPrefs.length; i++) {
          for (let j = i + 1; j < facultyPrefs.length; j++) {
            const fp1 = facultyPrefs[i];
            const fp2 = facultyPrefs[j];
            
            // Check time overlap
            const timeOverlaps = timesOverlap(fp1.timeStart, fp1.timeEnd, fp2.timeStart, fp2.timeEnd);
            
            // Check day overlap
            const commonDays = fp1.days.filter(d => fp2.days.includes(d));
            
            if (timeOverlaps && commonDays.length > 0) {
              hasOverlapConflict = true;
              overlappingDetails.push(
                `${fp1.faculty.name} (${fp1.timeStart}-${fp1.timeEnd} on ${fp1.days.join(', ')}) vs ${fp2.faculty.name} (${fp2.timeStart}-${fp2.timeEnd} on ${fp2.days.join(',')})`
              );
            }
          }
        }
        
        preGenerationWarnings.push({
          type: hasOverlapConflict ? 'subject_preference_conflict' : 'subject_preference_duplicate',
          message: hasOverlapConflict
            ? `${facultyPrefs.length} faculty members (${facultyNames.join(', ')}) prefer "${subject?.subjectName || subjectId}" with OVERLAPPING time/day preferences. Algorithm will assign based on load balancing.`
            : `${facultyPrefs.length} faculty members (${facultyNames.join(', ')}) prefer the same subject "${subject?.subjectName || subjectId}" but with different time preferences. Algorithm will assign based on load balancing.`,
          severity: hasOverlapConflict ? 'warning' : 'info',
          faculty: facultyNames,
          subject: subject?.subjectName || subjectId,
          details: hasOverlapConflict ? { overlaps: overlappingDetails } : undefined,
        });
      }
    }

    // 2. Check for specialization gaps - subjects that need specific specializations but no faculty has them
    for (const subject of subjectsRaw) {
      const requiredSpecs = parseJSONArray(subject.requiredSpecialization);
      
      if (requiredSpecs.length > 0) {
        const eligibleFaculty = facultyRaw.filter(f => {
          const fSpecs = parseJSONArray(f.specialization);
          // If faculty has no specializations, they can teach (new faculty)
          if (fSpecs.length === 0) return true;
          return requiredSpecs.some(spec => fSpecs.includes(spec));
        });
        
        if (eligibleFaculty.length === 0) {
          preGenerationWarnings.push({
            type: 'specialization_gap',
            message: `Subject "${subject.subjectName}" (${subject.subjectCode}) requires specialization in [${requiredSpecs.join(' or ')}], but NO faculty has this specialization. Subject may not be assigned.`,
            severity: 'warning',
            subject: subject.subjectName,
          });
        } else if (eligibleFaculty.length === 1) {
          preGenerationWarnings.push({
            type: 'specialization_limited',
            message: `Subject "${subject.subjectName}" (${subject.subjectCode}) requires specialization in [${requiredSpecs.join(' or ')}], but only 1 faculty (${eligibleFaculty[0].name}) is eligible. Limited scheduling flexibility.`,
            severity: 'info',
            subject: subject.subjectName,
            faculty: [eligibleFaculty[0].name],
          });
        }
      }
    }

    // 3. Check for faculty capacity issues
    for (const f of facultyRaw) {
      const prefSubjects = f.preferences ? parseJSONArray(f.preferences.preferredSubjects) : [];
      const prefSubjectsUnits = subjectsRaw
        .filter(s => prefSubjects.includes(s.id))
        .reduce((sum, s) => sum + s.units, 0);
      
      if (prefSubjectsUnits > f.maxUnits) {
        preGenerationWarnings.push({
          type: 'capacity_warning',
          message: `${f.name}'s preferred subjects total ${prefSubjectsUnits} units, exceeding max capacity of ${f.maxUnits} units. Not all preferences can be satisfied.`,
          severity: 'info',
          faculty: [f.name],
        });
      }
    }

    // 4. Check for unavailable days conflicts
    for (const f of facultyRaw) {
      const unavailDays = f.preferences?.unavailableDays ? parseJSONArray(f.preferences.unavailableDays) : [];
      const prefDays = f.preferences ? parseJSONArray(f.preferences.preferredDays) : [];
      
      // Check if faculty is unavailable on all days they prefer
      const conflictDays = unavailDays.filter(d => prefDays.includes(d));
      if (conflictDays.length > 0) {
        preGenerationWarnings.push({
          type: 'day_preference_conflict',
          message: `${f.name} prefers days [${prefDays.join(', ')}] but is unavailable on [${conflictDays.join(', ')}]. These preferences conflict.`,
          severity: 'info',
          faculty: [f.name],
        });
      }
      
      // Check if faculty is unavailable on ALL work days
      const allWorkDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (allWorkDays.every(d => unavailDays.includes(d))) {
        preGenerationWarnings.push({
          type: 'fully_unavailable',
          message: `${f.name} is marked unavailable on ALL work days. No schedules can be assigned to this faculty.`,
          severity: 'warning',
          faculty: [f.name],
        });
      }
    }

    // 5. Check for room capacity issues (only if rooms exist)
    if (roomsRaw.length > 0) {
      for (const section of sectionsRaw) {
        const suitableRooms = roomsRaw.filter(r => r.capacity >= section.studentCount);
        if (suitableRooms.length === 0) {
          preGenerationWarnings.push({
            type: 'room_capacity_gap',
            message: `Section "${section.sectionName}" has ${section.studentCount} students, but NO room has sufficient capacity. Scheduling may fail.`,
            severity: 'warning',
          });
        }
      }
    }

    console.log(`\n=== PRE-GENERATION WARNINGS ===`);
    console.log(`Found ${preGenerationWarnings.length} potential issues`);
    for (const w of preGenerationWarnings) {
      console.log(`- [${w.severity}] [${w.type}] ${w.message}`);
    }

    // =========================================================================
    // HELPER: Transform data for algorithm
    // =========================================================================
    function transformFaculty(facultyList: typeof facultyRaw): Faculty[] {
      return facultyList.map(f => ({
        id: f.id,
        name: f.name,
        specialization: parseJSONArray(f.specialization),
        maxUnits: f.maxUnits || 24,
        departmentId: f.departmentId,
        preferences: f.preferences ? {
          preferredDays: parseJSONArray(f.preferences.preferredDays).length > 0 
            ? parseJSONArray(f.preferences.preferredDays) 
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          preferredTimeStart: f.preferences.preferredTimeStart || '08:00',
          preferredTimeEnd: f.preferences.preferredTimeEnd || '17:00',
          preferredSubjects: parseJSONArray(f.preferences.preferredSubjects),
          unavailableDays: f.preferences.unavailableDays ? parseJSONArray(f.preferences.unavailableDays) : undefined,
          notes: f.preferences.notes || undefined,
        } : {
          preferredDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          preferredTimeStart: '08:00',
          preferredTimeEnd: '17:00',
          preferredSubjects: [],
        },
      }));
    }

    function transformRooms(roomList: typeof roomsRaw): Room[] {
      return roomList.map(r => ({
        id: r.id,
        roomName: r.roomName,
        capacity: r.capacity,
        equipment: parseJSONArray(r.equipment),
        building: r.building,
      }));
    }

    function transformSections(sectionList: typeof sectionsRaw): Section[] {
      return sectionList.map(s => ({
        id: s.id,
        sectionName: s.sectionName,
        yearLevel: s.yearLevel,
        studentCount: s.studentCount,
        departmentId: s.departmentId,
      }));
    }

    function transformSubjects(subjectList: typeof subjectsRaw, semester: string): Subject[] {
      return subjectList.map(s => ({
        id: s.id,
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        units: s.units,
        departmentId: s.departmentId,
        yearLevel: s.yearLevel || 1,
        semester: s.semester || semester,
        requiredSpecialization: parseJSONArray(s.requiredSpecialization),
        requiredEquipment: parseJSONArray(s.requiredEquipment),
        defaultDurationHours: s.defaultDurationHours || 3,
      }));
    }

    // =========================================================================
    // HELPER: Build curriculum-aware subject-section mapping
    // =========================================================================
    function buildCurriculumEntries(
      targetSections: typeof sectionsRaw,
      targetSubjects: typeof subjectsRaw,
      semester: string,
    ): CurriculumEntry[] {
      const entries: CurriculumEntry[] = [];
      
      for (const section of targetSections.filter(s => s.curriculumId && s.curriculum)) {
        const curriculum = section.curriculum;
        const curriculumSubjectCodes = new Set(
          curriculum.items
            .filter(item => item.semester === semester)
            .map(item => item.subjectCode)
        );
        
        // For executive sections, match ANY subject with the code regardless of program
        // For regular sections, also match by code (cross-program support)
        const matchingSubjects = targetSubjects.filter(s => curriculumSubjectCodes.has(s.subjectCode));
        
        console.log(`  [Curriculum] ${section.sectionName} → ${curriculum.name}: ${matchingSubjects.length}/${curriculumSubjectCodes.size} subjects matched`);
        
        for (const subject of matchingSubjects) {
          entries.push({
            subjectId: subject.id,
            sectionId: section.id,
            semester,
            isRequired: true,
          });
        }
        
        // Log missing subjects
        const missingSubjects = [...curriculumSubjectCodes].filter(code => 
          !targetSubjects.some(s => s.subjectCode === code)
        );
        if (missingSubjects.length > 0) {
          console.log(`    ⚠ Missing subjects in DB: ${missingSubjects.join(', ')}`);
        }
      }
      
      return entries;
    }

    // =========================================================================
    // TRANSFORM DATA FOR ALGORITHM (Phase-based)
    // =========================================================================

    const allRooms = transformRooms(roomsRaw);

    // =========================================================================
    // CLEAR EXISTING SCHEDULES
    // =========================================================================

    if (clearExisting) {
      console.log('\n=== CLEARING EXISTING SCHEDULES ===');
      
      try {
        if (requestedClassType === 'executive') {
          // Only clear executive class schedules
          const execSectionIds = executiveSections.map(s => s.id);
          if (execSectionIds.length > 0) {
            await db.$transaction([
              db.scheduleResponse.deleteMany({
                where: { schedule: { sectionId: { in: execSectionIds } } },
              }),
              db.scheduleLog.deleteMany({
                where: { schedule: { sectionId: { in: execSectionIds } } },
              }),
              db.schedule.deleteMany({
                where: { sectionId: { in: execSectionIds } },
              }),
            ]);
            console.log(`✅ Cleared executive schedules for ${execSectionIds.length} sections`);
          }
        } else if (requestedClassType === 'regular') {
          // Only clear regular class schedules
          const regSectionIds = regularSections.map(s => s.id);
          if (regSectionIds.length > 0) {
            await db.$transaction([
              db.scheduleResponse.deleteMany({
                where: { schedule: { sectionId: { in: regSectionIds } } },
              }),
              db.scheduleLog.deleteMany({
                where: { schedule: { sectionId: { in: regSectionIds } } },
              }),
              db.schedule.deleteMany({
                where: { sectionId: { in: regSectionIds } },
              }),
            ]);
            console.log(`✅ Cleared regular schedules for ${regSectionIds.length} sections`);
          }
        } else {
          // Clear ALL schedules
          await db.$transaction([
            db.scheduleResponse.deleteMany(),
            db.scheduleLog.deleteMany(),
            db.conflict.deleteMany(),
            db.schedule.deleteMany({
              where: departmentId ? { section: { departmentId } } : undefined,
            }),
          ]);
          console.log('✅ All existing schedules and related records cleared successfully');
        }
      } catch (deleteError) {
        console.error('Error clearing existing schedules:', deleteError);
        throw new Error(`Failed to clear existing schedules: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`);
      }
    }

    // =========================================================================
    // TWO-PHASE SCHEDULE GENERATION
    // =========================================================================
    // Phase 1: Regular classes (ALL faculty including Masteral → regular sections → regular subjects)
    // Phase 2: Executive classes (faculty with Masteral specialization → executive sections → executive subjects)
    //
    // IMPORTANT: Masteral faculty are NOW included in the regular faculty pool.
    // When generating regular schedules, any existing executive schedules from the DB
    // are loaded into the algorithm context so their time slots and unit loads
    // are respected. This allows the same faculty to teach both executive AND
    // regular classes without double-booking.

    const allSchedules: ScheduleAssignment[] = [];
    const allUnassigned: UnassignedItem[] = [];
    const allViolations: ConstraintViolation[] = [];
    let totalGenerationTimeMs = 0;
    let totalBacktracks = 0;
    let totalSkipped = 0;
    let totalPreferenceMatch = 0;

    // ── PHASE 1: REGULAR CLASSES ─────────────────────────────────────────
    // Regular generation now includes ALL faculty (including Masteral-qualified)
    // to allow the same faculty to teach both executive and regular classes.
    // Existing executive schedules from the DB are loaded into the context
    // so their time slots and unit loads are respected.
    if (generateRegular && (regularSections.length > 0)) {
      console.log('\n=== PHASE 1: REGULAR CLASS GENERATION ===');
      console.log(`Regular Sections: ${regularSections.length}`);
      console.log(`Regular Subjects: ${regularSubjects.length}`);
      console.log(`Non-Masteral Faculty: ${nonMasteralFaculty.length}`);
      console.log(`Masteral Faculty (also available for regular): ${masteralFaculty.length}`);
      
      const phaseTimeout = MAX_GENERATION_TIME_MS / (generateExecutive ? 2 : 1);
      
      // Include ALL faculty in regular generation (both non-masteral AND masteral)
      // Masteral faculty can teach regular subjects too, with their executive
      // commitments pre-loaded to prevent double-booking.
      const regFacultyPool = [...nonMasteralFaculty, ...masteralFaculty];
      const regFaculty = transformFaculty(regFacultyPool);
      const regSections = transformSections(regularSections);
      const regSubjects = transformSubjects(regularSubjects, activeSemester);
      const regCurriculumEntries = buildCurriculumEntries(regularSections, regularSubjects, activeSemester);
      const regUseEntries = regCurriculumEntries.length > 0 ? regCurriculumEntries : undefined;
      
      console.log(`Regular curriculum pairs: ${regCurriculumEntries.length}`);

      // ── Load existing executive schedules from DB for cross-phase conflict avoidance ──
      // When generating regular schedules after executive schedules have been saved
      // (e.g., executive starts earlier in the semester), we need to load those
      // existing executive schedules into the algorithm context so that:
      // 1. Faculty time slots already used for executive classes are blocked
      // 2. Faculty unit loads from executive classes reduce available capacity
      // 3. Room and section conflicts are detected
      let existingExecutiveSchedules: ExistingSchedule[] = [];
      
      // Only load existing schedules if we're NOT clearing everything
      // (when clearExisting is true for the same classType, those schedules get wiped)
      const shouldLoadExisting = !clearExisting || requestedClassType === 'regular';
      
      if (shouldLoadExisting && masteralFaculty.length > 0) {
        try {
          // Find existing schedules for executive sections (these are the ones already saved)
          const execSectionIds = executiveSections.map(s => s.id);
          
          if (execSectionIds.length > 0) {
            const existingSchedules = await db.schedule.findMany({
              where: {
                sectionId: { in: execSectionIds },
              },
              include: {
                subject: { select: { units: true } },
              },
            });
            
            if (existingSchedules.length > 0) {
              existingExecutiveSchedules = existingSchedules.map(s => ({
                facultyId: s.facultyId,
                roomId: s.roomId,
                sectionId: s.sectionId,
                subjectId: s.subjectId,
                subjectUnits: s.subject.units,
                day: s.day,
                startTime: s.startTime,
                endTime: s.endTime,
              }));
              
              console.log(`[PHASE 1] Loaded ${existingExecutiveSchedules.length} existing executive schedules for cross-phase conflict avoidance`);
              
              // Log which faculty have existing executive commitments
              const facultyExecLoads = new Map<string, number>();
              for (const es of existingExecutiveSchedules) {
                facultyExecLoads.set(es.facultyId, (facultyExecLoads.get(es.facultyId) || 0) + es.subjectUnits);
              }
              for (const [fid, units] of facultyExecLoads) {
                const f = facultyRaw.find(f => f.id === fid);
                console.log(`[PHASE 1]   ${f?.name || fid}: ${units} units already committed to executive classes`);
              }
            }
          }
        } catch (loadError) {
          console.error('[PHASE 1] Error loading existing executive schedules:', loadError);
          // Non-fatal: continue without existing schedule data
          // Post-generation conflict detection will catch any double-bookings
        }
      }
      
      if (regFaculty.length > 0 && regSections.length > 0 && regSubjects.length > 0) {
        const regResult = generateSchedulesFast(
          regFaculty, allRooms, regSections, regSubjects, regUseEntries, phaseTimeout,
          undefined, // onProgress
          existingExecutiveSchedules.length > 0 ? existingExecutiveSchedules : undefined,
        );
        
        allSchedules.push(...regResult.schedules);
        allUnassigned.push(...regResult.unassigned);
        allViolations.push(...regResult.violations);
        totalGenerationTimeMs += regResult.stats.generationTimeMs;
        totalBacktracks += regResult.stats.backtrackCount;
        totalSkipped += regResult.stats.skippedCount;
        totalPreferenceMatch += regResult.stats.preferenceMatchRate;
        
        console.log(`Phase 1 Complete: ${regResult.schedules.length} assigned, ${regResult.unassigned.length} unassigned, ${regResult.violations.length} violations (${regResult.stats.generationTimeMs}ms)`);
      } else {
        console.log('Phase 1 Skipped: Insufficient data for regular class generation');
      }
    }

    // ── PHASE 2: EXECUTIVE CLASSES ───────────────────────────────────────
    // Only faculty whose specialization includes "Masteral" can teach executive
    // When generating both phases together, Phase 2 runs after Phase 1.
    // The schedules generated in Phase 1 are NOT pre-loaded into Phase 2's context
    // because the faculty pools are disjoint (Masteral vs non-Masteral).
    // However, if generating executive AFTER regular (separate generation runs),
    // existing regular schedules for Masteral faculty should be loaded from DB.
    if (generateExecutive && executiveSections.length > 0 && masteralFaculty.length > 0) {
      console.log('\n=== PHASE 2: EXECUTIVE CLASS GENERATION ===');
      console.log(`Executive Sections: ${executiveSections.length}`);
      console.log(`Executive Subjects: ${executiveSubjects.length}`);
      console.log(`Masteral-eligible Faculty: ${masteralFaculty.length} (${masteralFaculty.map(f => f.name).join(', ')})`);
      console.log(`Executive Semester: ${executiveSemester}`);
      console.log(`Executive Academic Year: ${executiveAcademicYear}`);
      
      const phaseTimeout = MAX_GENERATION_TIME_MS / (generateRegular ? 2 : 1);
      
      const execFaculty = transformFaculty(masteralFaculty);
      const execSections = transformSections(executiveSections);
      // Executive subjects can come from ANY program — cross-program support
      const execSubjects = transformSubjects(executiveSubjects, executiveSemester);
      const execCurriculumEntries = buildCurriculumEntries(executiveSections, subjectsRaw, executiveSemester);
      const execUseEntries = execCurriculumEntries.length > 0 ? execCurriculumEntries : undefined;
      
      console.log(`Executive curriculum pairs: ${execCurriculumEntries.length}`);

      // ── Load existing regular schedules from DB for cross-phase conflict avoidance ──
      // When generating executive schedules after regular schedules have been saved,
      // load those existing regular schedules so Masteral faculty's regular time slots
      // and unit loads are respected.
      let existingRegularSchedules: ExistingSchedule[] = [];
      
      const shouldLoadExistingRegular = !clearExisting || requestedClassType === 'executive';
      
      if (shouldLoadExistingRegular) {
        try {
          const regSectionIds = regularSections.map(s => s.id);
          const masteralFacultyIds = new Set(masteralFaculty.map(f => f.id));
          
          if (regSectionIds.length > 0) {
            // Only load regular schedules that involve Masteral faculty
            // (non-masteral faculty can't have conflicts with executive generation)
            const existingSchedules = await db.schedule.findMany({
              where: {
                sectionId: { in: regSectionIds },
                facultyId: { in: [...masteralFacultyIds] },
              },
              include: {
                subject: { select: { units: true } },
              },
            });
            
            if (existingSchedules.length > 0) {
              existingRegularSchedules = existingSchedules.map(s => ({
                facultyId: s.facultyId,
                roomId: s.roomId,
                sectionId: s.sectionId,
                subjectId: s.subjectId,
                subjectUnits: s.subject.units,
                day: s.day,
                startTime: s.startTime,
                endTime: s.endTime,
              }));
              
              console.log(`[PHASE 2] Loaded ${existingRegularSchedules.length} existing regular schedules (for Masteral faculty) for cross-phase conflict avoidance`);
            }
          }
        } catch (loadError) {
          console.error('[PHASE 2] Error loading existing regular schedules:', loadError);
        }
      }
      
      if (execFaculty.length > 0 && execSections.length > 0 && execSubjects.length > 0) {
        const execResult = generateSchedulesFast(
          execFaculty, allRooms, execSections, execSubjects, execUseEntries, phaseTimeout,
          undefined, // onProgress
          existingRegularSchedules.length > 0 ? existingRegularSchedules : undefined,
        );
        
        allSchedules.push(...execResult.schedules);
        allUnassigned.push(...execResult.unassigned);
        allViolations.push(...execResult.violations);
        totalGenerationTimeMs += execResult.stats.generationTimeMs;
        totalBacktracks += execResult.stats.backtrackCount;
        totalSkipped += execResult.stats.skippedCount;
        totalPreferenceMatch += execResult.stats.preferenceMatchRate;
        
        console.log(`Phase 2 Complete: ${execResult.schedules.length} assigned, ${execResult.unassigned.length} unassigned, ${execResult.violations.length} violations (${execResult.stats.generationTimeMs}ms)`);
      } else {
        console.log('Phase 2 Skipped: Insufficient data for executive class generation');
        if (execSubjects.length === 0) {
          console.log('  → No executive subjects found. Create subjects with type "Executive".');
        }
      }
    } else if (generateExecutive && executiveSections.length > 0 && masteralFaculty.length === 0) {
      console.log('\n=== PHASE 2: EXECUTIVE SKIPPED ===');
      console.log('No faculty with "Masteral" specialization available for executive classes');
      console.log('To fix: Edit a faculty member and add "Masteral" to their specializations');
    }

    // Merge results into the format expected by the rest of the code
    const result = {
      schedules: allSchedules,
      unassigned: allUnassigned,
      violations: allViolations,
      stats: {
        generationTimeMs: totalGenerationTimeMs,
        backtrackCount: totalBacktracks,
        skippedCount: totalSkipped,
        preferenceMatchRate: allSchedules.length > 0 ? totalPreferenceMatch / ((generateRegular && generateExecutive) ? 2 : 1) : 0,
        totalSlots: 0,
        assignedSlots: allSchedules.length,
        assignmentRate: 0,
        averageFacultyLoad: 0,
        averageRoomUtilization: 0,
      } as GenerationResult['stats'],
    };
    // Calculate assignment rate
    result.stats.totalSlots = allSchedules.length + allUnassigned.length;
    result.stats.assignmentRate = result.stats.totalSlots > 0 ? allSchedules.length / result.stats.totalSlots : 0;

    console.log(`\n=== ALGORITHM RESULTS ===`);
    console.log(`Generation time: ${result.stats.generationTimeMs}ms`);
    console.log(`Backtracks: ${result.stats.backtrackCount}`);
    console.log(`Skipped (duplicates): ${result.stats.skippedCount}`);
    console.log(`Assigned: ${result.schedules.length}`);
    console.log(`Unassigned: ${result.unassigned.length}`);
    console.log(`Violations detected: ${result.violations.length}`);
    console.log(`Assignment rate: ${(result.stats.assignmentRate * 100).toFixed(1)}%`);
    console.log(`Preference match rate: ${(result.stats.preferenceMatchRate * 100).toFixed(1)}%`);

    // =========================================================================
    // SAVE SCHEDULES TO DATABASE
    // =========================================================================
    
    // Map algorithm IDs to database IDs for conflict recording
    const algorithmIdToDbId = new Map<string, string>();
    let savedSchedules: Array<{ id: string; algorithmId: string; subjectId: string; facultyId: string; sectionId: string; roomId: string; day: string; startTime: string; endTime: string }> = [];

    // Build a set of executive section IDs for correct semester/AY tagging
    const executiveSectionIds = new Set(executiveSections.map(s => s.id));
    
    if (result.schedules.length > 0) {
      console.log('\n=== SAVING TO DATABASE ===');
      
      // Prepare batch data for fast insertion
      // Executive schedules use executiveSemester/executiveAcademicYear
      // Regular schedules use activeSemester/activeAcademicYear
      const scheduleData = result.schedules.map(s => {
        const isExecutive = executiveSectionIds.has(s.sectionId);
        return {
          subjectId: s.subjectId,
          facultyId: s.facultyId,
          sectionId: s.sectionId,
          roomId: s.roomId || null,
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
          status: 'generated' as const,
          semester: isExecutive ? executiveSemester : activeSemester,
          academicYear: isExecutive ? executiveAcademicYear : activeAcademicYear,
        };
      });
      
      try {
        // Use createMany for batch insertion (much faster than individual creates)
        await db.schedule.createMany({
          data: scheduleData,
          skipDuplicates: true,
        });
        console.log(`Saved ${scheduleData.length} schedules to database`);
        
        // Only query back if we need IDs for conflicts
        if (result.violations.length > 0 || (detectedConflicts && detectedConflicts.length > 0)) {
          // Query the schedules we just inserted to get their IDs
          const insertedSchedules = await db.schedule.findMany({
            where: { status: 'generated' },
            select: {
              id: true,
              subjectId: true,
              facultyId: true,
              sectionId: true,
              roomId: true,
              day: true,
              startTime: true,
              endTime: true,
            },
          });
          
          savedSchedules = insertedSchedules.map(s => ({
            ...s,
            algorithmId: '', // We don't have the algorithm ID for these
          }));
        }
      } catch (e) {
        console.error('Failed to save schedules batch:', e);
        // Fallback: try individual inserts
        for (const s of result.schedules) {
          try {
            const isExecutive = executiveSectionIds.has(s.sectionId);
            const savedSchedule = await db.schedule.create({
              data: {
                subjectId: s.subjectId,
                facultyId: s.facultyId,
                sectionId: s.sectionId,
                roomId: s.roomId || null,
                day: s.day,
                startTime: s.startTime,
                endTime: s.endTime,
                status: 'generated',
                semester: isExecutive ? executiveSemester : activeSemester,
                academicYear: isExecutive ? executiveAcademicYear : activeAcademicYear,
              },
            });
            algorithmIdToDbId.set(s.id, savedSchedule.id);
          } catch (innerE) {
            console.error(`Failed to save schedule: ${s.subjectId} - ${s.day} ${s.startTime}`);
          }
        }
      }
    }

    // =========================================================================
    // RECORD VIOLATIONS AS CONFLICTS
    // =========================================================================

    if (result.violations.length > 0) {
      console.log(`\n=== RECORDING ${result.violations.length} VIOLATIONS ===`);
      
      for (const violation of result.violations) {
        try {
          // Map algorithm IDs to database IDs
          const dbId1 = violation.scheduleIds[0] ? algorithmIdToDbId.get(violation.scheduleIds[0]) : null;
          const dbId2 = violation.scheduleIds[1] ? algorithmIdToDbId.get(violation.scheduleIds[1]) : null;
          
          // Only record if we have at least one valid database ID
          if (!dbId1 && !dbId2) {
            console.log(`Skipping violation with no valid schedule IDs: ${violation.description}`);
            continue;
          }
          
          // Get detailed information for the violation
          const schedule1 = savedSchedules.find(s => s.algorithmId === violation.scheduleIds[0]);
          const schedule2 = savedSchedules.find(s => s.algorithmId === violation.scheduleIds[1]);
          
          // Build enhanced description
          let enhancedDescription = violation.description;
          
          if (schedule1) {
            const subject = subjectsRaw.find(s => s.id === schedule1.subjectId);
            const faculty = facultyRaw.find(f => f.id === schedule1.facultyId);
            const section = sectionsRaw.find(s => s.id === schedule1.sectionId);
            const room = roomsRaw.find(r => r.id === schedule1.roomId);
            
            enhancedDescription += `\n  - Schedule 1: ${subject?.subjectCode || 'Unknown'} (${subject?.subjectName || 'Unknown'})`;
            enhancedDescription += `\n    Faculty: ${faculty?.name || 'Unknown'}`;
            enhancedDescription += `\n    Section: ${section?.sectionName || 'Unknown'}`;
            enhancedDescription += `\n    Room: ${room?.roomName || 'Unknown'}`;
            enhancedDescription += `\n    Time: ${schedule1.day} ${schedule1.startTime}-${schedule1.endTime}`;
          }
          
          if (schedule2) {
            const subject = subjectsRaw.find(s => s.id === schedule2.subjectId);
            const faculty = facultyRaw.find(f => f.id === schedule2.facultyId);
            const section = sectionsRaw.find(s => s.id === schedule2.sectionId);
            const room = roomsRaw.find(r => r.id === schedule2.roomId);
            
            enhancedDescription += `\n  - Schedule 2: ${subject?.subjectCode || 'Unknown'} (${subject?.subjectName || 'Unknown'})`;
            enhancedDescription += `\n    Faculty: ${faculty?.name || 'Unknown'}`;
            enhancedDescription += `\n    Section: ${section?.sectionName || 'Unknown'}`;
            enhancedDescription += `\n    Room: ${room?.roomName || 'Unknown'}`;
            enhancedDescription += `\n    Time: ${schedule2.day} ${schedule2.startTime}-${schedule2.endTime}`;
          }
          
          await db.conflict.create({
            data: {
              type: violation.type,
              scheduleId1: dbId1 || null,
              scheduleId2: dbId2,
              description: enhancedDescription,
              severity: violation.severity,
              resolved: false,
            },
          });
        } catch (e) {
          console.error(`Failed to record violation: ${violation.description}`);
        }
      }
    }

    // =========================================================================
    // SAVE DETECTED CONFLICTS (from pre-generation check)
    // =========================================================================

    let savedConflictsCount = 0;
    const generationId = uuidv4(); // Unique ID to group conflicts from this generation
    
    if (detectedConflicts && detectedConflicts.length > 0) {
      console.log(`\n=== SAVING ${detectedConflicts.length} DETECTED CONFLICTS ===`);
      
      for (const conflict of detectedConflicts) {
        try {
          // Get faculty IDs and names
          const facultyData = conflict.faculty?.map((f: { id?: string; name: string } | string) => 
            typeof f === 'string' ? { id: null, name: f } : { id: f.id || null, name: f.name }
          ) || [];
          
          const facultyNames = facultyData.map((f: { name: string }) => f.name);
          const facultyIds = facultyData
            .map((f: { id: string | null }) => f.id)
            .filter((id: string | null): id is string => id !== null);
          
          // Find affected schedules for this conflict using savedSchedules
          let scheduleId1: string | null = null;
          let scheduleId2: string | null = null;
          
          // If it's a subject conflict, try to find related schedules
          if (conflict.type === 'subject_conflict' || conflict.type === 'subject_preference_conflict') {
            // Find schedules for the affected faculty using savedSchedules and facultyRaw
            const affectedSchedules = savedSchedules.filter(s => {
              const facultyMember = facultyRaw.find(f => f.id === s.facultyId);
              return facultyMember && facultyNames.includes(facultyMember.name);
            });
            
            if (affectedSchedules.length >= 1) {
              scheduleId1 = affectedSchedules[0].id;
            }
            if (affectedSchedules.length >= 2) {
              scheduleId2 = affectedSchedules[1].id;
            }
          }
          
          // Extract subject ID if present in the conflict details
          let subjectId: string | null = null;
          if (conflict.details?.subjectId) {
            subjectId = conflict.details.subjectId;
          }
          
          await db.conflict.create({
            data: {
              type: conflict.type || 'preference_conflict',
              scheduleId1: scheduleId1,
              scheduleId2: scheduleId2,
              description: conflict.message || conflict.description || '',
              severity: conflict.severity || 'warning',
              resolved: false,
              suggestedResolution: getConflictResolution((conflict.type || 'preference_conflict') as ConflictType),
              facultyIds: facultyIds.length > 0 ? JSON.stringify(facultyIds) : null,
              subjectId: subjectId,
              generationId: generationId,
            },
          });
          savedConflictsCount++;
        } catch (e) {
          console.error(`Failed to save detected conflict: ${conflict.message || conflict.type}`);
        }
      }
      console.log(`Saved ${savedConflictsCount} detected conflicts to database`);
    }

    // =========================================================================
    // LOG UNASSIGNED ITEMS
    // =========================================================================

    if (result.unassigned.length > 0) {
      console.log(`\n=== UNASSIGNED SUBJECTS (${result.unassigned.length}) ===`);
      for (const item of result.unassigned.slice(0, 10)) {
        console.log(`- ${item.subjectCode} (${item.subjectName}) for ${item.sectionName}: ${item.reason}`);
      }
      if (result.unassigned.length > 10) {
        console.log(`... and ${result.unassigned.length - 10} more`);
      }
    }

    // =========================================================================
    // SEND NOTIFICATIONS TO FACULTY
    // =========================================================================

    console.log('\n=== SENDING NOTIFICATIONS ===');
    const notifiedFaculty = new Set<string>();
    const notificationData: Array<{ userId: string; title: string; message: string; type: string; actionUrl: string }> = [];
    
    for (const schedule of result.schedules) {
      if (!notifiedFaculty.has(schedule.facultyId)) {
        const facultyMember = facultyRaw.find(f => f.id === schedule.facultyId);
        if (facultyMember) {
          const facultySchedules = result.schedules.filter(s => s.facultyId === schedule.facultyId);
          const totalUnits = facultySchedules.reduce((sum, s) => {
            const subj = subjectsRaw.find(sub => sub.id === s.subjectId);
            return sum + (subj?.units || 0);
          }, 0);
          
          // Determine if this faculty member has executive schedules
          const isExecutiveFaculty = executiveSectionIds.has(facultySchedules[0]?.sectionId || '');
          const semesterLabel = isExecutiveFaculty ? executiveSemester : activeSemester;
          const academicYearLabel = isExecutiveFaculty ? executiveAcademicYear : activeAcademicYear;
          const classTypeLabel = isExecutiveFaculty ? 'Executive/Masteral' : '';
          
          const notificationTitle = 'New Schedules Generated';
          const notificationMessage = `You have been assigned ${facultySchedules.length} class(es) totaling ${totalUnits} units for ${semesterLabel} ${academicYearLabel}.${classTypeLabel ? ` (${classTypeLabel})` : ''} Please review your schedule in the calendar view.`;
          
          // Add to batch
          notificationData.push({
            userId: schedule.facultyId,
            title: notificationTitle,
            message: notificationMessage,
            type: 'info',
            actionUrl: 'calendar',
          });
          
          // Send real-time notification
          sendNotificationToUser({
            userId: schedule.facultyId,
            title: notificationTitle,
            message: notificationMessage,
            type: 'info',
          });
          
          notifiedFaculty.add(schedule.facultyId);
        }
      }
    }
    
    // Batch insert notifications
    if (notificationData.length > 0) {
      await db.notification.createMany({ data: notificationData });
    }
    console.log(`Sent ${notificationData.length} notifications to faculty`);

    // =========================================================================
    // CREATE AUDIT LOG
    // =========================================================================

    await db.auditLog.create({
      data: {
        action: 'generate_schedules',
        entity: 'schedule',
        details: JSON.stringify({
          version: '2.0',
          generated: result.schedules.length,
          unassigned: result.unassigned.length,
          violations: result.violations.length,
          savedConflicts: savedConflictsCount,
          departmentId,
          generationTimeMs: result.stats.generationTimeMs,
          backtrackCount: result.stats.backtrackCount,
          skippedCount: result.stats.skippedCount,
          preferenceMatchRate: result.stats.preferenceMatchRate,
          assignmentRate: result.stats.assignmentRate,
        }),
      },
    });

    // =========================================================================
    // PREPARE RESPONSE
    // =========================================================================

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`\n=== GENERATION COMPLETE ===`);
    console.log(`Total API time: ${totalTime}ms`);
    console.log(`Schedules generated: ${result.schedules.length}`);
    console.log(`Sections covered: ${new Set(result.schedules.map(s => s.sectionId)).size}/${sectionsRaw.length}`);
    console.log(`Faculty utilized: ${new Set(result.schedules.map(s => s.facultyId)).size}/${facultyRaw.length}`);

    // Calculate detailed faculty utilization summary
    const facultyUtilization = facultyRaw.map(f => {
      const assigned = result.schedules
        .filter(s => s.facultyId === f.id)
        .reduce((sum, s) => {
          const subj = subjectsRaw.find(sub => sub.id === s.subjectId);
          return sum + (subj?.units || 0);
        }, 0);
      
      const scheduleCount = result.schedules.filter(s => s.facultyId === f.id).length;
      
      return {
        id: f.id,
        name: f.name,
        schedules: scheduleCount,
        assignedUnits: assigned,
        maxUnits: f.maxUnits,
        percent: f.maxUnits > 0 ? Math.round((assigned / f.maxUnits) * 100) : 0,
      };
    }).sort((a, b) => b.percent - a.percent);

    // Calculate day distribution
    const dayDistribution: Record<string, number> = {};
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) {
      dayDistribution[day] = result.schedules.filter(s => s.day === day).length;
    }

    // Calculate time distribution
    const timeSlots: Record<string, number> = {};
    for (const schedule of result.schedules) {
      const hour = schedule.startTime.split(':')[0];
      const timeKey = `${hour}:00`;
      timeSlots[timeKey] = (timeSlots[timeKey] || 0) + 1;
    }

    // Calculate executive vs regular breakdown
    const executiveScheduleCount = result.schedules.filter(s => executiveSectionIds.has(s.sectionId)).length;
    const regularScheduleCount = result.schedules.length - executiveScheduleCount;

    return NextResponse.json({
      success: true,
      generated: result.schedules.length,
      unassigned: result.unassigned,
      violations: result.violations.length,
      savedConflicts: savedConflictsCount,
      generationId: generationId,
      preGenerationWarnings,
      stats: {
        ...result.stats,
        totalTimeMs: totalTime,
        classBreakdown: {
          regular: regularScheduleCount,
          executive: executiveScheduleCount,
        },
        sections: {
          total: sectionsRaw.length,
          withSchedules: new Set(result.schedules.map(s => s.sectionId)).size,
        },
        faculty: {
          total: facultyRaw.length,
          withLoad: facultyUtilization.filter(f => f.assignedUnits > 0).length,
          utilization: facultyUtilization,
        },
        rooms: {
          total: roomsRaw.length,
          used: new Set(result.schedules.map(s => s.roomId)).size,
        },
        distribution: {
          byDay: dayDistribution,
          byTime: timeSlots,
        },
      },
      message: result.violations.length === 0 
        ? `Successfully generated ${result.schedules.length} conflict-free schedules!`
        : `Generated ${result.schedules.length} schedules with ${result.violations.length} conflicts that need review.`,
      algorithm: {
        type: 'Fast Greedy Assignment Algorithm (Optimized for 10k+ pairs)',
        features: [
          'Department-based faculty matching',
          'Load balancing (least loaded first)',
          'Faculty preference optimization',
          'Room capacity matching',
          'Time slot conflict detection',
          'Duplicate subject-section prevention',
          'Progress logging for large datasets',
          'Early termination on timeout',
        ],
      },
    });

  } catch (error) {
    console.error('Schedule generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.toLowerCase().includes('timeout') || 
                      errorMessage.toLowerCase().includes('timed out');
    
    // Return proper JSON response for all errors
    return NextResponse.json({ 
      error: isTimeout ? 'Schedule generation timed out' : 'Failed to generate schedules',
      details: errorMessage,
      hint: isTimeout 
        ? 'The generation took too long. Consider: (1) Reducing the number of subjects/sections, (2) Upgrading to a paid Render plan for longer timeouts, or (3) Generating by department instead of all at once.'
        : undefined,
      timedOut: isTimeout,
    }, { status: isTimeout ? 408 : 500 });
  }
}
