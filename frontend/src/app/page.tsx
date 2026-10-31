'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenLoader } from '@/components/RequireAuth';
import { roleHome } from '@/lib/session';

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
      className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-ruta-500 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
        viewBox="0 0 400 800"
        fill="none"
        aria-hidden="true"
      >
        <path d="M-20 170 C 90 120, 130 280, 240 220 S 380 80, 440 160" stroke="#000" strokeWidth="2" />
        <path d="M-20 420 C 100 380, 160 520, 260 460 S 380 360, 440 430" stroke="#000" strokeWidth="2" />
        <path d="M-20 650 C 120 610, 180 730, 280 680 S 380 590, 440 640" stroke="#000" strokeWidth="2" />
        <circle cx="240" cy="220" r="6" fill="#000" />
        <circle cx="260" cy="460" r="6" fill="#000" />
        <circle cx="280" cy="680" r="6" fill="#000" />
      </svg>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-10">
        <div className="inline-flex w-fit rounded-3xl bg-white p-4 shadow-soft">
          <Image
            src="/brand/ruta-logo-black.png"
            alt="ruta RIDES"
            width={2872}
            height={1380}
            priority
            style={{ height: 54, width: 'auto' }}
          />
        </div>

        <h1 className="mt-8 text-[2.6rem] font-black leading-[0.98] tracking-tight text-black">
          Muévete fácil,
          <br />
          muévete mejor.
        </h1>

        <p className="mt-4 max-w-xs text-sm font-medium text-black/70">
          Tu viaje en Quíbor, con ubicación real, tarifa clara y conductor verificado.
        </p>

        <div className="mt-auto space-y-3 pt-12">
          <Link href="/start" className="btn-primary w-full bg-black text-white shadow-none hover:bg-black/90">
            Comenzar
          </Link>
          <Link
            href="/login"
            className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-white/15 px-4 text-sm font-bold text-black backdrop-blur"
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px] font-medium text-black/60">
          Al continuar aceptas el uso de tu ubicación para calcular el viaje.
        </p>
      </div>
    </main>
  );
}
