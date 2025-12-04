const CACHE_NAME = 'gojoe-pwa-v1';

// Cache key CDN assets for offline usage and performance
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap',
  // Note: Caching specific ESM CDN modules can be tricky due to redirects, 
  // but adding them here attempts to cache the entry points.
  'https://aistudiocdn.com/@google/genai@^1.30.0',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/lucide-react@^0.554.0',
  'https://aistudiocdn.com/react-dom@^19.2.0'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use 'addAll' carefully; if any request fails, the whole install fails.
      // We wrap it to ensure the service worker installs even if some CDN assets fail.
      return Promise.all(
        URLS_TO_CACHE.map(url => {
            return cache.add(url).catch(err => console.log('Failed to cache:', url, err));
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache First strategy for assets, Network Fallback
      return response || fetch(event.request);
    })
  );
});