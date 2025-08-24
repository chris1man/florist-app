const CACHE_NAME = 'florist-app-v1756074087';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/index-BnaFxXND.css',
  '/assets/index-y8mUahaA.js',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/favicon.svg'
];

self.addEventListener('install', event => {
  console.log('Service worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('Service worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) {
    // For API requests, try network first
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If network fails, you might want to return a cached error page
          return new Response(JSON.stringify({ error: 'Network error' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
  } else {
    // For other requests, try cache first
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request);
        })
    );
  }
});