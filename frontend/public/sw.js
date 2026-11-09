/* RUTA RIDES — service worker mínimo.
 * No intercepta respuestas ni cachea datos por ahora. Su único objetivo es
 * habilitar la instalación PWA. El modo offline se agregará con una estrategia
 * de caché revisada.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});


self.addEventListener('push', (event) => {
  let payload = { title: 'RUTA RIDES', body: 'Nueva notificación' };
  try {
    payload = event.data ? event.data.json() : payload;
  } catch {
    // Payload no JSON.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'RUTA RIDES', {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: payload.data || {}
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.rideId
    ? `/passenger/ride/${event.notification.data.rideId}`
    : '/';
  event.waitUntil(clients.openWindow(url));
});
