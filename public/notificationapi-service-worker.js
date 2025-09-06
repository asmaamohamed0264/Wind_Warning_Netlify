// NotificationAPI Service Worker
// This service worker handles web push notifications for NotificationAPI

self.addEventListener('push', function(event) {
  if (!event.data) {
    return;
  }

  const data = event.data.json() || {};
  const urlFromPayload = (data && data.data && data.data.url) || data.url || data.click_action;

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    image: data.image,
    data: { ...(data.data || {}), ...(urlFromPayload ? { url: urlFromPayload } : {}) },
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    actions: data.actions || [],
    tag: data.tag
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const url = (event && event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.openWindow(url)
  );
});

self.addEventListener('notificationclose', function(event) {
  // Handle notification close if needed
  console.log('Notification closed', event);
});

// Handle service worker updates
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
