/**
 * En escritorio usa localhost. Si la app se abre desde otro host (LAN o
 * emulador), reemplaza localhost por el host actual para que el móvil llegue
 * al backend sin configuración extra.
 */
export function resolveApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  if (typeof window === 'undefined') return configured;

  try {
    const url = new URL(configured);
    const localHosts = ['localhost', '127.0.0.1'];
    const pageHost = window.location.hostname;

    if (localHosts.includes(url.hostname) && !localHosts.includes(pageHost)) {
      url.hostname = pageHost;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    // Configuración inválida: se usa tal cual.
  }

  return configured;
}
