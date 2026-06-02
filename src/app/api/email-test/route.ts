import { NextRequest, NextResponse } from 'next/server'
import { verifySmtpConnection, sendFacultyWelcomeEmail } from '@/lib/email'

/**
 * GET /api/email-test
 * Tests SMTP connection and returns status
 * Useful for debugging email configuration issues
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing SMTP connection...')
    const result = await verifySmtpConnection()
    
    return NextResponse.json({
      status: result.success ? 'ok' : 'error',
      message: result.message,
      timestamp: new Date().toISOString(),
      env: {
        SMTP_HOST: process.env.SMTP_HOST || 'not set',
        SMTP_PORT: process.env.SMTP_PORT || 'not set',
        SMTP_USER: process.env.SMTP_USER ? '***' : 'not set',
        SMTP_PASS: process.env.SMTP_PASS ? '***' : 'not set',
        SMTP_FROM: process.env.SMTP_FROM || 'not set',
      },
    }, { status: result.success ? 200 : 500 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('❌ Email test failed:', msg)
    return NextResponse.json({
      status: 'error',
      message: msg,
      error: error,
    }, { status: 500 })
  }
}

/**
 * POST /api/email-test
 * Sends a test welcome email to verify end-to-end delivery
 * Body: { "to": "recipient@example.com" }  (defaults to SMTP_USER if not provided)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const to = body.to || process.env.SMTP_USER || 'test@example.com'

    console.log(`🧪 Sending test email to ${to}...`)
    const sent = await sendFacultyWelcomeEmail({
      to,
      name: 'Test User',
      institutionalEmail: 'test.user@school.edu',
      tempPassword: 'TEST01',
    })

    return NextResponse.json({
      status: sent ? 'ok' : 'error',
      message: sent
        ? `Test email sent successfully to ${to}`
        : `Failed to send test email to ${to}. Check server logs for details.`,
      timestamp: new Date().toISOString(),
    }, { status: sent ? 200 : 500 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('❌ Email send test failed:', msg)
    return NextResponse.json({
      status: 'error',
      message: msg,
    }, { status: 500 })
  }
}
