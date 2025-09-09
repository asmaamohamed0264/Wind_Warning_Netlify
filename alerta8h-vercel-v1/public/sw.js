const CACHE_NAME = 'wind-monitor-v1'
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/wind-icon-192.png',
  '/icons/wind-icon-512.png'
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache)
      })
  )
})

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
  )
})

// Push event for notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/wind-icon-192.png',
    badge: '/icons/wind-icon-72.png',
    data: data.data,
    actions: [
      {
        action: 'view',
        title: 'Vezi detalii'
      },
      {
        action: 'dismiss',
        title: 'Închide'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    )
  }
})

