import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch all faculty
export async function GET() {
  try {
    const faculty = await db.faculty.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      faculty
    });
  } catch (error: any) {
    console.error('Get faculty error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch faculty' },
      { status: 500 }
    );
  }
}

// POST - Create new faculty
export async function POST(request: NextRequest) {
  try {
    const { name, title, department, email } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const faculty = await db.faculty.create({
      data: {
        name,
        title: title || null,
        department: department || null,
        email: email || null
      }
    });

    return NextResponse.json({
      success: true,
      faculty
    });
  } catch (error: any) {
    console.error('Create faculty error:', error);
    return NextResponse.json(
      { error: 'Failed to create faculty' },
      { status: 500 }
    );
  }
}

// PUT - Update faculty
export async function PUT(request: NextRequest) {
  try {
    const { id, name, title, department, email } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Faculty ID is required' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    await db.faculty.update({
      where: { id },
      data: {
        name,
        title: title || null,
        department: department || null,
        email: email || null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Faculty updated successfully'
    });
  } catch (error: any) {
    console.error('Update faculty error:', error);
    return NextResponse.json(
      { error: 'Failed to update faculty' },
      { status: 500 }
    );
  }
}

// DELETE - Delete faculty
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Faculty ID is required' },
        { status: 400 }
      );
    }

    // Check if faculty has subjects
    const subjects = await db.subject.findMany({
      where: { instructorId: id }
    });

    if (subjects.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete faculty with assigned subjects. Please reassign or delete subjects first.' },
        { status: 400 }
      );
    }

    await db.faculty.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Faculty deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete faculty error:', error);
    return NextResponse.json(
      { error: 'Failed to delete faculty' },
      { status: 500 }
    );
  }
}
