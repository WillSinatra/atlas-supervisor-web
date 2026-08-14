// Service Worker: notificaciones push en background (panel cerrado o en otra pestaña).

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || 'Nueva notificación',
    icon: '/icon-notification.png',
    badge: '/badge-notification.png',
    tag: data.tag || 'atlas-notificacion',
    requireInteraction: true,
    // El navegador reproduce solo el sonido del sistema al mostrarla; la
    // Notification API no soporta un archivo de sonido propio (el campo
    // `sound` no lo implementa ningún navegador), y el Service Worker no
    // tiene `Audio`/`AudioContext` disponible para simularlo a mano.
    silent: false,
    data: {
      url: data.url || '/tareas',
    },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Atlas', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data?.url || '/tareas', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});
