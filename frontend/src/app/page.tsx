'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenLoader } from '@/components/RequireAuth';
import { roleHome } from '@/lib/session';

const guarantees = [
  { title: 'GPS real', text: 'Origen y destino exactos' },
  { title: 'Tarifa clara', text: 'Precio antes de salir' },
  { title: 'Conductor', text: 'Verificado en la app' },
];

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
      className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-white"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[52vh] bg-[radial-gradient(120%_90%_at_50%_0%,#FFF1E6_0%,#FFFFFF_72%)]"
        aria-hidden="true"
      />
      <svg
        className="pointer-events-none absolute -right-10 top-24 h-72 w-72 text-line"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 170 C 60 140, 40 96, 84 78 S 140 60, 150 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 8"
        />
        <circle cx="20" cy="170" r="5" fill="#FD7624" />
        <circle cx="150" cy="24" r="7" fill="none" stroke="#FD7624" strokeWidth="2" />
      </svg>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-[max(1.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between">
          <Image
            src="/brand/ruta-logo-black.png"
            alt="RUTA RIDES"
            width={2872}
            height={1380}
            priority
            style={{ height: 34, width: 'auto' }}
          />
          <span className="rounded-full border border-line bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Quíbor
          </span>
        </header>

        <section className="mt-14">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-ruta-600">
            Muévete a tu manera
          </p>
          <h1 className="mt-3 text-[2.7rem] font-black leading-[0.95] tracking-[-0.03em] text-ink">
            Tu viaje,
            <br />
            sin vueltas.
          </h1>
          <p className="mt-4 max-w-[19rem] text-[15px] leading-relaxed text-muted">
            Pide tu viaje en Quíbor, conoce la tarifa antes de salir y sigue a tu
            conductor en el mapa.
          </p>
        </section>

        <div className="mt-8 grid grid-cols-3 gap-2">
          {guarantees.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-line bg-white/70 px-3 py-3"
            >
              <p className="text-[11px] font-black uppercase tracking-wide text-ink">
                {item.title}
              </p>
              <p className="mt-1 text-[10.5px] leading-snug text-muted">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-3 pt-10">
          <Link href="/start" className="btn-primary w-full">
            Comenzar
          </Link>
          <Link
            href="/login"
            className="btn-secondary w-full border-ink/15 text-ink"
          >
            Ya tengo cuenta
          </Link>
          <p className="pt-1 text-center text-[11px] leading-relaxed text-muted">
            Al continuar aceptas el uso de tu ubicación para calcular el viaje.
          </p>
        </div>
      </div>
    </main>
  );
}
