'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import BottomNav from '@/components/ui/BottomNav';
import CityBackdrop from '@/components/brand/CityBackdrop';
import RequireAuth, { FullScreenLoader } from '@/components/RequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { formatBs, formatDistance, formatDuration, formatMoney } from '@/lib/geo';
import { getSocket } from '@/lib/socket';
import type { Ride } from '@/lib/types';

const ACTIVE_STATES = [
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'TRIP_STARTED',
  'TRIP_COMPLETED',
  'PAYMENT_PENDING',
];

function DriverContent() {
  const { user, profile, refreshProfile } = useAuth();
  const { position, status: locationStatus, error: locationError, requestLocation } = useLocation();
  const router = useRouter();
  const online = Boolean(profile && 'enLinea' in profile && profile.enLinea);
  const [pendingOnline, setPendingOnline] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);
  const [history, setHistory] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAvailable = useCallback(async () => {
    try {
      const { data } = await api.get<{ rides: Ride[]; enLinea: boolean }>(
        '/api/rides/available'
      );
      setRides(data.rides ?? []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudieron cargar las solicitudes'));
    }
  }, []);

  useEffect(() => {
    let active = true;

    api
      .get<{ rides: Ride[] }>('/api/rides/my-rides')
      .then(({ data }) => {
        if (!active) return;
        const list = data.rides ?? [];
        setHistory(list);
        const current = list.find((ride) => ACTIVE_STATES.includes(ride.estado));
        setActiveRide(current ?? null);
      })
      .catch(() => {
        // Sin historial no se bloquea la pantalla.
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!online) return;

    let active = true;

    const fetchRides = () => {
      api
        .get<{ rides: Ride[] }>('/api/rides/available')
        .then(({ data }) => {
          if (active) setRides(data.rides ?? []);
        })
        .catch(() => {
          // Se reintenta en el siguiente ciclo.
        });
    };

    fetchRides();
    const interval = setInterval(fetchRides, 10000);

    const socket = getSocket();
    socket.emit('join-drivers');
    const onNewRide = () => fetchRides();
    socket.on('ride-request', onNewRide);

    return () => {
      active = false;
      clearInterval(interval);
      socket.off('ride-request', onNewRide);
      socket.emit('leave-drivers');
    };
  }, [online]);

  useEffect(() => {
    if (!pendingOnline || !position) return;

    let active = true;

    api
      .post('/api/rides/driver/online', { lat: position.lat, lng: position.lng })
      .then(() => {
        if (!active) return;
        setPendingOnline(false);
        toast.success('Estás en línea');
        void refreshProfile();
      })
      .catch((error) => {
        if (!active) return;
        setPendingOnline(false);
        toast.error(getApiErrorMessage(error, 'No se pudo activar la disponibilidad'));
      });

    return () => {
      active = false;
    };
  }, [pendingOnline, position, refreshProfile]);

  const handleToggle = async () => {
    if (!online) {
      if (position) {
        setPendingOnline(true);
      } else {
        requestLocation();
        setPendingOnline(true);
      }
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/rides/driver/offline');
      setRides([]);
      toast.success('Estás fuera de línea');
      void refreshProfile();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo desconectar'));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (rideId: string) => {
    setBusyId(rideId);
    try {
      await api.post(`/api/rides/${rideId}/accept`);
      toast.success('Viaje aceptado');
      router.push(`/driver/ride/${rideId}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo aceptar el viaje'));
      await loadAvailable();
    } finally {
      setBusyId(null);
    }
  };

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayRides = history.filter(
      (ride) => new Date(ride.createdAt).toDateString() === today
    );
    const completedToday = todayRides.filter((ride) => ride.estado === 'COMPLETED');
    const earnings = completedToday.reduce(
      (total, ride) => total + (ride.tarifaFinal ?? 0),
      0
    );
    return { count: completedToday.length, earnings };
  }, [history]);

  if (!profile || !('tipoVehiculo' in profile)) {
    return <FullScreenLoader label="Cargando perfil de conductor…" />;
  }

  return (
    <div className="min-h-screen bg-ink pb-36 text-white">
      <header className="px-5 pb-14 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
                Panel conductor
              </p>
              <h1 className="mt-2 text-[1.9rem] font-black leading-tight tracking-tight">
                ¡Hola, {user?.nombre ?? 'conductor'}!
              </h1>
              <p className={`mt-1 flex items-center gap-2 text-sm font-bold ${online ? 'text-ruta-500' : 'text-white/50'}`}>
                <span className={`h-2 w-2 rounded-full ${online ? 'bg-ruta-500' : 'bg-white/30'}`} />
                {online ? 'Conductor activo' : 'Conductor fuera de línea'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggle}
              disabled={loading || (pendingOnline && !locationError) || locationStatus === 'requesting'}
              aria-pressed={online}
              aria-label="Cambiar disponibilidad"
              className={`relative mt-1 h-8 w-14 shrink-0 rounded-full transition-colors ${
                online ? 'bg-ruta-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
                  online ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {locationError && (
            <p className="mt-3 rounded-xl border border-ruta-500 bg-ruta-500/10 p-3 text-xs font-bold text-ruta-300">
              {locationError}
            </p>
          )}
        </div>
      </header>

      <main id="contenido" className="mx-auto -mt-8 max-w-md px-4">
        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center backdrop-blur">
            <p className="text-xl font-black leading-none">{stats.count}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
              Viajes hoy
            </p>
          </div>
          <div className="rounded-2xl border border-ruta-500/40 bg-ruta-500 p-3 text-center text-ink">
            <p className="text-xl font-black leading-none">
              {formatMoney(stats.earnings, 'USD')}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink/60">
              Ganancias
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center backdrop-blur">
            <p className="text-xl font-black leading-none text-ruta-500">
              {profile.calificacion?.toFixed(1) ?? '—'}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
              Calificación
            </p>
          </div>
        </section>

        {activeRide ? (
          <Link
            href={`/driver/ride/${activeRide.id}`}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-ruta-500 py-3.5 text-sm font-black text-ink"
          >
            <span aria-hidden="true">◉</span> Continuar viaje activo
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              requestLocation();
              toast.success('Mostrando tu ubicación');
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-ruta-500 py-3.5 text-sm font-black text-ink transition-transform active:scale-[0.99]"
          >
            <span aria-hidden="true">◉</span> Ver mapa en vivo
          </button>
        )}

        <section className="mt-5 rounded-[1.4rem] bg-white p-4 text-ink">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-black">Próximas solicitudes</h2>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              {online ? `${rides.length} activas` : 'Offline'}
            </span>
          </div>

          {!online && (
            <p className="mt-3 rounded-xl bg-fog p-3 text-xs font-semibold text-muted">
              Activa tu disponibilidad para empezar a recibir viajes.
            </p>
          )}

          {online && rides.length === 0 && (
            <p className="mt-3 rounded-xl bg-fog p-3 text-xs font-semibold text-muted">
              No hay solicitudes ahora. La lista se actualiza sola.
            </p>
          )}

          {online && rides.length > 0 && (
            <ul className="mt-3 space-y-2">
              {rides.map((ride) => (
                <li key={ride.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black uppercase tracking-wide text-muted">
                        {ride.pasajero?.nombre ?? 'Pasajero'}
                      </p>
                      <p className="mt-1 truncate text-sm font-bold">
                        {ride.origenDireccion || 'Origen'}
                      </p>
                      <p className="truncate text-xs text-muted">
                        → {ride.destinoDireccion || 'Destino'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black leading-none">
                        {formatMoney(ride.tarifaFinal ?? 0, ride.moneda ?? 'USD')}
                      </p>
                      {ride.totalBs && (
                        <p className="mt-1 text-[11px] font-bold text-ruta-700">
                          {formatBs(ride.totalBs)}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                    {formatDistance(ride.distancia ?? 0)} ·{' '}
                    {formatDuration(ride.tiempoEstimado ?? 0)} ·{' '}
                    {ride.modalidad ?? 'SOLO_IDA'}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleAccept(ride.id)}
                    disabled={busyId === ride.id}
                    className="btn-primary mt-2.5 min-h-0 w-full py-2.5 text-sm"
                  >
                    {busyId === ride.id ? 'Aceptando…' : 'Aceptar viaje'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-3 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
            Tu vehículo
          </p>
          <p className="mt-1 text-sm font-black">
            {profile.tipoVehiculo} · {profile.marcaVehiculo} {profile.modeloVehiculo}
          </p>
          <p className="text-xs text-white/50">
            {profile.colorVehiculo} · {profile.placaVehiculo}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Link
              href="/driver/earnings"
              className="rounded-xl border border-white/15 py-2 text-center text-xs font-bold text-white/80"
            >
              Ingresos
            </Link>
            <Link
              href="/wallet"
              className="rounded-xl bg-ruta-500 py-2 text-center text-xs font-black text-ink"
            >
              Billetera
            </Link>
            <Link
              href="/profile"
              className="rounded-xl border border-white/15 py-2 text-center text-xs font-bold text-white/80"
            >
              Perfil
            </Link>
          </div>
        </section>

        <p className="mt-4 pb-2 text-center text-[11px] text-white/35">
          Compartir ubicación solo mientras estás en línea.
        </p>

        <CityBackdrop tone="dark" opacity={0.16} className="mt-2" />
      </main>

      <BottomNav role="DRIVER" />
    </div>
  );
}

export default function DriverPage() {
  return (
    <RequireAuth roles={['DRIVER']}>
      <DriverContent />
    </RequireAuth>
  );
}
