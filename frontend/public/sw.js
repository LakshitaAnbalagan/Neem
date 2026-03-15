/**
 * Neem Sourcing – Service Worker for Offline Support
 * Caches all static assets, HTML pages, and API responses for offline use.
 */

const CACHE_NAME = 'neem-sourcing-v1';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/products.html',
  '/product-detail.html',
  '/product-edit.html',
  '/dashboard-shop.html',
  '/dashboard-supplier.html',
  '/chat.html',
  '/map.html',
  '/orders.html',
  '/analytics.html',
  '/wishlist.html',
  '/quality-check.html',
  '/css/theme.css',
  '/js/app.js',
  '/js/chat.js',
  '/js/chatbot.js',
  '/js/i18n.js',
  '/js/map.js',
  '/js/payment.js',
  '/js/voice-search.js',
  '/js/voice.js',
  '/vendor/css/bootstrap.min.css',
  '/vendor/css/fonts.css',
  '/vendor/css/leaflet.css',
  '/vendor/js/bootstrap.bundle.min.js',
  '/vendor/js/leaflet.js',
  '/vendor/js/socket.io.min.js',
  '/vendor/js/qrcode.min.js',
  '/vendor/fonts/PlusJakartaSans-latin.woff2',
  '/vendor/fonts/PlusJakartaSans-latin-ext.woff2',
  '/vendor/fonts/CormorantGaramond-latin.woff2',
  '/vendor/fonts/CormorantGaramond-italic-latin.woff2',
  '/vendor/css/images/marker-icon.png',
  '/vendor/css/images/marker-icon-2x.png',
  '/vendor/css/images/marker-shadow.png'
];

// Install: pre-cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Pre-cache failed for some assets:', err))
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip WebSocket and socket.io polling
  if (url.pathname.startsWith('/socket.io')) return;

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful API GET responses
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: try to serve from cache
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            // Return a proper JSON error for API requests
            return new Response(
              JSON.stringify({ error: 'You are offline. This data is not available in the cache.' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Return cached version and update in background
        fetch(event.request)
          .then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, response);
              });
            }
          })
          .catch(() => { /* offline, ignore */ });
        return cached;
      }

      // Not in cache: fetch from network
      return fetch(event.request)
        .then(response => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          // If HTML page not in cache, serve index.html as fallback
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});
