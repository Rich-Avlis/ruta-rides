import type { User, UserRole } from './types';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function readStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !('id' in parsed)) return null;
    return parsed as User;
  } catch {
    return null;
  }
}

export function persistSession(token: string, user: User): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // El navegador puede bloquear el almacenamiento (modo privado o cuota llena).
  }
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // Nada que limpiar.
  }
}

export function isAdmin(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

/**
 * Área de aterrizaje por rol. La ruta /driver se activa en la fase de
 * experiencia del conductor; hasta entonces el panel cumple esa función.
 */
export function roleHome(role: UserRole): string {
  if (role === 'DRIVER') return '/driver';
  if (role === 'PASSENGER') return '/passenger';
  return '/dashboard';
}

/** Solo permite rutas internas para evitar redirecciones abiertas. */
export function safeNextPath(next: string | null, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}

let lastLogoutAt = 0;

/** Marca el cierre de sesión para que los guards no compitan con la salida. */
export function markLogout(): void {
  lastLogoutAt = Date.now();
}

export function wasJustLoggedOut(): boolean {
  return Date.now() - lastLogoutAt < 3000;
}
