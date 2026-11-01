'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenLoader } from '@/components/RequireAuth';
import { roleHome } from '@/lib/session';
import CitySkyline from '@/components/brand/CitySkyline';

const options = [
  {
    href: '/register?role=PASSENGER',
    title: 'Soy pasajero',
    description: 'Solicita un viaje y llega a tu destino',
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="7.5" r="4" fill="currentColor" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0Z" fill="currentColor" />
      </svg>
    ),
    primary: true,
  },
  {
    href: '/register?role=DRIVER',
    title: 'Soy conductor',
    description: 'Conduce, gana y comparte el camino',
    icon: (
      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4.2 15.5 5.7 10a2.2 2.2 0 0 1 2.1-1.6h8.4a2.2 2.2 0 0 1 2.1 1.6l1.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M3 15.5h18v3.2a1 1 0 0 1-1 1h-1.4a1 1 0 0 1-1-1v-1H6.4v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3.2Z" fill="currentColor" />
        <circle cx="7.4" cy="18" r="1.2" fill="#fff" />
        <circle cx="16.6" cy="18" r="1.2" fill="#fff" />
      </svg>
    ),
    primary: false,
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
    <main
      id="contenido"
      className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-white"
    >
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 text-xs font-bold text-muted transition-colors hover:text-ink"
        >
          <span aria-hidden="true">←</span> Volver
        </Link>

        <div className="mt-8 flex flex-col items-center text-center">
          <Image
            src="/brand/ruta-logo-black.png"
            alt="RUTA RIDES"
            width={220}
            height={106}
            priority
            className="h-[52px] w-auto"
          />
        </div>

        <h1 className="mt-8 text-[2.15rem] font-black leading-[1.02] tracking-[-0.035em] text-ink">
          ¿Cómo quieres
          <br />
          continuar?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Elige tu modo. Puedes cambiar de cuenta cuando quieras.
        </p>

        <div className="mt-7 space-y-4">
          {options.map((option) => (
            <Link
              key={option.href}
              href={option.href}
              className="group flex items-center gap-4 rounded-[1.6rem] border border-line bg-white p-5 shadow-[0_10px_30px_rgba(11,11,11,0.07)] transition-transform duration-150 active:scale-[0.99]"
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
                  option.primary ? 'bg-ruta-50 text-ink' : 'bg-ink text-white'
                }`}
              >
                {option.icon}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[1.05rem] font-black leading-tight tracking-tight text-ink">
                  {option.title}
                </span>
                <span className="mt-1 block text-[12.5px] leading-snug text-muted">
                  {option.description}
                </span>
              </span>

              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  option.primary ? 'bg-ruta-500 text-ink' : 'bg-ink text-white'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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

      <div className="pointer-events-none relative mt-2 w-full">
        <CitySkyline className="h-24 w-full object-cover object-bottom" />
        <div className="h-4 bg-ruta-500" />
      </div>
    </main>
  );
}
