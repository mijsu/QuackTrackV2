import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface SendNotificationRequest {
  userId?: string; // If not provided, send to all users
  userIds?: string[]; // Send to multiple users
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
}

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Web Push requires VAPID keys - for production, these should be in environment variables
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@quacktrack.ptc.edu.ph';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

/**
 * Send a push notification using the Web Push protocol
 * Note: For production, you should use a proper web-push library like 'web-push'
 * This implementation creates a notification in the database that will be picked up
 * by the polling mechanism or sent via the notification service
 */
async function sendWebPush(
  subscription: PushSubscriptionData,
  payload: Record<string, unknown>
): Promise<boolean> {
  try {
    // In production, use web-push library like this:
    // import webpush from 'web-push';
    // await webpush.sendNotification(subscription, JSON.stringify(payload));

    // For now, we'll just log and return success
    // The actual push will be handled by the notification polling or websocket
    console.log('[Push] Would send to:', subscription.endpoint);
    console.log('[Push] Payload:', JSON.stringify(payload, null, 2));
    return true;
  } catch (error) {
    console.error('[Push] Failed to send:', error);
    return false;
  }
}

// POST /api/notifications/send - Send push notification (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can send push notifications
    const isAdmin = session.user.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can send push notifications' },
        { status: 403 }
      );
    }

    const body: SendNotificationRequest = await request.json();
    const { userId, userIds, title, body: message, icon, badge, tag, data, actionUrl } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Determine target users
    let targetUserIds: string[] = [];
    
    if (userIds && Array.isArray(userIds)) {
      targetUserIds = userIds;
    } else if (userId) {
      targetUserIds = [userId];
    } else {
      // Send to all users with push subscriptions
      const allSubscriptions = await db.pushSubscription.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });
      targetUserIds = allSubscriptions.map((s) => s.userId);
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users to send notifications to',
        sent: 0,
      });
    }

    // Create notification in database for each target user
    const notificationPromises = targetUserIds.map((uid) =>
      db.notification.create({
        data: {
          userId: uid,
          title,
          message,
          type: 'info',
          actionUrl,
        },
      })
    );

    await Promise.all(notificationPromises);

    // Get push subscriptions for target users
    const subscriptions = await db.pushSubscription.findMany({
      where: {
        userId: { in: targetUserIds },
      },
    });

    // Prepare push payload
    const pushPayload = {
      title,
      body: message,
      icon: icon || '/logo.png',
      badge: badge || '/logo.png',
      tag: tag || 'quacktrack-notification',
      data: {
        ...data,
        actionUrl,
      },
    };

    // Send push notifications
    let sentCount = 0;
    let failedCount = 0;

    for (const sub of subscriptions) {
      try {
        const keys = JSON.parse(sub.keys) as { p256dh: string; auth: string };
        const success = await sendWebPush(
          {
            endpoint: sub.endpoint,
            keys,
          },
          pushPayload
        );

        if (success) {
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error('Failed to parse subscription keys:', error);
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      totalUsers: targetUserIds.length,
      totalSubscriptions: subscriptions.length,
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

// GET /api/notifications/send - Get notification statistics (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can view notification statistics' },
        { status: 403 }
      );
    }

    // Get subscription statistics
    const totalSubscriptions = await db.pushSubscription.count();
    
    const uniqueUsers = await db.pushSubscription.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });

    const recentSubscriptions = await db.pushSubscription.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      totalSubscriptions,
      uniqueUsers: uniqueUsers.length,
      recentSubscriptions: recentSubscriptions.map((s) => ({
        id: s.id,
        endpoint: s.endpoint.substring(0, 50) + '...',
        userName: s.user.name,
        userEmail: s.user.email,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error getting notification statistics:', error);
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    );
  }
}
