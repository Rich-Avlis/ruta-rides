'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import BottomNav from '@/components/ui/BottomNav';
import CityBackdrop from '@/components/brand/CityBackdrop';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import type { Ride } from '@/lib/types';

const ROLE_LABEL: Record<string, string> = {
  PASSENGER: 'Pasajero',
  DRIVER: 'Conductor',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super administrador',
};

const icons = {
  trips: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  heart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20s-7-4.3-7-9.3A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7 3.7c0 5-7 9.3-7 9.3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  card: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  bell: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 15V10a6 6 0 1 0-12 0v5l-2 3h16l-2-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  help: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  ),
  exit: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 8l4 4-4 4M19 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function Row({
  icon,
  label,
  hint,
  href,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const content = (
    <>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${danger ? 'bg-red-50 text-red-600' : 'bg-fog text-ink'}`}>
        {icon}
      </span>
      <span className={`flex-1 text-left text-[15px] font-bold ${danger ? 'text-red-600' : 'text-ink'}`}>
        {label}
      </span>
      {hint && <span className="text-[11px] font-bold uppercase tracking-wide text-muted">{hint}</span>}
      {!danger && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-muted">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-fog/60">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-fog/60">
      {content}
    </button>
  );
}

function ProfileContent() {
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);

  useEffect(() => {
    let active = true;
    api
      .get<{ rides: Ride[] }>('/api/rides/my-rides')
      .then(({ data }) => {
        if (active) setRides(data.rides ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  const completed = rides.filter((ride) => ride.estado === 'COMPLETED').length;
  const rating =
    profile && 'calificacion' in profile && typeof profile.calificacion === 'number'
      ? profile.calificacion.toFixed(1)
      : '—';
  const initials = `${user.nombre?.[0] ?? ''}${user.apellido?.[0] ?? ''}`.toUpperCase();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-white pb-40">
      <header className="sticky top-0 z-40 border-b border-line bg-white/92 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <h1 className="text-base font-black tracking-tight">Mi perfil</h1>
          <span className="rounded-full border border-line px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {ROLE_LABEL[user.rol] ?? user.rol}
          </span>
        </div>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <section className="flex items-center gap-4">
          <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-ink text-xl font-black text-white">
            {user.foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.foto} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              initials || 'R'
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ruta-600">Tu cuenta</p>
            <h2 className="mt-1 truncate text-[1.6rem] font-black leading-tight tracking-tight">
              ¡Hola, {user.nombre}!
            </h2>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-2 rounded-[1.4rem] bg-ink p-3 text-white">
          <div className="text-center">
            <p className="text-2xl font-black leading-none">{rides.length}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">Viajes</p>
          </div>
          <div className="border-x border-white/10 text-center">
            <p className="text-2xl font-black leading-none text-ruta-500">{rating}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">Calificación</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black leading-none">{completed}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">Completados</p>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-[1.4rem] border border-line bg-white shadow-[0_2px_10px_rgba(11,11,11,0.04)]">
          <div className="divide-y divide-line">
            <Row icon={icons.trips} label="Mis viajes" href="/dashboard" />
            {user.rol !== 'DRIVER' && (
              <Row icon={icons.heart} label="Mis favoritos" href="/favorites" />
            )}
            <Row
              icon={icons.card}
              label="Métodos de pago"
              hint="Efectivo · Pago móvil"
            />
            <a
              href="mailto:soporte@rutarides.com"
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-fog/60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fog text-ink">
                {icons.help}
              </span>
              <span className="flex-1 text-[15px] font-bold">Ayuda y soporte</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-muted">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-[1.4rem] border border-line bg-white">
          <Row icon={icons.exit} label="Cerrar sesión" onClick={handleLogout} danger />
        </section>

        <p className="mt-6 text-center text-[11px] text-muted">
          RUTA RIDES · Lara, Venezuela
        </p>
      </main>

      <CityBackdrop tone="light" opacity={0.35} className="mt-auto" />

      <BottomNav role={user.rol} />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}
