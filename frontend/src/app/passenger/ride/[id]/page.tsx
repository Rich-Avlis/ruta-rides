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

  const shareRide = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Mi viaje en RUTA RIDES', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Enlace del viaje copiado');
      }
    } catch {
      // El usuario canceló el diálogo de compartir.
    }
  };

  const driverName = ride.conductor
    ? `${ride.conductor.nombre} ${ride.conductor.apellido}`
    : 'Buscando conductor';
  const driverPhone = ride.conductor?.telefono ?? null;
  const profile = ride.conductor?.driverProfile;
  const progress =
    currentIndex >= 0 ? Math.round((currentIndex / (STATUS_STEPS.length - 1)) * 100) : 0;
  const etaMinutes =
    ride.estado === 'TRIP_STARTED'
      ? ride.tiempoEstimado ?? 0
      : ride.estado === 'DRIVER_ASSIGNED' || ride.estado === 'DRIVER_EN_ROUTE'
        ? ride.tiempoEstimado ?? 0
        : 0;

  return (
    <div className="min-h-screen bg-white pb-10">
      <div className="relative h-[52vh] w-full">
        <MapView
          center={[ride.origenLat, ride.origenLng]}
          origin={{ lat: ride.origenLat, lng: ride.origenLng }}
          destination={{ lat: ride.destinoLat, lng: ride.destinoLng }}
          stops={ride.stops?.map((stop) => ({ lat: stop.lat, lng: stop.lng })) ?? []}
          driver={driverLocation}
          route={geometry}
        />

        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-3">
          <Link
            href="/passenger"
            aria-label="Volver al mapa"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_18px_rgba(11,11,11,0.16)]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          <span className="rounded-full bg-white px-3.5 py-2 text-[11px] font-black text-ink shadow-[0_6px_18px_rgba(11,11,11,0.16)]">
            {STATUS_LABELS[ride.estado] ?? ride.estado}
          </span>

          <button
            type="button"
            onClick={() => void shareRide()}
            className="rounded-full bg-ink px-3.5 py-2 text-[11px] font-black text-white shadow-[0_6px_18px_rgba(11,11,11,0.2)]"
          >
            Compartir
          </button>
        </div>
      </div>

      <main
        id="contenido"
        className="relative z-10 -mt-6 rounded-t-[1.75rem] border-t border-line bg-white px-4 pb-6 pt-4 shadow-[0_-16px_40px_rgba(11,11,11,0.12)]"
      >
        <div className="mx-auto max-w-md">
          <div className="flex items-start gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ruta-500 text-lg font-black text-ink">
              {ride.conductor?.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ride.conductor.foto} alt="" className="h-full w-full object-cover" />
              ) : (
                (ride.conductor?.nombre?.[0] ?? 'R')
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black leading-tight">{driverName}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-muted">
                <span className="text-ruta-500">★</span>
                {profile?.calificacion?.toFixed(1) ?? '—'} ·{' '}
                {profile?.cantidadViajes ?? 0} viajes
              </p>
              {profile && (
                <p className="mt-0.5 truncate text-[11px] text-muted">
                  {profile.marcaVehiculo} {profile.modeloVehiculo} · {profile.colorVehiculo} ·{' '}
                  <span className="font-bold text-ink">{profile.placaVehiculo}</span>
                </p>
              )}
            </div>

            <div className="flex gap-1.5">
              {driverPhone && (
                <>
                  <a
                    href={`tel:${driverPhone}`}
                    aria-label="Llamar al conductor"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-ruta-50 text-ruta-700"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </a>
                  <a
                    href={`sms:${driverPhone}`}
                    aria-label="Enviar mensaje al conductor"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-fog text-ink"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 5h16v11H9l-5 4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-ink px-4 py-3 text-white">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                  {ride.estado === 'TRIP_STARTED' ? 'Llegada estimada' : 'Llegada del conductor'}
                </p>
                <p className="mt-1 text-2xl font-black leading-none">
                  {etaMinutes > 0 ? `${Math.round(etaMinutes)} min` : STATUS_LABELS[ride.estado]}
                </p>
              </div>
              <p className="text-right text-[11px] leading-tight text-white/50">
                {formatDistance(ride.distancia ?? 0)}
                <br />
                {formatDuration(ride.tiempoEstimado ?? 0)}
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-ruta-500 transition-all"
                style={{ width: `${Math.max(8, progress)}%` }}
              />
            </div>
          </div>

          {ride.estado === 'CANCELLED' && (
            <p className="mt-3 rounded-xl border border-ruta-500 bg-ruta-50 p-3 text-xs font-bold text-ruta-700">
              Cancelado por {ride.canceladoPor?.toLowerCase() ?? 'el sistema'}
              {ride.motivoCancelacion ? `: ${ride.motivoCancelacion}` : ''}
            </p>
          )}

          <div className="mt-3 rounded-2xl border border-line">
            <div className="flex items-start gap-2.5 border-b border-line p-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-ruta-500" />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{ride.origenDireccion || 'Origen'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rotate-45 bg-ink" />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{ride.destinoDireccion || 'Destino'}</p>
                {ride.stops && ride.stops.length > 0 && (
                  <p className="mt-1 text-[11px] text-muted">
                    {ride.stops.length} parada(s) intermedia(s)
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl border border-line px-3 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
              {ride.metodoPago === 'EFECTIVO' ? 'Efectivo' : 'Pago móvil'}
            </span>
            <div className="text-right">
              <p className="text-lg font-black leading-none">
                {formatMoney(ride.tarifaFinal ?? 0, ride.moneda ?? 'USD')}
              </p>
              {ride.totalBs && (
                <p className="text-[11px] font-bold text-ruta-700">{formatBs(ride.totalBs)}</p>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-3">
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

            {ride.pago?.referencia && (
              <p className="text-center text-[11px] font-bold uppercase tracking-wide text-muted">
                Referencia {ride.pago.referencia}
              </p>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="btn-secondary w-full text-ruta-700"
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
