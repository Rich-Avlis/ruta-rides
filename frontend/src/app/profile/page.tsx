'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import RequireAuth from '@/components/RequireAuth';
import BottomNav from '@/components/ui/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import type { Ride } from '@/lib/types';

const ROLE_LABEL: Record<string, string> = {
  PASSENGER: 'Pasajero',
  DRIVER: 'Conductor',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super administrador',
};

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
    <div className="min-h-screen bg-canvas pb-24">
      <Header />

      <main id="contenido" className="mx-auto max-w-2xl px-4 py-6">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ruta-500 text-2xl font-black text-black">
              {initials || 'R'}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black">
                {user.nombre} {user.apellido}
              </h1>
              <p className="text-sm font-semibold text-ruta-700">
                {ROLE_LABEL[user.rol] ?? user.rol}
              </p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
            <div>
              <p className="text-2xl font-black">{rides.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Viajes</p>
            </div>
            <div>
              <p className="text-2xl font-black">{completed}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Completados</p>
            </div>
            <div>
              <p className="text-2xl font-black text-ruta-600">{rating}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Calificación</p>
            </div>
          </div>
        </div>

        <div className="card mt-4 divide-y divide-line overflow-hidden">
          <Link href="/dashboard" className="flex items-center justify-between px-5 py-4 hover:bg-ruta-50">
            <span className="font-semibold">Mis viajes</span>
            <span className="text-muted">→</span>
          </Link>
          {user.rol !== 'DRIVER' && (
            <Link href="/favorites" className="flex items-center justify-between px-5 py-4 hover:bg-ruta-50">
              <span className="font-semibold">Mis favoritos</span>
              <span className="text-muted">→</span>
            </Link>
          )}
          <div className="flex items-center justify-between px-5 py-4">
            <span className="font-semibold">Métodos de pago</span>
            <span className="text-xs font-bold uppercase text-muted">Efectivo · Pago móvil</span>
          </div>
          <a href="mailto:soporte@rutarides.local" className="flex items-center justify-between px-5 py-4 hover:bg-ruta-50">
            <span className="font-semibold">Ayuda y soporte</span>
            <span className="text-muted">→</span>
          </a>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="btn-secondary mt-4 w-full border-red-200 text-red-600 hover:bg-red-50"
        >
          Cerrar sesión
        </button>
      </main>

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
