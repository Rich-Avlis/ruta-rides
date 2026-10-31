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
