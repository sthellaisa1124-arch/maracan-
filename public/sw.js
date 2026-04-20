const CACHE_NAME = 'vellar-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/vellar-icon-192.png',
  '/vellar-icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Apenas cache GET requests
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ==========================================
// ESCUTAR NOTIFICAÇÕES PUSH 🚀
// ==========================================
self.addEventListener('push', (event) => {
  let data = { title: 'Vellar', message: 'Você tem uma nova atividade!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Vellar', message: event.data.text() };
    }
  }

  const options = {
    body: data.message,
    icon: '/vellar-icon-192.png', // Logo V
    badge: '/vellar-icon-192.png',
    data: {
      url: data.url || '/'
    },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Ver Agora' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ==========================================
// AO CLICAR NA NOTIFICAÇÃO 👆
// ==========================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já tiver uma aba aberta, foca nela
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
