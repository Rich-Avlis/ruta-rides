'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RutaLogo from '@/components/RutaLogo';
import NotificationBell from '@/components/NotificationBell';
import { markLogout } from '@/lib/session';

const ROLE_LABEL: Record<string, string> = {
  PASSENGER: 'Pasajero',
  DRIVER: 'Conductor',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super admin',
  SUPPORT: 'Soporte',
  DOCUMENT_VERIFIER: 'Verificación',
};

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    markLogout();
    logout();
    router.replace('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      <div className="h-[3px] w-full bg-ruta-500" />
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <RutaLogo size={30} />

        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Navegación principal">
          {user ? (
            <>
              {user.rol === 'PASSENGER' && (
                <Link
                  href="/passenger"
                  className="btn-ghost min-h-0 h-9 px-3 text-xs"
                >
                  Viajar
                </Link>
              )}
              {user.rol === 'DRIVER' && (
                <Link
                  href="/driver"
                  className="btn-ghost min-h-0 h-9 px-3 text-xs"
                >
                  Conducir
                </Link>
              )}
              {(user.rol === 'ADMIN' || user.rol === 'SUPER_ADMIN') && (
                <Link
                  href="/admin"
                  className="pill border-ruta-200 bg-ruta-50 text-ruta-700"
                >
                  Tarifas
                </Link>
              )}
              <NotificationBell />
              <Link
                href="/profile"
                className="hidden text-right text-[11px] font-semibold leading-tight text-muted sm:block"
              >
                {user.nombre}
                <br />
                <span className="text-ruta-600">{ROLE_LABEL[user.rol] ?? user.rol}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="pill h-9"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="btn-ghost min-h-0 h-9 px-3 text-xs"
              >
                Iniciar sesión
              </Link>
              <Link href="/start" className="btn-primary min-h-0 h-9 px-4 text-xs">
                Comenzar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
