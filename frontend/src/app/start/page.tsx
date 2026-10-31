'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenLoader } from '@/components/RequireAuth';
import { roleHome } from '@/lib/session';

export default function StartPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace(roleHome(user.rol));
  }, [loading, user, router]);

  if (loading || user) return <FullScreenLoader label="Restaurando sesión…" />;

  return (
    <main id="contenido" className="min-h-[100dvh] bg-canvas px-5 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <Link href="/" className="text-sm font-bold text-muted hover:text-ruta-600">
          ← Volver
        </Link>

        <h1 className="mt-6 text-3xl font-black tracking-tight">¿Cómo vas a usar RUTA RIDES?</h1>
        <p className="mt-2 text-sm text-muted">Elige tu modo. Puedes cambiar de cuenta cuando quieras.</p>

        <div className="mt-7 space-y-4">
          <Link
            href="/register?role=PASSENGER"
            className="card flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ruta-50 text-ruta-600">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-black">Soy pasajero</span>
              <span className="block text-sm text-muted">Solicita un viaje y llega a tu destino.</span>
            </span>
            <span className="text-ruta-600">→</span>
          </Link>

          <Link
            href="/register?role=DRIVER"
            className="card flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 16l1.5-5.5A2 2 0 0 1 7.4 9h9.2a2 2 0 0 1 1.9 1.5L20 16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M3 16h18v4H3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="7.5" cy="20" r="1.5" fill="currentColor" />
                <circle cx="16.5" cy="20" r="1.5" fill="currentColor" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-black">Soy conductor</span>
              <span className="block text-sm text-muted">Conduce, gana y comparte el camino.</span>
            </span>
            <span className="text-ruta-600">→</span>
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-bold text-ruta-700 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
