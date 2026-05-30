import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  try {
    const hashedPassword = await bcrypt.hash('password123', 10)

    const admin = await db.user.upsert({
      where: { email: 'admin@quacktrack.com' },
      update: {
        uid: 'ADMIN001',
        name: 'System Administrator',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        maxUnits: 0,
      },
      create: {
        uid: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@quacktrack.com',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        maxUnits: 0,
      },
    })

    return NextResponse.json(
      {
        message: 'Admin user ensured.',
        admin: { email: admin.email, uid: admin.uid },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to seed demo users' },
      { status: 500 },
    )
  }
}
