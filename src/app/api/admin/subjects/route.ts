import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch all subjects
export async function GET() {
  try {
    const subjects = await db.subject.findMany({
      include: {
        instructor: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      subjects: subjects.map(s => ({
        ...s,
        instructorName: s.instructorName || s.instructor?.name
      }))
    });
  } catch (error: any) {
    console.error('Get subjects error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}

// POST - Create new subject
export async function POST(request: NextRequest) {
  try {
    const { code, title, instructorId, semester, schoolYear } = await request.json();

    if (!code || !title || !instructorId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if faculty exists
    const faculty = await db.faculty.findUnique({
      where: { id: instructorId }
    });

    if (!faculty) {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      );
    }

    const subject = await db.subject.create({
      data: {
        code,
        title,
        instructorId,
        instructorName: faculty.name,
        semester: semester || '1st Semester',
        schoolYear: schoolYear || '2024-2025'
      }
    });

    return NextResponse.json({
      success: true,
      subject
    });
  } catch (error: any) {
    console.error('Create subject error:', error);
    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    );
  }
}

// PUT - Update subject
export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    // If instructorId is being updated, get the instructor name
    if (updates.instructorId) {
      const faculty = await db.faculty.findUnique({
        where: { id: updates.instructorId }
      });
      if (faculty) {
        updates.instructorName = faculty.name;
      }
    }

    await db.subject.update({
      where: { id },
      data: updates
    });

    return NextResponse.json({
      success: true,
      message: 'Subject updated successfully'
    });
  } catch (error: any) {
    console.error('Update subject error:', error);
    return NextResponse.json(
      { error: 'Failed to update subject' },
      { status: 500 }
    );
  }
}

// DELETE - Delete subject
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    // Check if subject has evaluations
    const evaluations = await db.evaluation.findMany({
      where: { subjectId: id }
    });

    if (evaluations.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete subject with evaluations. Please delete evaluations first.' },
        { status: 400 }
      );
    }

    await db.subject.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Subject deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete subject error:', error);
    return NextResponse.json(
      { error: 'Failed to delete subject' },
      { status: 500 }
    );
  }
}
