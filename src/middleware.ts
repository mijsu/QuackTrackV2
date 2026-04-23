import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CORS middleware for API routes - allows mobile apps and external clients to connect
// This is essential for the Capacitor mobile APK to communicate with the server
export function middleware(request: NextRequest) {
  // Skip CORS for NextAuth routes — NextAuth handles its own CSRF protection
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Get the origin from the request headers
  const origin = request.headers.get('origin') || '';

  // Handle OPTIONS preflight requests (required for CORS)
  if (request.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS, PATCH, DELETE, POST, PUT',
      'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie',
      'Access-Control-Max-Age': '86400',
    };
    if (origin) {
      headers['Vary'] = 'Origin';
    }
    return new NextResponse(null, { status: 204, headers });
  }

  // For other API requests, add CORS headers to the response
  const response = NextResponse.next();

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', origin || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS, PATCH, DELETE, POST, PUT');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie');
  if (origin) {
    response.headers.set('Vary', 'Origin');
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
