'use client';

import { useEffect } from 'react';

/**
 * Service worker mínimo para instalación PWA. No cachea respuestas todavía:
 * el modo offline se implementará cuando exista una estrategia de datos.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sin service worker la app sigue funcionando en línea.
    });
  }, []);

  return null;
}
