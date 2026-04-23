import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  generatePassword, 
  generateInstitutionalEmail, 
  parseName,
  sendFacultyCredentials 
} from '@/lib/email';

// GET /api/users - Fetch all users (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const departmentId = searchParams.get('departmentId');
    const facultyType = searchParams.get('facultyType');

    // Only admin can list users
    const isAdmin = session.user.role === 'admin';
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const filterDepartmentId = departmentId;

    const users = await db.user.findMany({
      where: {
        ...(role && { role }),
        ...(filterDepartmentId && { departmentId: filterDepartmentId }),
        ...(facultyType && { facultyType }),
      },
      include: {
        department: true,
        preferences: true,
        _count: { select: { schedules: true } },
      },
      orderBy: { name: 'asc' },
    });

    const formattedUsers = users.map(user => ({
      ...user,
      specialization: JSON.parse(user.specialization || '[]'),
      preferences: user.preferences ? {
        ...user.preferences,
        preferredDays: JSON.parse(user.preferences.preferredDays || '[]'),
        preferredSubjects: JSON.parse(user.preferences.preferredSubjects || '[]'),
        unavailableDays: user.preferences.unavailableDays ? JSON.parse(user.preferences.unavailableDays) : [],
      } : null,
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Create a new faculty user (Admin only)
// Auto-generates institutional email and password
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can create users
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      personalEmail, 
      role, 
      departmentId, 
      contractType, 
      maxUnits, 
      specialization,
      facultyType,
      sendEmail: shouldSendEmail = true // Whether to send credentials via email
    } = body;

    // Validation
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Personal email is required for faculty to send credentials
    if (role === 'faculty' && !personalEmail) {
      return NextResponse.json({ error: 'Personal email is required for faculty accounts' }, { status: 400 });
    }

    // Validate personal email format
    if (personalEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(personalEmail)) {
        return NextResponse.json({ error: 'Invalid personal email format' }, { status: 400 });
      }
    }

    // Parse name and generate institutional email
    const { firstName, lastName } = parseName(name);
    const institutionalEmail = generateInstitutionalEmail(firstName, lastName);

    // Check if institutional email already exists
    const existingUser = await db.user.findUnique({ where: { email: institutionalEmail } });
    if (existingUser) {
      return NextResponse.json({ 
        error: `A user with email ${institutionalEmail} already exists. Please check if this faculty member already has an account.` 
      }, { status: 400 });
    }

    // Check if personal email already exists
    if (personalEmail) {
      const existingPersonalEmail = await db.user.findFirst({ 
        where: { personalEmail } 
      });
      if (existingPersonalEmail) {
        return NextResponse.json({ 
          error: 'A user with this personal email already exists' 
        }, { status: 400 });
      }
    }

    // Generate random password (6 characters, uppercase letters/numbers)
    const generatedPassword = generatePassword();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Validate role
    const validRoles = ['admin', 'faculty', 'department_head'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role', details: `Role must be one of: ${validRoles.join(', ')}` }, { status: 400 });
    }

    // Create user with auto-generated credentials
    const user = await db.user.create({
      data: {
        uid: uuidv4(),
        name,
        email: institutionalEmail,
        personalEmail: personalEmail || null,
        password: hashedPassword,
        role: role || 'faculty',
        departmentId: departmentId || null,
        contractType: contractType || 'full-time',
        maxUnits: maxUnits || 24,
        specialization: JSON.stringify(specialization || []),
        facultyType: facultyType || 'regular',
      },
      include: { department: true },
    });

    // Create default preferences for faculty
    if (role === 'faculty') {
      await db.facultyPreference.create({
        data: {
          facultyId: user.id,
          preferredDays: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
          preferredTimeStart: '08:00',
          preferredTimeEnd: '17:00',
          preferredSubjects: JSON.stringify([]),
        },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entity: 'user',
        canUndo: true,
        entityId: user.id,
        details: JSON.stringify({ 
          name, 
          email: institutionalEmail, 
          personalEmail,
          role,
          passwordGenerated: true 
        }),
      },
    });

    // Create notification for new user
    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Welcome to QuackTrack',
        message: `Your account has been created. Your institutional email is ${institutionalEmail}. Please check your personal email for login credentials.`,
        type: 'success',
      },
    });

    // Send credentials to personal email
    let emailSent = false;
    let emailError: string | undefined;
    let emailDevMode = false;
    
    if (shouldSendEmail && personalEmail) {
      const emailResult = await sendFacultyCredentials({
        personalEmail,
        facultyName: name,
        institutionalEmail,
        password: generatedPassword,
      });
      emailSent = emailResult.success && !emailResult.devMode;
      emailError = emailResult.error;
      emailDevMode = emailResult.devMode || false;
    }

    // Return user without password but include generated credentials for admin reference
    return NextResponse.json({
      ...user,
      specialization: JSON.parse(user.specialization || '[]'),
      // Include generated credentials for admin reference
      generatedCredentials: {
        institutionalEmail,
        password: generatedPassword,
        emailSent,
        emailDevMode,
        emailError,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
