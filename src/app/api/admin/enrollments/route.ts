import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper to safely parse subjectIds
const parseSubjectIds = (value: any): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value || '[]');
    } catch {
      return [];
    }
  }
  return [];
};

// GET - Fetch all enrollments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const enrollmentId = searchParams.get('id');

    if (enrollmentId) {
      const enrollment = await db.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          student: true
        }
      });

      if (!enrollment) {
        return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
      }

      const subjectIds = parseSubjectIds(enrollment.subjectIds);
      const subjects = await db.subject.findMany({
        where: { id: { in: subjectIds } },
        include: { instructor: true }
      });

      return NextResponse.json({
        success: true,
        enrollment: {
          ...enrollment,
          subjectIds,
          subjects
        }
      });
    }

    const enrollments = await db.enrollment.findMany({
      include: {
        student: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get all subjects
    const subjects = await db.subject.findMany({
      include: { instructor: true }
    });
    const subjectsMap = new Map(subjects.map(s => [s.id, s]));

    // Get all faculty
    const faculty = await db.faculty.findMany();
    const facultyMap = new Map(faculty.map(f => [f.id, f.name]));

    // Enrich enrollments
    const enrichedEnrollments: any[] = [];
    for (const enrollment of enrollments) {
      const subjectIds = parseSubjectIds(enrollment.subjectIds);
      
      for (const subjectId of subjectIds) {
        const subject = subjectsMap.get(subjectId);
        enrichedEnrollments.push({
          id: `${enrollment.id}_${subjectId}`,
          studentId: enrollment.studentId,
          studentName: enrollment.student?.fullName || 'Unknown',
          subjectId: subjectId,
          subjectCode: subject?.code || 'Unknown',
          subjectTitle: subject?.title || 'Unknown',
          facultyId: subject?.instructorId || 'Unknown',
          facultyName: subject?.instructorName || facultyMap.get(subject?.instructorId || '') || 'Unknown',
          createdAt: enrollment.createdAt
        });
      }
    }

    return NextResponse.json({
      success: true,
      enrollments: enrichedEnrollments
    });
  } catch (error: any) {
    console.error('Get enrollments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}

// POST - Create new enrollment with multiple subjects
export async function POST(request: NextRequest) {
  try {
    const { studentId, subjectId, subjectIds } = await request.json();

    // Handle both single subjectId and array of subjectIds
    const finalSubjectIds = subjectIds || (subjectId ? [subjectId] : []);

    if (!studentId || finalSubjectIds.length === 0) {
      return NextResponse.json(
        { error: 'Student ID and at least one Subject ID are required' },
        { status: 400 }
      );
    }

    // Check if student exists
    const student = await db.user.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Check if all subjects exist
    for (const subjId of finalSubjectIds) {
      const subject = await db.subject.findUnique({
        where: { id: subjId }
      });
      if (!subject) {
        return NextResponse.json(
          { error: `Subject with ID ${subjId} not found` },
          { status: 404 }
        );
      }
    }

    // Check if student already has an enrollment
    const existingEnrollment = await db.enrollment.findFirst({
      where: { studentId }
    });

    if (existingEnrollment) {
      const existingSubjectIds = parseSubjectIds(existingEnrollment.subjectIds);
      
      // Check for duplicate subjects
      for (const subjId of finalSubjectIds) {
        if (existingSubjectIds.includes(subjId)) {
          return NextResponse.json(
            { error: 'Student is already enrolled in one or more of these subjects' },
            { status: 400 }
          );
        }
      }

      // Update existing enrollment
      const updatedSubjectIds = [...existingSubjectIds, ...finalSubjectIds];
      await db.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          subjectIds: JSON.stringify(updatedSubjectIds)
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Enrollment updated successfully',
        enrollmentId: existingEnrollment.id
      });
    }

    // Create new enrollment
    const enrollment = await db.enrollment.create({
      data: {
        studentId,
        subjectIds: JSON.stringify(finalSubjectIds)
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Enrollment created successfully',
      enrollmentId: enrollment.id
    });
  } catch (error: any) {
    console.error('Create enrollment error:', error);
    return NextResponse.json(
      { error: 'Failed to create enrollment' },
      { status: 500 }
    );
  }
}

// PUT - Update enrollment
export async function PUT(request: NextRequest) {
  try {
    const { id, subjectIds } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Enrollment ID is required' },
        { status: 400 }
      );
    }

    if (!subjectIds) {
      return NextResponse.json(
        { error: 'Subject IDs are required' },
        { status: 400 }
      );
    }

    await db.enrollment.update({
      where: { id },
      data: {
        subjectIds: JSON.stringify(subjectIds)
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Enrollment updated successfully'
    });
  } catch (error: any) {
    console.error('Update enrollment error:', error);
    return NextResponse.json(
      { error: 'Failed to update enrollment' },
      { status: 500 }
    );
  }
}

// DELETE - Delete enrollment
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const enrollmentId = searchParams.get('id');

    if (!enrollmentId) {
      return NextResponse.json(
        { error: 'Enrollment ID is required' },
        { status: 400 }
      );
    }

    // Handle composite ID format: enrollmentId_subjectId
    const parts = enrollmentId.split('_');
    const docId = parts[0];

    const enrollment = await db.enrollment.findUnique({
      where: { id: docId }
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    // If there are multiple parts, remove only that subject from the array
    if (parts.length > 1) {
      const subjectIdToRemove = parts[1];
      const existingSubjectIds = parseSubjectIds(enrollment.subjectIds);
      const updatedSubjectIds = existingSubjectIds.filter((id: string) => id !== subjectIdToRemove);

      if (updatedSubjectIds.length === 0) {
        // If no subjects left, delete the entire enrollment
        await db.enrollment.delete({
          where: { id: docId }
        });
      } else {
        // Otherwise, update with remaining subjects
        await db.enrollment.update({
          where: { id: docId },
          data: {
            subjectIds: JSON.stringify(updatedSubjectIds)
          }
        });
      }
    } else {
      // Delete entire enrollment
      await db.enrollment.delete({
        where: { id: docId }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Enrollment deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete enrollment error:', error);
    return NextResponse.json(
      { error: 'Failed to delete enrollment' },
      { status: 500 }
    );
  }
}
