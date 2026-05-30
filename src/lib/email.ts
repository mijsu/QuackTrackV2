import nodemailer from 'nodemailer'

// ─── SMTP Configuration ─────────────────────────────────────────────────────
// Uses environment variables for SMTP settings, with sensible defaults for dev
// IMPORTANT: Env vars are read lazily inside getTransporter() because Next.js
// Turbopack may not have them available at module-load time.

/**
 * Creates a nodemailer transporter using the current environment variables.
 * This is called lazily (inside each function) rather than at module load time
 * so that env vars are always read fresh — fixing issues where Turbopack loads
 * the module before .env values are injected.
 */
function getTransporter() {
  const SMTP_HOST = process.env.SMTP_HOST || 'smtp.ethereal.email'
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
  const SMTP_USER = process.env.SMTP_USER || ''
  const SMTP_PASS = process.env.SMTP_PASS || ''

  console.log(`📧 SMTP configured: ${SMTP_HOST}:${SMTP_PORT} user=${SMTP_USER || '(none)'}`)

  const config: any = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
  }

  // Only add auth if both user and pass are provided
  if (SMTP_USER && SMTP_PASS) {
    config.auth = {
      user: SMTP_USER,
      pass: SMTP_PASS,
    }
  }

  return nodemailer.createTransport(config)
}

/**
 * Returns the current SMTP_FROM env value (also read lazily).
 */
function getSmtpFrom(): string {
  return process.env.SMTP_FROM || 'QuackTrack <noreply@quacktrack.edu>'
}

// ─── Verify SMTP Connection ────────────────────────────────────────────────
export async function verifySmtpConnection(): Promise<{ success: boolean; message: string }> {
  const SMTP_HOST = process.env.SMTP_HOST || 'smtp.ethereal.email'
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
  const SMTP_USER = process.env.SMTP_USER || ''
  try {
    const transporter = getTransporter()
    console.log(`🔍 Attempting to verify SMTP connection to ${SMTP_HOST}:${SMTP_PORT} as ${SMTP_USER}...`)
    await transporter.verify()
    console.log(`✅ SMTP connection verified successfully`)
    return { success: true, message: `SMTP connection verified: ${SMTP_HOST}:${SMTP_PORT}` }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`❌ SMTP verification failed (${SMTP_HOST}:${SMTP_PORT}):`, msg)
    console.error('Full error:', error)
    return { success: false, message: `SMTP verification failed: ${msg}` }
  }
}

// ─── Send Faculty Welcome Email ─────────────────────────────────────────────

interface WelcomeEmailParams {
  to: string           // Personal email entered by admin
  name: string         // Faculty member's full name
  institutionalEmail: string  // Auto-generated institutional email
  tempPassword: string        // Temporary password (plain text, only in email)
}

export async function sendFacultyWelcomeEmail({
  to,
  name,
  institutionalEmail,
  tempPassword,
}: WelcomeEmailParams): Promise<boolean> {
  try {
    const transporter = getTransporter()
    console.log(`📧 Sending welcome email to ${to}...`)
    const info = await transporter.sendMail({
      from: getSmtpFrom(),
      to,
      subject: 'Welcome to QuackTrack – Your Account Credentials',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0F1115; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #059669, #10B981); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">QuackTrack V2</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">University Scheduling Platform</p>
          </div>

          <!-- Body -->
          <div style="padding: 32px; color: #e2e8f0;">
            <p style="font-size: 16px; margin: 0 0 16px;">Hello <strong>${name}</strong>,</p>
            <p style="font-size: 14px; margin: 0 0 24px; color: #94A3B8;">
              Your faculty account has been created on QuackTrack. Below are your login credentials. You will be required to change your password upon first login.
            </p>

            <!-- Credentials Card -->
            <div style="background: #1E293B; border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 24px; margin: 0 0 24px;">
              <p style="color: #10B981; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 16px; font-weight: 600;">Your Login Credentials</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #94A3B8; font-size: 13px; vertical-align: top;">Institutional Email</td>
                  <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #10B981; font-family: monospace;">${institutionalEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #94A3B8; font-size: 13px; vertical-align: top;">Temporary Password</td>
                  <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #34D399; font-family: monospace; letter-spacing: 2px;">${tempPassword}</td>
                </tr>
              </table>
            </div>

            <div style="background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.3); border-radius: 8px; padding: 16px; margin: 0 0 24px;">
              <p style="color: #FBBF24; font-size: 13px; margin: 0;">
                <strong>⚠ Important:</strong> This is a temporary password. You must change it the first time you log in before you can access the system.
              </p>
            </div>

            <p style="font-size: 14px; color: #94A3B8; margin: 0;">
              If you did not expect this email, please contact your department administrator.
            </p>
          </div>

          <!-- Footer -->
          <div style="padding: 16px 32px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
            <p style="color: #475569; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} QuackTrack V2 — University Scheduling Platform
            </p>
          </div>
        </div>
      `,
    })

    console.log(`✅ Welcome email sent to ${to} — Message ID: ${info.messageId}`)
    return true
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Failed to send welcome email to ${to}:`, msg)
    console.error('Full error:', error)
    // Don't throw — we don't want email failure to block faculty creation
    return false
  }
}

// ─── Generate Temporary Password ────────────────────────────────────────────
// 6 characters, uppercase letters + digits only

export function generateTempPassword(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// ─── Generate Institutional Email ───────────────────────────────────────────
// Format: firstname.lastname@school.edu (lowercase, no special chars)

export function generateInstitutionalEmail(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')   // Remove non-alpha chars
    .replace(/\s+/g, ' ')       // Normalize spaces
    .trim()

  const parts = cleaned.split(' ')
  const firstName = parts[0] || 'user'
  const lastName = parts.length > 1 ? parts[parts.length - 1] : firstName

  const email = `${firstName}.${lastName}@school.edu`
  return email
}
