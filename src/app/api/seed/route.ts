import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

/**
 * POST /api/seed — Resets the database and ensures only the admin account exists.
 * Query params:
 *   ?reset=true — Wipes existing data before seeding
 */
// Support both GET (browser visit) and POST (API call) for ?reset=true
export async function GET(request: NextRequest) {
  return handleSeedReset(request)
}

export async function POST(request: NextRequest) {
  return handleSeedReset(request)
}

async function handleSeedReset(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const forceReset = url.searchParams.get('reset') === 'true'

    if (!forceReset) {
      const existingDepartments = await db.department.count()
      if (existingDepartments > 0) {
        return NextResponse.json(
          { error: 'Database already has data. Use ?reset=true to force re-seed.' },
          { status: 400 }
        )
      }
    }

    // In production, ?reset=true only wipes data and creates the admin user — no demo data.
    if (forceReset) {
      console.log('🗑️ Force reset requested — wiping all data...')
      // Delete in dependency order
      await db.conflict.deleteMany()
      await db.schedule.deleteMany()
      await db.scheduleResponse.deleteMany()
      await db.scheduleLog.deleteMany()
      await db.auditLog.deleteMany()
      await db.notification.deleteMany()
      await db.announcement.deleteMany()
      await db.facultyPreference.deleteMany()
      await db.scheduleVersion.deleteMany()
      await db.generationSession.deleteMany()
      await db.generationConfig.deleteMany()
      await db.section.deleteMany()
      await db.subject.deleteMany()
      await db.user.deleteMany()
      await db.program.deleteMany()
      await db.department.deleteMany()
      console.log('✅ All data wiped')

      // In production, create only the admin user — no demo data
      if (process.env.NODE_ENV === 'production') {
        const hashedAdminPassword = await bcrypt.hash('password123', 10)
        await db.user.create({
          data: {
            uid: 'ADMIN001',
            name: 'System Administrator',
            email: 'admin@quacktrack.com',
            password: hashedAdminPassword,
            role: 'admin',
            status: 'active',
            maxUnits: 0,
          },
        })
        return NextResponse.json({
          message: 'Database cleared. Admin user created.',
          credentials: { email: 'admin@quacktrack.com', password: 'password123' },
        })
      }
    }

    const hashedAdminPassword = await bcrypt.hash('password123', 10)

    const admin = await db.user.upsert({
      where: { email: 'admin@quacktrack.com' },
      update: {
        uid: 'ADMIN001',
        name: 'System Administrator',
        password: hashedAdminPassword,
        role: 'admin',
        status: 'active',
        maxUnits: 0,
      },
      create: {
        uid: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@quacktrack.com',
        password: hashedAdminPassword,
        role: 'admin',
        status: 'active',
        maxUnits: 0,
      },
    })

    console.log('✅ Database seeded successfully: admin only', { admin: admin.email })

    return NextResponse.json({
      message: 'Database seeded successfully',
      admin: { email: 'admin@quacktrack.com', password: 'password123' },
    }, { status: 201 })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
