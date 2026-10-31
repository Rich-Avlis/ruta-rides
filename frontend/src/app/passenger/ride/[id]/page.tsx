'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import RequireAuth, { FullScreenLoader } from '@/components/RequireAuth';
import NegotiationPanel from '@/components/ride/NegotiationPanel';
import PaymentProof from '@/components/ride/PaymentProof';
import RatingForm from '@/components/ride/RatingForm';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { formatBs, formatDistance, formatDuration, formatMoney, formatTime } from '@/lib/geo';
import { getSocket } from '@/lib/socket';
import type { Ride, RouteGeometry } from '@/lib/types';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-canvas text-sm text-muted">
      Cargando mapa…
    </div>
  ),
});

const STATUS_LABELS: Record<string, string> = {
  SEARCHING_DRIVER: 'Buscando conductor',
  DRIVER_ASSIGNED: 'Conductor asignado',
  DRIVER_EN_ROUTE: 'Conductor en camino',
  DRIVER_ARRIVED: 'Conductor llegó',
  TRIP_STARTED: 'Viaje en curso',
  TRIP_COMPLETED: 'Viaje finalizado',
  PAYMENT_PENDING: 'Pago pendiente',
  COMPLETED: 'Viaje completado',
  CANCELLED: 'Viaje cancelado',
};

const STATUS_STEPS = [
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'TRIP_STARTED',
  'TRIP_COMPLETED',
  'COMPLETED',
];

