'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenLoader } from '@/components/RequireAuth';
import { roleHome } from '@/lib/session';

const options = [
  {
    href: '/register?role=PASSENGER',
    step: '01',
    title: 'Soy pasajero',
    description: 'Pide tu viaje, mira la tarifa y sigue el mapa.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    tone: 'bg-ruta-50 text-ruta-600',
  },
  {
    href: '/register?role=DRIVER',
    step: '02',
    title: 'Soy conductor',
    description: 'Conecta tu vehículo, recibe viajes y cobra.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 16l1.5-5.5A2 2 0 0 1 7.4 9h9.2a2 2 0 0 1 1.9 1.5L20 16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M3 16h18v4H3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    ),
    tone: 'bg-ink text-white',
  },
];

export default function StartPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace(roleHome(user.rol));
  }, [loading, user, router]);

  if (loading || user) return <FullScreenLoader label="Restaurando sesión…" />;

  return (
    <main id="contenido" className="min-h-[100dvh] bg-canvas">
      <section className="bg-ink px-6 pb-14 pt-[max(2rem,env(safe-area-inset-top))] text-white">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-white/55 transition-colors hover:text-white"
          >
            <span aria-hidden="true">←</span> Volver
          </Link>

          <span className="eyebrow mt-8 inline-flex">Tu cuenta</span>

          <h1 className="display mt-4 text-white">
            ¿Cómo vas
            <br />
            a rodar?
          </h1>
          <p className="mt-3 max-w-[19rem] text-sm leading-relaxed text-white/60">
            Elige tu modo. Una sola cuenta puede pedir viajes o conducir.
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-8 w-full max-w-md px-5 pb-12">
        <div className="space-y-3">
          {options.map((option) => (
            <Link
              key={option.href}
              href={option.href}
              className="card group flex items-center gap-4 p-4 transition-transform duration-150 active:scale-[0.99]"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${option.tone}`}
              >
                {option.icon}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-[0.16em] text-muted">
                    {option.step}
                  </span>
                  <span className="block text-base font-black tracking-tight">
                    {option.title}
                  </span>
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-muted">
                  {option.description}
                </span>
              </span>

              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ruta-600 transition-colors group-hover:border-ruta-500 group-hover:bg-ruta-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-bold text-ink underline decoration-ruta-500 decoration-2 underline-offset-4">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
