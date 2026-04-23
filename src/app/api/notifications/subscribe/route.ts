import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface SubscribeRequest {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

// POST /api/notifications/subscribe - Save push subscription to database
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SubscribeRequest = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Missing required subscription data' },
        { status: 400 }
      );
    }

    // Check if subscription already exists
    const existingSubscription = await db.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existingSubscription) {
      // Update the existing subscription to this user if needed
      if (existingSubscription.userId !== session.user.id) {
        await db.pushSubscription.update({
          where: { endpoint },
          data: { userId: session.user.id },
        });
      }
      return NextResponse.json({ success: true, message: 'Subscription updated' });
    }

    // Create new subscription
    const subscription = await db.pushSubscription.create({
      data: {
        userId: session.user.id,
        endpoint,
        keys: JSON.stringify(keys),
      },
    });

    return NextResponse.json({ success: true, id: subscription.id });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/subscribe - Remove a specific subscription
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // Find and verify ownership of the subscription
    const subscription = await db.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Only allow users to delete their own subscriptions (or admins)
    const isAdmin = session.user.role === 'admin';
    if (!isAdmin && subscription.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.pushSubscription.delete({
      where: { endpoint },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}

// GET /api/notifications/subscribe - Check subscription status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (endpoint) {
      // Check if specific endpoint is subscribed
      const subscription = await db.pushSubscription.findUnique({
        where: { endpoint },
        select: { id: true, userId: true },
      });

      return NextResponse.json({
        subscribed: subscription?.userId === session.user.id,
      });
    }

    // Get all subscriptions for the user
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId: session.user.id },
      select: { id: true, endpoint: true, createdAt: true },
    });

    return NextResponse.json({
      count: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
}
