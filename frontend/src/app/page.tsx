'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenLoader } from '@/components/RequireAuth';
import { roleHome } from '@/lib/session';
import CitySkyline from '@/components/brand/CitySkyline';

const promises = [
  { label: 'Seguro', icon: 'shield' },
  { label: 'Rápido', icon: 'bolt' },
  { label: 'En tu ciudad', icon: 'pin' },
] as const;

function PromiseIcon({ name }: { name: (typeof promises)[number]['icon'] }) {
  if (name === 'shield') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l7 3v6c0 4.4-3 8-7 9-4-1-7-4.6-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'bolt') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace(roleHome(user.rol));
  }, [loading, user, router]);

  if (loading || user) return <FullScreenLoader label="Restaurando sesión…" />;

  return (
    <main
      id="contenido"
      className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-ink text-white"
    >
      <div
        className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-ruta-500/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[58%] bg-gradient-to-b from-ink/40 via-ink/60 to-ink"
        aria-hidden="true"
      />
      <CitySkyline className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] w-full object-cover object-bottom opacity-[0.34] invert" />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink via-ink/40 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.75rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between">
          <Image
            src="/brand/ruta-logo-orange.png"
            alt="RUTA RIDES"
            width={220}
            height={106}
            priority
            className="h-[54px] w-auto"
          />
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
            Quíbor
          </span>
        </header>

        <div className="mt-auto pt-24">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-ruta-500">
            Movilidad urbana
          </p>
          <h1 className="mt-3 text-[2.9rem] font-black leading-[0.92] tracking-[-0.04em]">
            Tu ciudad,
            <br />
            tu <span className="text-ruta-500">ruta.</span>
          </h1>
          <p className="mt-4 max-w-[19rem] text-sm leading-relaxed text-white/60">
            Pide tu viaje en Quíbor, conoce la tarifa antes de salir y sigue
            cada tramo en el mapa.
          </p>

          <div className="mt-8 space-y-3">
            <Link
              href="/register?role=PASSENGER"
              className="btn-primary w-full justify-between px-5"
            >
              <span>Soy pasajero</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/register?role=DRIVER"
              className="flex min-h-[52px] w-full items-center justify-between rounded-2xl border border-white/25 bg-white/5 px-5 text-sm font-extrabold text-white backdrop-blur transition-colors hover:border-white/50"
            >
              <span>Soy conductor</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <p className="mt-4 text-center text-[12px] text-white/50">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-bold text-white underline decoration-ruta-500 decoration-2 underline-offset-4">
              Inicia sesión
            </Link>
          </p>
        </div>

        <footer className="mt-8 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
          {promises.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1.5 text-white/60">
              <PromiseIcon name={item.icon} />
              <span className="text-[11px] font-semibold">{item.label}</span>
            </div>
          ))}
        </footer>
      </div>
    </main>
  );
}
