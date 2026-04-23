/**
 * Push Notification Utilities for QuackTrack
 * Handles Web Push API functionality for browser notifications
 */

// VAPID keys for push notifications (these should be generated and stored in env vars in production)
// For development, we'll use these demo keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * Check if push notifications are supported in this browser
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check if the user has granted notification permission
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications are not supported');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Register the service worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Get the service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('Error getting service worker registration:', error);
    return null;
  }
}

/**
 * Convert VAPID public key to Uint8Array for subscription
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<PushSubscriptionData | null> {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications are not supported');
    return null;
  }

  try {
    // Request permission first
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    // Get or register service worker
    let registration = await getServiceWorkerRegistration();
    if (!registration) {
      registration = await registerServiceWorker();
      if (!registration) {
        console.error('Failed to register service worker');
        return null;
      }
    }

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // Convert subscription to our format
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.toJSON().keys?.p256dh || '',
        auth: subscription.toJSON().keys?.auth || '',
      },
    };

    return subscriptionData;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

/**
 * Show a local notification (without push server)
 */
export async function showLocalNotification(
  options: NotificationOptions
): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    console.warn('Notifications are not supported');
    return false;
  }

  try {
    const permission = getNotificationPermission();
    if (permission !== 'granted') {
      const newPermission = await requestNotificationPermission();
      if (newPermission !== 'granted') {
        return false;
      }
    }

    const registration = await getServiceWorkerRegistration();
    if (registration) {
      // Use service worker to show notification (allows more options)
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/logo.png',
        badge: options.badge || '/logo.png',
        tag: options.tag,
        data: options.data,
        actions: options.actions,
        requireInteraction: options.requireInteraction,
        silent: options.silent,
      });
    } else {
      // Fallback to regular Notification API
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/logo.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction,
        silent: options.silent,
      });
    }
    return true;
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
}

/**
 * Check if the user is currently subscribed to push notifications
 */
export async function isSubscribedToPush(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

/**
 * Get the current push subscription data
 */
export async function getCurrentPushSubscription(): Promise<PushSubscriptionData | null> {
  if (!isPushNotificationSupported()) {
    return null;
  }

  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return null;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return null;
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.toJSON().keys?.p256dh || '',
        auth: subscription.toJSON().keys?.auth || '',
      },
    };
  } catch {
    return null;
  }
}

/**
 * Initialize push notifications (check support, permission, subscription status)
 */
export async function initializePushNotifications(): Promise<{
  supported: boolean;
  permission: NotificationPermission | null;
  subscribed: boolean;
}> {
  const supported = isPushNotificationSupported();
  const permission = getNotificationPermission();
  const subscribed = supported && permission === 'granted' ? await isSubscribedToPush() : false;

  return {
    supported,
    permission,
    subscribed,
  };
}
