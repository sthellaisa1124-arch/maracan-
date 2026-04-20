const CACHE_NAME = 'vellar-v1.1';
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
    icon: data.avatar_url || '/vellar-icon-192.png',
    badge: '/vellar-badge.png', // Ícone branco nítido na barra de status
    tag: data.tag || 'vellar-msg', // Agrupamento por conversa
    renotify: true,
    data: {
      url: data.url || '/'
    },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Abrir Chat', icon: '/vellar-icon-192.png' },
      { action: 'reply', title: 'Responder Agora', type: 'text', placeholder: 'Diz aí...' }
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

  // Se for uma resposta rápida
  if (event.action === 'reply' && event.reply) {
    console.log('Usuário respondeu via notificação:', event.reply);
    // Aqui poderíamos enviar direto para uma API, mas por segurança 
    // e UX abrimos o chat com o parâmetro de resposta
  }

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
