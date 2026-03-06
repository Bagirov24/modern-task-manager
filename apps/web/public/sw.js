import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

precacheAndRoute(self.__WB_MANIFEST)

// API calls: network first
registerRoute(
  ({ url }) => url.pathname.startsWith('/api'),
  new NetworkFirst({ cacheName: 'api-cache', plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 3600 })] }),
)

// Static assets: cache first
registerRoute(
  ({ request }) => ['style', 'script', 'image'].includes(request.destination),
  new CacheFirst({ cacheName: 'static-cache', plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 86400 * 30 })] }),
)
