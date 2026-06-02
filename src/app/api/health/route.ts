import { NextResponse } from 'next/server'

/**
 * Lightweight health check endpoint for Render.
 * Does NOT connect to the database — just confirms the server is running.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'unknown',
    hasDb: !!process.env.DATABASE_URL,
  })
}
