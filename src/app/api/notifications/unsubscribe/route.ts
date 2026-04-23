import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/notifications/unsubscribe - Remove push subscription
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // Find the subscription
    const subscription = await db.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (!subscription) {
      // Subscription doesn't exist, consider it already unsubscribed
      return NextResponse.json({ success: true, message: 'Already unsubscribed' });
    }

    // Verify ownership (or admin)
    const isAdmin = session.user.role === 'admin';
    if (!isAdmin && subscription.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the subscription
    await db.pushSubscription.delete({
      where: { endpoint },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/unsubscribe - Remove all subscriptions for current user
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all subscriptions for the user
    const result = await db.pushSubscription.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Error removing all subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscriptions' },
      { status: 500 }
    );
  }
}
