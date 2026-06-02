import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { generateInstitutionalEmail, generateTempPassword, sendFacultyWelcomeEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const departmentId = searchParams.get('departmentId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '500')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (role) where.role = role
    if (departmentId) where.departmentId = departmentId
    if (status) where.status = status
    const facultyType = searchParams.get('facultyType')
    if (facultyType) where.facultyType = facultyType
    const contractType = searchParams.get('contractType')
    if (contractType) where.contractType = contractType

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { uid: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          department: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ])

    // Remove passwords from response
    const sanitizedUsers = users.map(({ password: _, ...user }) => user)

    return NextResponse.json({
      data: sanitizedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      uid,
      name,
      email,
      personalEmail,
      password,
      role,
      facultyType,
      departmentId,
      contractType,
      maxUnits,
      specialization,
      status,
      image,
      phone,
    } = body

    // ─── Faculty-specific: auto-generate credentials ──────────────────────
    if (role === 'faculty') {
      if (!name || !uid) {
        return NextResponse.json(
          { error: 'Name and UID are required for faculty' },
          { status: 400 }
        )
      }

      // Auto-generate institutional email from name
      const institutionalEmail = email || generateInstitutionalEmail(name)
      // Auto-generate temporary password
      const tempPassword = generateTempPassword(6)
      // Hash the temp password for storage
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      // Ensure institutional email uniqueness
      let finalEmail = institutionalEmail
      let emailSuffix = 1
      while (await db.user.findUnique({ where: { email: finalEmail } })) {
        const atIndex = institutionalEmail.lastIndexOf('@')
        const base = atIndex > 0 ? institutionalEmail.substring(0, atIndex) : institutionalEmail
        const domain = atIndex > 0 ? institutionalEmail.substring(atIndex) : '@school.edu'
        finalEmail = `${base}${emailSuffix}${domain}`
        emailSuffix++
      }

      // Ensure uid uniqueness
      let finalUid = uid
      let uidSuffix = 1
      while (await db.user.findUnique({ where: { uid: finalUid } })) {
        finalUid = `${uid}${uidSuffix}`
        uidSuffix++
      }

      const user = await db.user.create({
        data: {
          uid: finalUid,
          name,
          email: finalEmail,
          personalEmail: personalEmail || null,
          password: hashedPassword,
          role,
          facultyType,
          departmentId,
          contractType,
          maxUnits: maxUnits ?? (role === 'faculty' ? 21 : 0),
          specialization,
          status: status || 'active',
          image,
          phone,
          mustChangePassword: true,
          isActivated: false,
        },
        include: {
          department: true,
        },
      })

      // Send welcome email with credentials to personal email (non-blocking)
      const targetEmail = personalEmail || finalEmail
      let emailSent = false
      if (targetEmail) {
        // Fire-and-forget: send email in background, don't await
        // This prevents the API from timing out if SMTP is slow
        sendFacultyWelcomeEmail({
          to: targetEmail,
          name,
          institutionalEmail: finalEmail,
          tempPassword,
        }).then((sent) => {
          if (sent) {
            console.log(`✉ Welcome email sent to ${targetEmail}`)
          } else {
            console.warn(`⚠ Could not send welcome email to ${targetEmail}`)
          }
        }).catch((err) => {
          console.error('❌ Email send error:', err instanceof Error ? err.message : String(err))
        })
        // Assume email will be sent (optimistic)
        emailSent = true
      }

      const { password: _, ...userWithoutPassword } = user
      return NextResponse.json({
        ...userWithoutPassword,
        _tempCredentials: {
          email: finalEmail,
          tempPassword,
          personalEmail: personalEmail || null,
          emailSent: !!(targetEmail && emailSent),
        },
      }, { status: 201 })
    }

    // ─── Non-faculty users: require manual password ───────────────────────
    if (!uid || !name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'UID, name, email, password, and role are required' },
        { status: 400 }
      )
    }

    // Check for existing uid or email
    const existing = await db.user.findFirst({
      where: {
        OR: [{ uid }, { email }],
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'User with this UID or email already exists' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await db.user.create({
      data: {
        uid,
        name,
        email,
        personalEmail,
        password: hashedPassword,
        role,
        facultyType,
        departmentId,
        contractType,
        maxUnits: maxUnits ?? 0,
        specialization,
        status: status || 'active',
        image,
        phone,
      },
      include: {
        department: true,
      },
    })

    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