function RideContent() {
  const params = useParams<{ id: string }>();
  const rideId = params?.id;
  const { user } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geometry, setGeometry] = useState<RouteGeometry | null>(null);

  const refreshRide = useCallback(async () => {
    if (!rideId) return;
    try {
      const { data } = await api.get<{ ride: Ride }>(`/api/rides/${rideId}`);
      setRide(data.ride);
      const driverProfile = data.ride.conductor?.driverProfile;
      if (driverProfile?.ubicacionLat && driverProfile?.ubicacionLng) {
        setDriverLocation({ lat: driverProfile.ubicacionLat, lng: driverProfile.ubicacionLng });
      }
      setError(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo cargar el viaje'));
    }
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;

    let active = true;

    api
      .get<{ ride: Ride }>(`/api/rides/${rideId}`)
      .then(({ data }) => {
        if (!active) return;
        setRide(data.ride);
        const driverProfile = data.ride.conductor?.driverProfile;
        if (driverProfile?.ubicacionLat && driverProfile?.ubicacionLng) {
          setDriverLocation({ lat: driverProfile.ubicacionLat, lng: driverProfile.ubicacionLng });
        }
        setLoading(false);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(getApiErrorMessage(requestError, 'No se pudo cargar el viaje'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;

    const socket = getSocket();
    socket.emit('join-ride', rideId);

    const onStatusChanged = () => {
      void refreshRide();
    };
    const onLocation = (data: { userId: string; lat: number; lng: number }) => {
      setDriverLocation((current) => {
        if (!ride?.conductorId || data.userId !== ride.conductorId) return current;
        return { lat: data.lat, lng: data.lng };
      });
    };

    socket.on('status-changed', onStatusChanged);
    socket.on('location-updated', onLocation);

    return () => {
      socket.emit('leave-ride', rideId);
      socket.off('status-changed', onStatusChanged);
      socket.off('location-updated', onLocation);
    };
  }, [rideId, refreshRide, ride?.conductorId]);

  useEffect(() => {
    if (!ride) return;

    let active = true;

    api
      .post<{ route: { geometry: RouteGeometry | null } }>('/api/routes/preview', {
        origin: { lat: ride.origenLat, lng: ride.origenLng },
        destination: { lat: ride.destinoLat, lng: ride.destinoLng },
        stops: ride.stops?.map((stop) => ({ lat: stop.lat, lng: stop.lng })) ?? [],
        modalidad: ride.modalidad ?? 'SOLO_IDA',
      })
      .then(({ data }) => {
        if (active) setGeometry(data.route.geometry);
      })
      .catch(() => {
        // El mapa sigue mostrando origen y destino.
      });

    return () => {
      active = false;
    };
  }, [ride]);

  const handleCancel = async () => {
    if (!rideId) return;

    setCancelling(true);
    try {
      const { data } = await api.put<{ ride: Ride }>(`/api/rides/${rideId}/status`, {
        estado: 'CANCELLED',
        motivo: 'Cancelado por el pasajero',
      });
      setRide(data.ride);
      toast.success('Viaje cancelado');
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'No se pudo cancelar el viaje'));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <FullScreenLoader label="Cargando viaje…" />;

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-canvas">
        <Header />
        <main className="mx-auto max-w-md px-4 py-10">
          <div className="card p-6">
            <p className="text-sm font-bold text-ruta-700">{error ?? 'Viaje no encontrado'}</p>
            <Link href="/passenger" className="btn-primary mt-4 w-full">
              Volver al mapa
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const currentIndex = STATUS_STEPS.indexOf(ride.estado);
  const canCancel = [
    'SEARCHING_DRIVER',
    'DRIVER_ASSIGNED',
    'DRIVER_EN_ROUTE',
    'DRIVER_ARRIVED',
  ].includes(ride.estado);
  const canNegotiate = ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED'].includes(
    ride.estado
  );

  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      <main id="contenido" className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="brutal-label">Viaje</span>
            <h1 className="mt-2 text-3xl font-black leading-none tracking-tight">
              {STATUS_LABELS[ride.estado] ?? ride.estado}
            </h1>
          </div>
          <Link href="/passenger" className="btn-secondary min-h-0 px-3 py-2 text-xs">
            Volver
          </Link>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="h-[45vh] overflow-hidden border border-line shadow-soft lg:h-[520px]">
            <MapView
              center={[ride.origenLat, ride.origenLng]}
              origin={{ lat: ride.origenLat, lng: ride.origenLng }}
              destination={{ lat: ride.destinoLat, lng: ride.destinoLng }}
              stops={ride.stops?.map((stop) => ({ lat: stop.lat, lng: stop.lng })) ?? []}
              driver={driverLocation}
              route={geometry}
            />
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <span className="brutal-label">Estado</span>
              <ol className="mt-4 space-y-2">
                {STATUS_STEPS.map((step, index) => {
                  const done = currentIndex >= 0 && index < currentIndex;
                  const current = index === currentIndex;
                  return (
                    <li
                      key={step}
                      className={`flex items-center gap-3 border-2 px-3 py-2 text-xs font-black uppercase tracking-wide ${
                        current
                          ? 'border-ink bg-ruta-500 text-ink'
                          : done
                            ? 'border-ink bg-ink text-white'
                            : 'border-line/40 bg-white text-muted'
                      }`}
                    >
                      <span className="inline-block h-2 w-2 bg-current" />
                      {STATUS_LABELS[step]}
                    </li>
                  );
                })}
              </ol>

              {ride.estado === 'CANCELLED' && (
                <p className="mt-3 border-2 border-ruta-500 bg-ruta-50 p-3 text-xs font-bold uppercase text-ruta-700">
                  Cancelado por {ride.canceladoPor?.toLowerCase() ?? 'el sistema'}
                  {ride.motivoCancelacion ? `: ${ride.motivoCancelacion}` : ''}
                </p>
              )}
            </div>

            {ride.conductor && (
              <div className="card p-5">
                <span className="brutal-label">Conductor</span>
                <p className="mt-3 text-lg font-black uppercase">
                  {ride.conductor.nombre} {ride.conductor.apellido}
                </p>
                {ride.conductor.driverProfile && (
                  <p className="text-sm text-muted">
                    {ride.conductor.driverProfile.tipoVehiculo} ·{' '}
                    {ride.conductor.driverProfile.marcaVehiculo}{' '}
                    {ride.conductor.driverProfile.modeloVehiculo} ·{' '}
                    {ride.conductor.driverProfile.colorVehiculo} ·{' '}
                    {ride.conductor.driverProfile.placaVehiculo}
                  </p>
                )}
                {ride.conductor.telefono && (
                  <a
                    href={`tel:${ride.conductor.telefono}`}
                    className="btn-secondary mt-3 w-full"
                  >
                    Llamar al conductor
                  </a>
                )}
              </div>
            )}

            <div className="card p-5">
              <span className="brutal-label">Pago</span>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-sm text-muted">
                  {ride.metodoPago === 'EFECTIVO' ? 'Efectivo' : 'Pago móvil'}
                </span>
                <span className="text-2xl font-black">
                  {formatMoney(ride.tarifaFinal ?? 0, ride.moneda ?? 'USD')}
                </span>
              </div>
              {ride.totalBs && (
                <p className="mt-1 text-sm font-black text-ruta-700">{formatBs(ride.totalBs)}</p>
              )}
              {ride.pago?.referencia && (
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">
                  Referencia {ride.pago.referencia}
                </p>
              )}
              <p className="mt-2 text-xs text-muted">
                Creado {formatTime(ride.createdAt)} · {formatDistance(ride.distancia ?? 0)} ·{' '}
                {formatDuration(ride.tiempoEstimado ?? 0)}
              </p>
            </div>

            <div className="card p-5">
              <span className="brutal-label">Ruta</span>
              <p className="mt-3 text-sm font-bold">{ride.origenDireccion || 'Origen'}</p>
              <p className="text-xs text-muted">→ {ride.destinoDireccion || 'Destino'}</p>
              {ride.stops && ride.stops.length > 0 && (
                <ol className="mt-2 space-y-1">
                  {ride.stops.map((stop) => (
                    <li key={stop.id} className="text-xs text-muted">
                      Parada {stop.orden}: {stop.nombre || stop.direccion || 'Punto'}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {ride.metodoPago === 'PAGO_MOVIL' &&
              ['TRIP_COMPLETED', 'PAYMENT_PENDING', 'COMPLETED'].includes(ride.estado) && (
                <PaymentProof
                  rideId={ride.id}
                  hasProof={Boolean(ride.pago?.comprobante)}
                  canUpload={ride.estado !== 'COMPLETED'}
                  onUploaded={() => void refreshRide()}
                />
              )}

            {canNegotiate && user && (
              <NegotiationPanel
                rideId={ride.id}
                currentUserId={user.id}
                currency={ride.moneda ?? 'USD'}
                onUpdated={() => void refreshRide()}
              />
            )}

            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="btn-secondary w-full border-ruta-500 text-ruta-700"
              >
                {cancelling ? 'Cancelando…' : 'Cancelar viaje'}
              </button>
            )}

            {ride.estado === 'COMPLETED' && (
              <>
                <RatingForm
                  rideId={ride.id}
                  role="PASSENGER"
                  alreadyRated={Boolean(ride.calificacionPasajero)}
                  onRated={() => void refreshRide()}
                />
                <Link href="/passenger" className="btn-primary w-full">
                  Pedir otro viaje
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PassengerRidePage() {
  return (
    <RequireAuth roles={['PASSENGER', 'ADMIN', 'SUPER_ADMIN']}>
      <RideContent />
    </RequireAuth>
  );
}
