'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNav from '@/components/ui/BottomNav';
import CityBackdrop from '@/components/brand/CityBackdrop';
import RequireAuth, { FullScreenLoader } from '@/components/RequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import type { Ride } from '@/lib/types';
import toast from 'react-hot-toast';

const ROLE_INTRO: Record<string, string> = {
  PASSENGER: 'Tu panel de pasajero',
  DRIVER: 'Tu panel de conductor',
  ADMIN: 'Panel de administración',
  SUPER_ADMIN: 'Panel de administración',
  SUPPORT: 'Panel de soporte',
  DOCUMENT_VERIFIER: 'Panel de verificación',
};

function DashboardContent() {
  const { user, profile } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;

    let active = true;

    api
      .get<{ rides: Ride[] }>('/api/rides/my-rides')
      .then(({ data }) => {
        if (active) setRides(data.rides ?? []);
      })
      .catch((error) => {
        if (active) toast.error(getApiErrorMessage(error, 'No se pudo cargar tu historial'));
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;
  if (loadingData) return <FullScreenLoader label="Cargando tu panel…" />;

  const completedRides = rides.filter((ride) => ride.estado === 'COMPLETED').length;
  const activeRides = rides.filter((ride) =>
    ['REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'TRIP_STARTED'].includes(
      ride.estado
    )
  ).length;
  const rating =
    profile && 'calificacion' in profile && typeof profile.calificacion === 'number'
      ? profile.calificacion.toFixed(1)
      : null;
  const isAdminUser = user.rol === 'ADMIN' || user.rol === 'SUPER_ADMIN';

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Header />

      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24">
        <div className="mb-8">
          <span className="brutal-label">{ROLE_INTRO[user.rol] ?? 'Panel'}</span>
          <h1 className="mt-3 text-3xl font-black leading-none tracking-tight md:text-4xl">
            Hola, {user.nombre} {user.apellido}
          </h1>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <div className="brutal-tile bg-ruta-500 p-4 text-ink shadow-card">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/70">
              Total viajes
            </p>
            <p className="text-4xl font-black">{rides.length}</p>
          </div>
          <div className="brutal-tile bg-ink p-4 text-white shadow-card">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
              Completados
            </p>
            <p className="text-4xl font-black">{completedRides}</p>
          </div>
          <div className="brutal-tile bg-white p-4 shadow-card">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">
              Activos
            </p>
            <p className="text-4xl font-black">{activeRides}</p>
          </div>
          <div className="brutal-tile bg-white p-4 shadow-card">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">
              Calificación
            </p>
            <p className="text-4xl font-black text-ruta-600">{rating ?? '—'}</p>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="card p-6">
            <span className="brutal-label">Cuenta</span>
            <h2 className="mt-3 text-xl font-black">Cuenta activa</h2>
            <p className="mt-1 text-sm text-muted">
              Sesión verificada contra el servidor. Tu correo es {user.email}.
            </p>
            <p className="mt-3 text-sm">
              Estado de verificación:{' '}
              <span className="font-black uppercase">
                {user.verificado ? 'Verificada' : 'Pendiente'}
              </span>
            </p>
          </div>

          <div className="card p-6">
            <span className="brutal-label">{isAdminUser ? 'Admin' : 'Viaje'}</span>
            <h2 className="mt-3 text-xl font-black">
              {isAdminUser
                ? 'Administración'
                : user.rol === 'DRIVER'
                  ? 'Recibir viajes'
                  : 'Solicitar un viaje'}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {isAdminUser
                ? 'Edita tarifas, tasa Bs/USD, descuento, redondeo y multiplicadores de zona.'
                : user.rol === 'DRIVER'
                  ? 'Actívate, comparte tu ubicación y acepta solicitudes de pasajeros cerca de ti.'
                  : 'Abre el mapa, elige origen y destino, y consulta distancia, tiempo y tarifa estimada.'}
            </p>
            {isAdminUser ? (
              <Link href="/admin" className="btn-primary mt-4 w-full sm:w-auto">
                Abrir admin
              </Link>
            ) : user.rol === 'DRIVER' ? (
              <Link href="/driver" className="btn-primary mt-4 w-full sm:w-auto">
                Abrir modo conductor
              </Link>
            ) : (
              <Link href="/passenger" className="btn-primary mt-4 w-full sm:w-auto">
                Abrir mapa
              </Link>
            )}
          </div>
        </div>

        <section className="card p-6" aria-labelledby="rides-title">
          <span className="brutal-label">Historial</span>
          <h2 id="rides-title" className="mb-4 mt-3 text-xl font-black">
            Viajes recientes
          </h2>

          {rides.length === 0 ? (
            <p className="py-8 text-center text-muted">Todavía no tienes viajes registrados.</p>
          ) : (
            <ul className="space-y-3">
              {rides.slice(0, 5).map((ride) => (
                <li
                  key={ride.id}
                  className="flex items-center justify-between gap-3 border border-line bg-white p-4"
                >
                  <div>
                    <p className="font-bold">
                      {ride.origenDireccion || 'Origen'} → {ride.destinoDireccion || 'Destino'}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">
                      {new Date(ride.createdAt).toLocaleDateString('es-VE')} · {ride.estado}
                    </p>
                  </div>
                  <p className="text-lg font-black text-ruta-600">
                    {typeof ride.tarifaFinal === 'number' ? `$${ride.tarifaFinal.toFixed(2)}` : '—'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <CityBackdrop tone="light" opacity={0.3} className="mt-auto" />

      <BottomNav role={user.rol} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
