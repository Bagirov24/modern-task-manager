const CACHE_NAME = 'modern-task-manager-v2'
const APP_SHELL = ['/', '/manifest.webmanifest']
const IS_LOCAL = self.location.hostname === 'localhost'

self.addEventListener('install', (event) => {
  if (!IS_LOCAL) {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  }
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => IS_LOCAL || key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
      IS_LOCAL ? self.registration.unregister() : Promise.resolve(),
    ]).then(async () => {
      await self.clients.claim()
      if (IS_LOCAL) {
        const clients = await self.clients.matchAll({ type: 'window' })
        await Promise.all(clients.map((client) => client.navigate(client.url)))
      }
    }),
  )
})

self.addEventListener('fetch', (event) => {
  if (IS_LOCAL || event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/')))
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
        }
        return response
      })
    }),
  )
})
