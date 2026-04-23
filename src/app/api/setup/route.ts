import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// ============================================================
// Public Setup Endpoint — No Authentication Required
// ============================================================
// This endpoint is intentionally public to handle first-time
// database initialization on fresh deployments (e.g., Render).
// It ONLY creates the admin account if NO admin user exists.
// After setup, this endpoint is a no-op (safe to call repeatedly).
// ============================================================

const ADMIN_EMAIL = 'admin@ptc.edu.ph';
const ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'password123';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Check if an admin user already exists
    const existingAdmin = await db.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        message: 'Database already initialized. Admin account exists.',
        alreadySetup: true,
        adminEmail: existingAdmin.email,
      });
    }

    // Check if ANY admin exists (by role)
    const anyAdmin = await db.user.findFirst({
      where: { role: 'admin' },
    });

    if (anyAdmin) {
      return NextResponse.json({
        success: true,
        message: 'An admin account already exists. Setup skipped.',
        alreadySetup: true,
      });
    }

    // First-time setup: create the admin account
    console.log('[SETUP] No admin account found. Creating default admin...');

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const admin = await db.user.create({
      data: {
        uid: 'admin-001',
        name: 'System Administrator',
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        maxUnits: 24,
        specialization: '[]',
      },
    });

    console.log(`[SETUP] Admin account created: ${admin.email}`);

    // Also create an audit log entry for the setup
    try {
      await db.auditLog.create({
        data: {
          userId: admin.id,
          action: 'setup',
          entity: 'system',
          entityId: 'initial-setup',
          details: 'Initial database setup completed. Admin account created.',
        },
      });
    } catch {
      // Non-critical — don't fail setup if audit log fails
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully!',
      alreadySetup: false,
      adminEmail: admin.email,
    });
  } catch (error) {
    console.error('[SETUP] Failed to initialize database:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize database',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check if setup is needed
    const adminExists = await db.user.findFirst({
      where: { role: 'admin' },
    });

    const userCount = await db.user.count();

    return NextResponse.json({
      setupRequired: !adminExists,
      adminExists: !!adminExists,
      totalUsers: userCount,
      message: adminExists
        ? 'Database is ready. You can log in.'
        : 'Database needs initialization. Call POST /api/setup.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        setupRequired: true,
        adminExists: false,
        totalUsers: 0,
        error: 'Failed to check database status',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
