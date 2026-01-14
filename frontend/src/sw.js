import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

cleanupOutdatedCaches();
clientsClaim();
self.skipWaiting();

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  /^https?:\/\/(localhost|127\.0\.0\.1|flor\.makiapp\.ru)\/api\//,
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 3600
      })
    ]
  }),
  'GET'
);

registerRoute(
  /^https?:\/\/(localhost|127\.0\.0\.1|flor\.makiapp\.ru)\/$/,
  new NetworkFirst({
    cacheName: 'html-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 0
      })
    ]
  }),
  'GET'
);

registerRoute(
  /^https?:\/\/(localhost|127\.0\.0\.1|flor\.makiapp\.ru)\/assets\//,
  new CacheFirst({
    cacheName: 'assets-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 86400 * 30
      })
    ]
  }),
  'GET'
);