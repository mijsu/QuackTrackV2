import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username, password, fullName, studentId, role } = await request.json();

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
      const existingStudentId = await db.user.findFirst({
        where: { studentId: studentId.toUpperCase().trim() }
      });

      if (existingStudentId) {
        return NextResponse.json(
          { error: 'Student ID already registered' },
          { status: 400 }
        );
      }
    }

    // Check if student is pre-registered
    let preRegistered = null;
    if (studentId) {
      preRegistered = await db.preRegisteredStudent.findUnique({
        where: { studentId: studentId.toUpperCase().trim() }
      });
    }

    // Create user
    const user = await db.user.create({
      data: {
        username,
        password,
        fullName: fullName.trim(),
        studentId: studentId ? studentId.toUpperCase().trim() : null,
        role: role || 'student'
      }
    });

    // Update pre-registered student if exists
    if (preRegistered) {
      await db.preRegisteredStudent.update({
        where: { id: preRegistered.id },
        data: {
          registered: true,
          userId: user.id
        }
      });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
