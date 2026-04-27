import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firestore';

export async function POST(request: NextRequest) {
  try {
    const { role, username, password } = await request.json();

    if (!role || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For students, check both users table and pre-registered students
    if (role === 'student') {
      const normalizedStudentId = username.toUpperCase().trim();

      // First, check if student exists in users table (already registered)
      let existingUser = await db.user.findFirst({
        where: {
          username: username,
          role: 'student'
        }
      });

      // If not found, try by studentId
      if (!existingUser) {
        existingUser = await db.user.findFirst({
          where: {
            studentId: normalizedStudentId,
            role: 'student'
          }
        });
      }

      if (existingUser) {
        // Student already has an account - verify password
        if (existingUser.password !== password) {
          return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
          );
        }

        // Check if this is the student's first login
        const isFirstLogin = existingUser.isFirstLogin === true;

        // Return user data without password
        const { password: _, ...userWithoutPassword } = existingUser;

        return NextResponse.json({
          success: true,
          user: {
            ...userWithoutPassword,
            createdAt: existingUser.createdAt
          },
          isFirstLogin
        });
      }

      // If not in users table, check pre-registered students
      const preRegStudent = await db.preRegisteredStudent.findUnique({
        where: { studentId: normalizedStudentId }
      });

      if (!preRegStudent) {
        return NextResponse.json(
          { error: 'Student ID not found. Please contact the administrator.' },
          { status: 401 }
        );
      }

      // Check if already registered
      if (preRegStudent.registered) {
        return NextResponse.json(
          { error: 'This account has already been registered. Please login with your new password.' },
          { status: 401 }
        );
      }

      // Verify temporary password
      if (preRegStudent.temporaryPassword !== password) {
        return NextResponse.json(
          { error: 'Invalid temporary password. Please check your email or contact the administrator.' },
          { status: 401 }
        );
      }

      // Create user account for the pre-registered student
      const fullName = preRegStudent.middleName 
        ? `${preRegStudent.firstName} ${preRegStudent.middleName} ${preRegStudent.lastName}`
        : `${preRegStudent.firstName} ${preRegStudent.lastName}`;

      const newUser = await db.user.create({
        data: {
          username: normalizedStudentId,
          password: preRegStudent.temporaryPassword,
          email: preRegStudent.email,
          fullName: fullName,
          firstName: preRegStudent.firstName,
          middleName: preRegStudent.middleName || '',
          lastName: preRegStudent.lastName,
          studentId: normalizedStudentId,
          role: 'student',
          isFirstLogin: true
        }
      });

      // Mark pre-registered student as registered
      await db.preRegisteredStudent.update({
        where: { id: preRegStudent.id },
        data: { 
          registered: true,
          userId: newUser.id
        }
      });

      // Return user data without password
      const { password: _, ...userWithoutPassword } = newUser;

      return NextResponse.json({
        success: true,
        user: {
          ...userWithoutPassword,
          createdAt: newUser.createdAt
        },
        isFirstLogin: true
      });
    }

    // For admin, only search by username in users table
    const user = await db.user.findFirst({
      where: {
        username: username,
        role: 'admin'
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check password
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: {
        ...userWithoutPassword,
        createdAt: user.createdAt
      },
      isFirstLogin: false
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
