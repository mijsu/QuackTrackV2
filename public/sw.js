/**
 * Service Worker for QuackTrack Push Notifications
 * Handles push events and notification clicks
 */

// Handle push events from the server
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');

  let data = {
    title: 'QuackTrack Notification',
    body: 'You have a new notification',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'quacktrack-notification',
    data: {},
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    requireInteraction: true,
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');

  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  // Handle different actions
  if (action === 'dismiss') {
    return;
  }

  // Default action or 'view' - open the app
  let url = '/';
  
  // Navigate to specific page if actionUrl is provided
  if (data.actionUrl) {
    url = data.actionUrl;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (url !== '/') {
            client.navigate(url);
          }
          return client.focus();
        }
      }
      // Open new window if none exists
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed');
  
  // Could send analytics here
  const data = event.notification.data || {};
  
  // You could make an API call to mark the notification as read
  // fetch('/api/notifications/mark-read', { ... })
});

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing');
  self.skipWaiting();
});

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating');
  event.waitUntil(self.clients.claim());
});

// Handle background sync for offline notifications
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Sync notifications when back online
async function syncNotifications() {
  try {
    const response = await fetch('/api/notifications/pending');
    const notifications = await response.json();
    
    for (const notification of notifications) {
      await self.registration.showNotification(notification.title, {
        body: notification.message,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: notification.id,
        data: { actionUrl: notification.actionUrl },
      });
    }
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}
