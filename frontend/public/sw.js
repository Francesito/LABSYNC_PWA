const CACHE_NAME = 'labsync-v1.0.0';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  // Next.js genera estos automáticamente
  '/_next/static/css/',
  '/_next/static/js/',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalación del SW
self.addEventListener('install', (event) => {
  console.log('SW: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Cache abierto');
        // Solo cachear rutas principales, Next.js maneja el resto
        return cache.addAll([
          '/',
          '/manifest.json'
        ]);
      })
      .catch((error) => {
        console.log('SW: Error al cachear:', error);
      })
  );
  self.skipWaiting();
});

// Activación del SW
self.addEventListener('activate', (event) => {
  console.log('SW: Activando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar requests
self.addEventListener('fetch', (event) => {
  // Solo cachear GET requests
  if (event.request.method !== 'GET') return;
  
  // Ignorar requests a APIs externas
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si está en cache, devolverlo
        if (response) {
          return response;
        }
        
        // Si no, hacer fetch y cachear la respuesta
        return fetch(event.request)
          .then((response) => {
            // Solo cachear respuestas exitosas
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Si falla el fetch y es una página, mostrar página offline
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});