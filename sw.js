/**
 * MKart Admin Progressive Web App Service Worker
 */
const CACHE_NAME = 'mkart-admin-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Network-first strategy for live inventory data
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
