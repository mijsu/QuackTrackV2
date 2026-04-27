import { NextResponse } from 'next/server';
import { db } from '@/lib/firestore';

// POST - Complete account setup after first login
export async function POST(request: Request) {
  try {
    const { userId, firstName, middleName, lastName, newPassword } = await request.json();

    if (!userId || !firstName || !lastName || !newPassword) {
      return NextResponse.json({ 
        error: 'All required fields must be filled' 
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters' 
      }, { status: 400 });
    }

    // Get the current user
    const user = await db.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user with new information
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        firstName: firstName.trim(),
        middleName: middleName?.trim() || '',
        lastName: lastName.trim(),
        fullName: middleName 
          ? `${firstName.trim()} ${middleName.trim()} ${lastName.trim()}`
          : `${firstName.trim()} ${lastName.trim()}`,
        password: newPassword, // In production, hash this password
        isFirstLogin: false,
      }
    });

    // Return user without password
    return NextResponse.json({
      success: true,
      message: 'Account setup completed successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        firstName: updatedUser.firstName,
        middleName: updatedUser.middleName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        studentId: updatedUser.studentId,
        role: updatedUser.role,
        isFirstLogin: updatedUser.isFirstLogin
      }
    });
  } catch (error) {
    console.error('Account setup error:', error);
    return NextResponse.json({ error: 'Failed to complete account setup' }, { status: 500 });
  }
}
