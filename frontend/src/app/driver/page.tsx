'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import BottomNav from '@/components/ui/BottomNav';
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
  const { profile, refreshProfile } = useAuth();
  const { position, status: locationStatus, error: locationError, requestLocation } = useLocation();
  const router = useRouter();
  const online = Boolean(profile && 'enLinea' in profile && profile.enLinea);
  const [pendingOnline, setPendingOnline] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);
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
        const current = (data.rides ?? []).find((ride) => ACTIVE_STATES.includes(ride.estado));
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

  if (!profile || !('tipoVehiculo' in profile)) {
    return <FullScreenLoader label="Cargando perfil de conductor…" />;
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      <main id="contenido" className="mx-auto max-w-5xl px-4 py-6 pb-24">
        <span className="brutal-label">Conductor</span>
        <h1 className="mt-3 text-3xl font-black leading-none tracking-tight">
          Conducir
        </h1>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1.4fr]">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                  Disponibilidad
                </p>
                <p className="text-2xl font-black">
                  {online ? 'En línea' : 'Fuera de línea'}
                </p>
              </div>
              <span
                className={`inline-block h-5 w-5 border border-line ${
                  online ? 'bg-ruta-500' : 'bg-white'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={handleToggle}
              disabled={loading || (pendingOnline && !locationError) || locationStatus === 'requesting'}
              className={`mt-4 w-full ${online ? 'btn-secondary' : 'btn-primary'}`}
            >
              {loading || (pendingOnline && !locationError)
                ? 'Procesando…'
                : online
                  ? 'Ponerme fuera de línea'
                  : 'Ponerme en línea'}
            </button>

            {locationError && (
              <p className="mt-3 border-2 border-ruta-500 bg-ruta-50 p-3 text-xs font-bold text-ruta-700">
                {locationError}
              </p>
            )}

            <div className="mt-4 border-t border-line pt-3 text-xs text-muted">
              <p>
                {profile.tipoVehiculo} · {profile.marcaVehiculo} {profile.modeloVehiculo}
              </p>
              <p>
                {profile.colorVehiculo} · {profile.placaVehiculo}
              </p>
              <p className="mt-1 font-black uppercase text-ink">
                Calificación {profile.calificacion?.toFixed(1) ?? '—'} ·{' '}
                {profile.cantidadViajes ?? 0} viajes
              </p>
            </div>
          </div>

          <div className="card p-5">
            <span className="brutal-label">Solicitudes</span>
            <h2 className="mt-3 text-xl font-black">
              {online ? 'Viajes cerca de ti' : 'Actívate para recibir viajes'}
            </h2>

            {activeRide && (
              <Link
                href={`/driver/ride/${activeRide.id}`}
                className="mt-3 block border border-line bg-ruta-500 p-3 text-sm font-black uppercase text-ink shadow-card"
              >
                Tienes un viaje activo · {activeRide.estado}
              </Link>
            )}

            {!online && (
              <p className="mt-3 text-sm text-muted">
                Pon tu disponibilidad en línea y comparte tu ubicación para recibir solicitudes.
              </p>
            )}

            {online && rides.length === 0 && (
              <p className="mt-3 text-sm text-muted">
                No hay solicitudes en este momento. La lista se actualiza sola.
              </p>
            )}

            {online && rides.length > 0 && (
              <ul className="mt-4 space-y-3">
                {rides.map((ride) => (
                  <li key={ride.id} className="border border-line p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-muted">
                          {ride.pasajero?.nombre ?? 'Pasajero'}
                        </p>
                        <p className="mt-1 text-sm font-bold">{ride.origenDireccion || 'Origen'}</p>
                        <p className="text-xs text-muted">→ {ride.destinoDireccion || 'Destino'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black">
                          {formatMoney(ride.tarifaFinal ?? 0, ride.moneda ?? 'USD')}
                        </p>
                        {ride.totalBs && (
                          <p className="text-xs font-bold text-ruta-700">{formatBs(ride.totalBs)}</p>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                      {formatDistance(ride.distancia ?? 0)} ·{' '}
                      {formatDuration(ride.tiempoEstimado ?? 0)} ·{' '}
                      {ride.modalidad ?? 'SOLO_IDA'}
                      {ride.distanciaRecogida !== undefined && ride.distanciaRecogida !== null
                        ? ` · recogida ${ride.distanciaRecogida} km`
                        : ''}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleAccept(ride.id)}
                      disabled={busyId === ride.id}
                      className="btn-primary mt-3 w-full"
                    >
                      {busyId === ride.id ? 'Aceptando…' : 'Aceptar viaje'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
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
