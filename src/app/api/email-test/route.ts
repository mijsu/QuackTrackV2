import { NextRequest, NextResponse } from 'next/server'
import { verifySmtpConnection } from '@/lib/email'

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
