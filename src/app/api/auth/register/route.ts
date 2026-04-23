import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/register - Self-registration is DISABLED
// Faculty accounts can only be created by administrators
export async function POST(request: NextRequest) {
  // Self-registration is disabled
  // Faculty accounts must be created by administrators through the admin panel
  return NextResponse.json({ 
    error: 'Self-registration is disabled. Please contact your administrator to create an account.',
    code: 'SELF_REGISTRATION_DISABLED'
  }, { status: 403 });
}
