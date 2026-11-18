/**
 * Delgone Digital Sales Ledger - Service Worker
 * Delgone Trading PLC - Addis Ababa, Ethiopia
 * Version: 1.0.0
 */

const CACHE_NAME = 'delgone-ledger-v1.0.0';

// Core Application Shell assets
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/apple-touch-icon.png',
];

// 1. Install Event: Cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Cleanup outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Intelligent routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API Requests: Network-first, NEVER cache mutations, explicit offline response
  if (url.pathname.startsWith('/api/')) {
    // If it's a GET request, attempt network, return clean offline status if network drops
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            detail: 'You are currently offline. A live connection is required for financial operations.',
            offline: true,
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // Navigation requests: Network-first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Static assets (CSS, JS, images, fonts): Cache-first with network fallback
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default fallback to network
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
