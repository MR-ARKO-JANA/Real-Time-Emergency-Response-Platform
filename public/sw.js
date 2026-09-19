// NearHelp Service Worker — v1.0.0
// Provides offline shell caching for PWA/TWA Android support

const CACHE_NAME = 'nearhelp-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/authentication.html',
    '/styles.css',
    '/manifest.json'
];

// Install: pre-cache core shell assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: Network-first for API, Cache-first for static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Always go network-first for API requests and socket.io
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ error: 'Offline — please check your connection.' }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503
                });
            })
        );
        return;
    }

    // Cache-first for static assets
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).then((response) => {
                // Only cache same-origin GET responses
                if (event.request.method === 'GET' && url.origin === self.location.origin) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => {
            // Fallback for navigation requests
            if (event.request.mode === 'navigate') {
                return caches.match('/authentication.html');
            }
        })
    );
});
