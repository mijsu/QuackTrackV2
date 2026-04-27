import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch all students
export async function GET() {
  try {
    const students = await db.user.findMany({
      where: { role: 'student' },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      students
    });
  } catch (error: any) {
    console.error('Get students error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

// POST - Create new student
export async function POST(request: NextRequest) {
  try {
    const { username, password, fullName, email, year, course, studentId } = await request.json();

    if (!username || !password || !fullName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await db.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Check if studentId already exists (if provided)
    if (studentId) {
      const existingStudent = await db.user.findFirst({
        where: { studentId }
      });

      if (existingStudent) {
        return NextResponse.json(
          { error: 'Student ID already exists' },
          { status: 400 }
        );
      }
    }

    // Create student
    const student = await db.user.create({
      data: {
        username,
        password,
        fullName,
        email: email || null,
        year: year || null,
        course: course || null,
        studentId: studentId || null,
        role: 'student'
      }
    });

    return NextResponse.json({
      success: true,
      student
    });
  } catch (error: any) {
    console.error('Create student error:', error);
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}

// PUT - Update student
export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id },
      data: updates
    });

    return NextResponse.json({
      success: true,
      message: 'Student updated successfully'
    });
  } catch (error: any) {
    console.error('Update student error:', error);
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

// DELETE - Delete student and all associated data
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // Delete all evaluations by this student
    const deletedEvaluations = await db.evaluation.deleteMany({
      where: { studentId: id }
    });

    // Delete all enrollments for this student
    const deletedEnrollments = await db.enrollment.deleteMany({
      where: { studentId: id }
    });

    // Update pre-registered student if exists
    await db.preRegisteredStudent.updateMany({
      where: { userId: id },
      data: {
        registered: false,
        userId: null
      }
    });

    // Finally, delete the student
    await db.user.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Student and all associated data deleted successfully',
      deletedEnrollments: deletedEnrollments.count,
      deletedEvaluations: deletedEvaluations.count
    });
  } catch (error: any) {
    console.error('Delete student error:', error);
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}
