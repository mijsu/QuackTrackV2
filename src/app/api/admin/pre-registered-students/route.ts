import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firestore';
import { generateTemporaryPassword, sendEmail, getPreRegistrationEmailTemplate } from '@/lib/email';

// GET - Fetch all pre-registered students
export async function GET() {
  try {
    const students = await db.preRegisteredStudent.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      students
    });
  } catch (error: any) {
    console.error('Get pre-registered students error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pre-registered students' },
      { status: 500 }
    );
  }
}

// POST - Add new pre-registered student
export async function POST(request: NextRequest) {
  try {
    const { firstName, middleName, lastName, studentId, email, temporaryPassword: providedPassword } = await request.json();

    if (!firstName || !lastName || !studentId || !email) {
      return NextResponse.json(
        { error: 'First Name, Last Name, Student ID, and Email are required' },
        { status: 400 }
      );
    }

    const normalizedStudentId = studentId.toUpperCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if studentId already exists in pre-registered list
    const existingPreReg = await db.preRegisteredStudent.findUnique({
      where: { studentId: normalizedStudentId }
    });

    if (existingPreReg) {
      return NextResponse.json(
        { error: 'A student with this Student ID is already pre-registered' },
        { status: 400 }
      );
    }

    // Check if studentId already exists in users (already registered)
    const existingUser = await db.user.findFirst({
      where: { studentId: normalizedStudentId }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this Student ID already has an account' },
        { status: 400 }
      );
    }

    // Use provided password or generate a new one (6 uppercase letters)
    const temporaryPassword = providedPassword || generateTemporaryPassword();

    // Create pre-registered student with new fields
    const student = await db.preRegisteredStudent.create({
      data: {
        firstName: firstName.trim(),
        middleName: middleName?.trim() || '',
        lastName: lastName.trim(),
        studentId: normalizedStudentId,
        email: normalizedEmail,
        temporaryPassword,
        registered: false
      }
    });

    // Send email with credentials
    const emailHtml = getPreRegistrationEmailTemplate({
      firstName: firstName.trim(),
      middleName: middleName?.trim(),
      lastName: lastName.trim(),
      studentId: normalizedStudentId,
      temporaryPassword
    });

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'Your Faculty Evaluation System Account Credentials - CNSC',
      html: emailHtml
    });

    // Log for debugging
    console.log('Pre-registration created:', {
      studentId: normalizedStudentId,
      email: normalizedEmail,
      temporaryPassword,
      emailSent: emailResult.success
    });

    return NextResponse.json({
      success: true,
      student: {
        ...student,
        // Don't return the temporary password in the response for security
        // Only include it in the email
      },
      emailSent: emailResult.success,
      message: emailResult.success 
        ? 'Student pre-registered successfully. Credentials sent to email.'
        : 'Student pre-registered successfully, but email could not be sent. Please note the credentials manually.'
    });
  } catch (error: any) {
    console.error('Add pre-registered student error:', error);
    return NextResponse.json(
      { error: 'Failed to add pre-registered student' },
      { status: 500 }
    );
  }
}

// PUT - Update pre-registered student
export async function PUT(request: NextRequest) {
  try {
    const { id, firstName, middleName, lastName, studentId, email, regeneratePassword } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // Get existing student
    const existingStudent = await db.preRegisteredStudent.findUnique({
      where: { id }
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Pre-registered student not found' },
        { status: 404 }
      );
    }

    const updates: any = {};
    
    if (firstName) updates.firstName = firstName.trim();
    if (middleName !== undefined) updates.middleName = middleName.trim();
    if (lastName) updates.lastName = lastName.trim();
    
    if (email) {
      updates.email = email.toLowerCase().trim();
    }
    
    if (studentId) {
      const normalizedStudentId = studentId.toUpperCase().trim();
      
      // Check if new studentId already exists
      const existingPreReg = await db.preRegisteredStudent.findFirst({
        where: {
          studentId: normalizedStudentId,
          NOT: { id }
        }
      });

      if (existingPreReg) {
        return NextResponse.json(
          { error: 'A student with this Student ID is already pre-registered' },
          { status: 400 }
        );
      }

      updates.studentId = normalizedStudentId;
    }

    // Regenerate password if requested
    let newPassword: string | null = null;
    if (regeneratePassword) {
      newPassword = generateTemporaryPassword();
      updates.temporaryPassword = newPassword;
    }

    await db.preRegisteredStudent.update({
      where: { id },
      data: updates
    });

    // Send email if password was regenerated or email was changed
    if (newPassword || (email && email !== existingStudent.email)) {
      const studentEmail = email || existingStudent.email;
      const passwordToSend = newPassword || existingStudent.temporaryPassword;
      
      const emailHtml = getPreRegistrationEmailTemplate({
        firstName: firstName || existingStudent.firstName,
        middleName: middleName !== undefined ? middleName : existingStudent.middleName,
        lastName: lastName || existingStudent.lastName,
        studentId: studentId || existingStudent.studentId,
        temporaryPassword: passwordToSend
      });

      await sendEmail({
        to: studentEmail,
        subject: 'Your Faculty Evaluation System Account Credentials - CNSC',
        html: emailHtml
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Pre-registered student updated successfully',
      newPassword: newPassword // Return new password if generated (admin can see it)
    });
  } catch (error: any) {
    console.error('Update pre-registered student error:', error);
    return NextResponse.json(
      { error: 'Failed to update pre-registered student' },
      { status: 500 }
    );
  }
}

// DELETE - Delete pre-registered student
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

    await db.preRegisteredStudent.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Pre-registered student deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete pre-registered student error:', error);
    return NextResponse.json(
      { error: 'Failed to delete pre-registered student' },
      { status: 500 }
    );
  }
}
