/**
 * MKart Admin Progressive Web App Service Worker
 */
const CACHE_NAME = 'mkart-admin-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // CRITICAL: NEVER intercept non-GET requests (POST, PUT, DELETE, PATCH)
    // Intercepting POST requests strips the request body stream on mobile Chrome!
    if (event.request.method !== 'GET') {
        return;
    }

    // NEVER intercept external third-party requests (Supabase, Google Fonts, CDNs, etc.)
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Network-first strategy for local website assets
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
